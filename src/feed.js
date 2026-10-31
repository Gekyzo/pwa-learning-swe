import { LEVELS } from '#cards';
import { DAY, isDue, stateOf } from '#learning';

// The order of the feed (FEED-1 to FEED-5) and the topics that are off (FEED-14). The random source is a parameter, so a test can fix it.
// A draw below DUE_SHARE takes a due card, below NEW_SHARE a new card, and else it explores.
export const DUE_SHARE = 0.25;
export const NEW_SHARE = 0.85;

// The cards that may show: not retired, not suspended, not of a topic that is off, not in the feed yet.
const eligible = (pool, state, exclude, off = []) =>
  pool.cards.filter(
    (card) => !card.retired && !state.records[card.id]?.suspended && !off.includes(card.topic) && !exclude.includes(card.id),
  );

// The first card of the lowest level, in pack order.
const easiest = (cards) => cards.reduce((best, card) => (LEVELS.indexOf(card.level) < LEVELS.indexOf(best.level) ? card : best));

const topicsOf = (cards) => [...new Set(cards.map((card) => card.topic))];

const pickDue = ({ due }) => (due.length ? { card: due[0], reason: 'due' } : null);

// A topic of the new cards, drawn with the weight 1 + the likes of the topic.
const pickNew = ({ fresh, pool, state, random }) => {
  if (!fresh.length) return null;
  const topics = topicsOf(fresh);
  const weights = topics.map((topic) => 1 + pool.cards.filter((card) => card.topic === topic && state.records[card.id]?.liked).length);
  let draw = random() * weights.reduce((sum, weight) => sum + weight, 0);
  const index = weights.findIndex((weight) => (draw -= weight) < 0);
  const topic = topics[index < 0 ? topics.length - 1 : index];
  return { card: easiest(fresh.filter((card) => card.topic === topic)), reason: 'new' };
};

// The topic of the new cards with the fewest seen cards; the first one in pack order on a tie.
const pickExplore = ({ fresh, pool, state }) => {
  if (!fresh.length) return null;
  const seen = (topic) => pool.cards.filter((card) => card.topic === topic && state.records[card.id]).length;
  const topic = topicsOf(fresh).reduce((best, topic) => (seen(topic) < seen(best) ? topic : best));
  return { card: easiest(fresh.filter((card) => card.topic === topic)), reason: 'explore' };
};

// { card, reason } for the next card of the feed, or null at its end (FEED-1 to FEED-3).
export const nextCard = (pool, state, { now, random, exclude = [], off = [] }) => {
  const cards = eligible(pool, state, exclude, off);
  const due = cards
    .filter((card) => isDue(state.records[card.id], now))
    .sort((a, b) => state.records[a.id].due - state.records[b.id].due);
  const fresh = cards.filter((card) => !state.records[card.id]);
  const context = { due, fresh, pool, state, random };
  const draw = random();
  if (draw < DUE_SHARE) return pickDue(context) ?? pickNew(context);
  if (draw < NEW_SHARE) return pickNew(context) ?? pickDue(context);
  return pickExplore(context) ?? pickDue(context);
};

export const nextCards = (pool, state, { now, random, exclude = [], off = [], count }) => {
  const entries = [];
  while (entries.length < count) {
    const entry = nextCard(pool, state, { now, random, off, exclude: [...exclude, ...entries.map(({ card }) => card.id)] });
    if (!entry) break;
    entries.push(entry);
  }
  return entries;
};

// The seen cards that may show, the least recently seen first (FEED-4).
export const seenAgain = (pool, state, { exclude = [], off = [], count }) =>
  eligible(pool, state, exclude, off)
    .filter((card) => state.records[card.id])
    .sort((a, b) => state.records[a.id].last - state.records[b.id].last)
    .slice(0, count)
    .map((card) => ({ card, reason: 'again' }));

export const dueCount = (pool, state, now, off = []) => eligible(pool, state, [], off).filter((card) => isDue(state.records[card.id], now)).length;

// The cards that fall due in each of the next `days` windows of 24 hours: bar 0 is the cards due now (FEED-16).
export const dueBars = (pool, state, now, off = [], days = 7) => {
  const bars = Array.from({ length: days }, () => 0);
  for (const card of eligible(pool, state, [], off)) {
    const record = state.records[card.id];
    if (!record) continue;
    const bar = isDue(record, now) ? 0 : Math.ceil((record.due - now) / DAY);
    if (bar < days) bars[bar] += 1;
  }
  return bars;
};

// The cards that may show and have no record (FEED-17).
export const newCount = (pool, state, off = []) => eligible(pool, state, [], off).filter((card) => !state.records[card.id]).length;

// The seen cards that may show, by state: learning, known and mastered (FEED-17).
export const stateCounts = (pool, state, off = []) => {
  const counts = { learning: 0, known: 0, mastered: 0 };
  for (const card of eligible(pool, state, [], off)) {
    const name = stateOf(state.records[card.id]);
    if (name in counts) counts[name] += 1;
  }
  return counts;
};

// One row for each topic that is on, in pack order: its seen, due and new cards that may show (FEED-17).
export const topicLedger = (pool, state, now, off = []) => {
  const cards = eligible(pool, state, [], off);
  return pool.topics
    .filter(({ id }) => !off.includes(id))
    .map(({ id, title }) => {
      const own = cards.filter((card) => card.topic === id);
      return {
        id,
        title,
        seen: own.filter((card) => state.records[card.id]).length,
        due: own.filter((card) => isDue(state.records[card.id], now)).length,
        fresh: own.filter((card) => !state.records[card.id]).length,
      };
    });
};

// The saved cards of the pool, the last saved first. A retired card stays (FEED-5).
export const savedCards = (pool, state) =>
  pool.cards.filter((card) => state.records[card.id]?.saved).sort((a, b) => state.records[b.id].savedAt - state.records[a.id].savedAt);

// The topics that are off. A list that covers every topic of the packs counts as none, so the
// feed is never empty by choice (FEED-14).
export const hiddenTopics = (topics, off) => (topics.every(({ id }) => off.includes(id)) ? [] : off);

// The topics that are off after a switch of `id`. The last topic that is on stays on, and the ids
// of no pack stay in the list.
export const switchTopic = (topics, off, id, on) => {
  if (!topics.some((topic) => topic.id === id)) return off;
  if (on) return off.filter((one) => one !== id);
  if (off.includes(id)) return off;
  const next = [...off, id];
  return hiddenTopics(topics, next).length ? next : off;
};

// The part of the day for the greeting: morning [6, 14), afternoon [14, 21), else evening.
export const greetingOf = (hour) => (hour >= 6 && hour < 14 ? 'morning' : hour >= 14 && hour < 21 ? 'afternoon' : 'evening');

// The tag of a card by the reason it came: 'review', 'new' or null (FEED-9).
export const tagOf = (reason) => (reason === 'due' ? 'review' : reason === 'new' || reason === 'explore' ? 'new' : null);
