import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_SLUG } from '#config';
import {
  FEED_KEY,
  DAY,
  INTERVALS,
  emptyLearning,
  normalizeLearning,
  markSeen,
  grade,
  answerQuiz,
  signal,
  toggleLike,
  toggleSaved,
  stateOf,
  isDue,
  isUpdated,
} from '#learning';

const NOW = Date.UTC(2026, 9, 30, 12);
const card = { id: 'git-a', rev: 1, kind: 'concept', topic: 'git' };
const quiz = { id: 'git-q', rev: 1, kind: 'quiz', options: ['a', 'b'], answer: 1, topic: 'git' };
const record = (over = {}) => ({
  seen: 1,
  last: NOW,
  box: 0,
  due: NOW + DAY,
  rev: 1,
  saved: false,
  savedAt: null,
  liked: false,
  suspended: false,
  flag: null,
  ...over,
});
const doc = (records = {}) => ({ version: 1, records });
const frozen = (value) => JSON.parse(JSON.stringify(value));

test('the key of the learning doc has the slug', () => {
  assert.equal(FEED_KEY, `${APP_SLUG}.feed`);
});

test('the boxes wait 1, 3, 7, 16 and 35 days', () => {
  assert.deepEqual(INTERVALS, [1, 3, 7, 16, 35]);
});

test('a first sight makes a record in box 0, due in one day, and the input is unchanged', () => {
  const input = emptyLearning();
  const { state } = markSeen(input, card, NOW);
  assert.deepEqual(state.records['git-a'], record());
  assert.deepEqual(input, emptyLearning());
});

test('a later sight counts, takes the rev of the card and keeps the box', () => {
  const input = doc({ 'git-a': record({ box: 2, due: NOW + 5 * DAY }) });
  const { state } = markSeen(input, { ...card, rev: 2 }, NOW + DAY);
  assert.deepEqual(state.records['git-a'], record({ seen: 2, last: NOW + DAY, box: 2, due: NOW + 5 * DAY, rev: 2 }));
});

test('a due card seen with no grade comes back one day later', () => {
  const { state } = markSeen(doc({ 'git-a': record({ box: 2, due: NOW - DAY }) }), card, NOW);
  assert.equal(state.records['git-a'].due, NOW + DAY);
  assert.equal(state.records['git-a'].box, 2);
});

test('a remembered card moves up one box and waits its interval', () => {
  const input = doc({ 'git-a': record({ box: 1 }) });
  const before = frozen(input);
  const { state } = grade(input, card, true, NOW);
  assert.deepEqual([state.records['git-a'].box, state.records['git-a'].due], [2, NOW + 7 * DAY]);
  assert.deepEqual(input, before);
});

test('the top box stays the top box', () => {
  const { state } = grade(doc({ 'git-a': record({ box: 4 }) }), card, true, NOW);
  assert.deepEqual([state.records['git-a'].box, state.records['git-a'].due], [4, NOW + 35 * DAY]);
});

test('a forgotten card goes back to box 0', () => {
  const { state } = grade(doc({ 'git-a': record({ box: 3 }) }), card, false, NOW);
  assert.deepEqual([state.records['git-a'].box, state.records['git-a'].due], [0, NOW + DAY]);
});

test('a grade of a card with no record makes one first', () => {
  const { state } = grade(emptyLearning(), card, true, NOW);
  assert.deepEqual(state.records['git-a'], record({ box: 1, due: NOW + 3 * DAY }));
});

test('a right answer is a remembered grade, a wrong one a forgotten grade', () => {
  const input = doc({ 'git-q': record({ box: 2 }) });
  const right = answerQuiz(input, quiz, 1, NOW);
  assert.equal(right.correct, true);
  assert.equal(right.state.records['git-q'].box, 3);
  const wrong = answerQuiz(input, quiz, 0, NOW);
  assert.equal(wrong.correct, false);
  assert.equal(wrong.state.records['git-q'].box, 0);
});

test('I knew this puts a card in box 2 at least', () => {
  const low = signal(doc({ 'git-a': record({ box: 0, flag: 'hard' }) }), card, 'knew', NOW).state.records['git-a'];
  assert.deepEqual([low.box, low.due, low.flag], [2, NOW + 7 * DAY, null]);
  const high = signal(doc({ 'git-a': record({ box: 3 }) }), card, 'knew', NOW).state.records['git-a'];
  assert.deepEqual([high.box, high.due], [3, NOW + 16 * DAY]);
});

test('too hard puts a card in box 0 with the hard flag', () => {
  const next = signal(doc({ 'git-a': record({ box: 3 }) }), card, 'hard', NOW).state.records['git-a'];
  assert.deepEqual([next.box, next.due, next.flag], [0, NOW + DAY, 'hard']);
});

test('not interested and wrong or outdated suspend the card with their flag', () => {
  for (const kind of ['skip', 'report']) {
    const next = signal(doc({ 'git-a': record() }), card, kind, NOW).state.records['git-a'];
    assert.deepEqual([next.suspended, next.flag], [true, kind]);
  }
});

test('an unknown signal changes nothing', () => {
  const input = doc({ 'git-a': record() });
  assert.equal(signal(input, card, 'love', NOW).state, input);
});

test('like and save switch on and off; a save keeps its time', () => {
  const input = doc({ 'git-a': record() });
  const liked = toggleLike(input, card, NOW).state;
  assert.equal(liked.records['git-a'].liked, true);
  assert.equal(toggleLike(liked, card, NOW).state.records['git-a'].liked, false);
  const saved = toggleSaved(input, card, NOW + 5).state;
  assert.deepEqual([saved.records['git-a'].saved, saved.records['git-a'].savedAt], [true, NOW + 5]);
  const unsaved = toggleSaved(saved, card, NOW + 9).state;
  assert.deepEqual([unsaved.records['git-a'].saved, unsaved.records['git-a'].savedAt], [false, null]);
});

test('the learning state comes from the record', () => {
  assert.equal(stateOf(undefined), 'new');
  assert.equal(stateOf(record({ box: 0 })), 'learning');
  assert.equal(stateOf(record({ box: 1 })), 'learning');
  assert.equal(stateOf(record({ box: 2 })), 'known');
  assert.equal(stateOf(record({ box: 3 })), 'known');
  assert.equal(stateOf(record({ box: 4 })), 'mastered');
  assert.equal(stateOf(record({ box: 4, suspended: true })), 'suspended');
});

test('a card is due from its due time, unless it is suspended', () => {
  assert.equal(isDue(record({ due: NOW }), NOW), true);
  assert.equal(isDue(record({ due: NOW + 1 }), NOW), false);
  assert.equal(isDue(record({ due: NOW, suspended: true }), NOW), false);
  assert.equal(isDue(undefined, NOW), false);
});

test('a card is updated when its rev is past the rev of its record', () => {
  assert.equal(isUpdated(record({ rev: 1 }), { ...card, rev: 2 }), true);
  assert.equal(isUpdated(record({ rev: 2 }), { ...card, rev: 2 }), false);
  assert.equal(isUpdated(undefined, card), false);
});

test('a valid doc is kept, with unknown fields dropped', () => {
  const input = doc({ 'git-a': { ...record({ saved: true, savedAt: NOW }), extra: 1 }, 'gone-x': record() });
  assert.deepEqual(normalizeLearning(input), doc({ 'git-a': record({ saved: true, savedAt: NOW }), 'gone-x': record() }));
});

test('a doc that is not a version 1 learning doc is null', () => {
  for (const bad of [null, [], 'x', { version: 2, records: {} }, { version: 1, records: [] }, { version: 1 }]) {
    assert.equal(normalizeLearning(bad), null, JSON.stringify(bad));
  }
});

test('a doc with a bad record is null', () => {
  for (const bad of [
    { seen: 0 },
    { box: 5 },
    { box: -1 },
    { due: 'soon' },
    { rev: 0 },
    { saved: 'yes' },
    { savedAt: 'x' },
    { liked: 1 },
    { suspended: null },
    { flag: 'love' },
    { last: -1 },
  ]) {
    assert.equal(normalizeLearning(doc({ 'git-a': record(bad) })), null, JSON.stringify(bad));
  }
  assert.equal(normalizeLearning(doc({ 'git-a': null })), null);
});
