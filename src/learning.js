import { APP_SLUG } from '#config';

// The learning state of each card that the user saw: one record by card id (LRN-1 to LRN-8).
export const FEED_KEY = `${APP_SLUG}.feed`;
export const DAY = 24 * 60 * 60 * 1000;
// The wait of each review box, in days.
export const INTERVALS = [1, 3, 7, 16, 35];
const TOP = INTERVALS.length - 1;
const FLAGS = ['hard', 'skip', 'report'];

export const emptyLearning = () => ({ version: 1, records: {} });

const fresh = (card, now) => ({
  seen: 1,
  last: now,
  box: 0,
  due: now + DAY,
  rev: card.rev,
  saved: false,
  savedAt: null,
  liked: false,
  suspended: false,
  flag: null,
});

// The doc with the record of `card` changed by `change(record)`; a card with no record gets one.
const update = (state, card, now, change) => {
  const record = state.records[card.id] ?? fresh(card, now);
  return { state: { ...state, records: { ...state.records, [card.id]: change(record) } } };
};

const inBox = (record, box, now) => ({ ...record, box, due: now + INTERVALS[box] * DAY, last: now });

export const markSeen = (state, card, now) => {
  if (!state.records[card.id]) return update(state, card, now, (record) => record);
  return update(state, card, now, (record) => ({
    ...record,
    seen: record.seen + 1,
    last: now,
    rev: card.rev,
    due: record.due <= now ? now + DAY : record.due,
  }));
};

export const grade = (state, card, remembered, now) =>
  update(state, card, now, (record) => inBox(record, remembered ? Math.min(record.box + 1, TOP) : 0, now));

export const answerQuiz = (state, card, choice, now) => {
  const correct = choice === card.answer;
  return { ...grade(state, card, correct, now), correct };
};

const SIGNALS = {
  knew: (record, now) => ({ ...inBox(record, Math.max(record.box, 2), now), flag: null }),
  hard: (record, now) => ({ ...inBox(record, 0, now), flag: 'hard' }),
  skip: (record) => ({ ...record, suspended: true, flag: 'skip' }),
  report: (record) => ({ ...record, suspended: true, flag: 'report' }),
};

// I knew this, too hard, not interested or wrong or outdated (LRN-5). Any other kind changes nothing.
export const signal = (state, card, kind, now) => {
  const change = SIGNALS[kind];
  return change ? update(state, card, now, (record) => change(record, now)) : { state };
};

export const toggleLike = (state, card, now) => update(state, card, now, (record) => ({ ...record, liked: !record.liked }));

export const toggleSaved = (state, card, now) =>
  update(state, card, now, (record) => ({ ...record, saved: !record.saved, savedAt: record.saved ? null : now }));

export const stateOf = (record) => {
  if (!record) return 'new';
  if (record.suspended) return 'suspended';
  if (record.box <= 1) return 'learning';
  return record.box <= 3 ? 'known' : 'mastered';
};

export const isDue = (record, now) => Boolean(record) && !record.suspended && record.due <= now;

export const isUpdated = (record, card) => Boolean(record) && record.rev < card.rev;

const isTime = (value) => Number.isFinite(value) && value >= 0;
const isCount = (value, min) => Number.isInteger(value) && value >= min;

const validRecord = (record) =>
  typeof record === 'object' &&
  record !== null &&
  isCount(record.seen, 1) &&
  isTime(record.last) &&
  isCount(record.box, 0) &&
  record.box <= TOP &&
  isTime(record.due) &&
  isCount(record.rev, 1) &&
  typeof record.saved === 'boolean' &&
  (record.savedAt === null || isTime(record.savedAt)) &&
  typeof record.liked === 'boolean' &&
  typeof record.suspended === 'boolean' &&
  (record.flag === null || FLAGS.includes(record.flag));

const cleanRecord = ({ seen, last, box, due, rev, saved, savedAt, liked, suspended, flag }) => ({
  seen,
  last,
  box,
  due,
  rev,
  saved,
  savedAt,
  liked,
  suspended,
  flag,
});

// A clean version 1 doc, or null. A record of a card that no pack has stays (LRN-8). Add a
// migration here when the version goes up.
export const normalizeLearning = (data) => {
  if (typeof data !== 'object' || data === null || data.version !== 1) return null;
  const { records } = data;
  if (typeof records !== 'object' || records === null || Array.isArray(records)) return null;
  const entries = Object.entries(records);
  if (!entries.every(([, record]) => validRecord(record))) return null;
  return { version: 1, records: Object.fromEntries(entries.map(([id, record]) => [id, cleanRecord(record)])) };
};
