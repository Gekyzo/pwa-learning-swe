import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DUE_SHARE, NEW_SHARE, nextCard, nextCards, seenAgain, dueCount, savedCards, hiddenTopics, switchTopic, dueBars, newCount, stateCounts, topicLedger, greetingOf } from '#feed';
import { DAY } from '#learning';

const NOW = Date.UTC(2026, 9, 30, 12);
const card = (id, topic, level = 'intro', over = {}) => ({ id, topic, level, rev: 1, kind: 'concept', ...over });
const pool = (cards) => ({ cards, topics: [...new Set(cards.map((one) => one.topic))].map((id) => ({ id, title: id })) });
const record = (over = {}) => ({
  seen: 1,
  last: NOW - DAY,
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
// A random source that gives its values in turn.
const seq = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};
const pick = (cards, records, values, exclude = []) => nextCard(pool(cards), doc(records), { now: NOW, random: seq(...values), exclude });

test('the mix is a quarter due cards, then new cards, then exploration', () => {
  assert.equal(DUE_SHARE, 0.25);
  assert.equal(NEW_SHARE, 0.85);
});

test('a low draw takes the most overdue card', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git'), card('git-c', 'git')];
  const records = { 'git-a': record({ due: NOW - DAY }), 'git-b': record({ due: NOW - 3 * DAY }) };
  assert.deepEqual(pick(cards, records, [0.1]), { card: cards[1], reason: 'due' });
});

test('a low draw with no due card takes a new card', () => {
  const cards = [card('git-a', 'git')];
  assert.deepEqual(pick(cards, {}, [0.1, 0]), { card: cards[0], reason: 'new' });
});

test('a middle draw takes a new card, and the lowest level of its topic first', () => {
  const cards = [card('git-a', 'git', 'advanced'), card('git-b', 'git', 'intro'), card('git-c', 'git', 'intro')];
  assert.deepEqual(pick(cards, {}, [0.5, 0]), { card: cards[1], reason: 'new' });
});

test('a middle draw with no new card takes a due card', () => {
  const cards = [card('git-a', 'git')];
  assert.deepEqual(pick(cards, { 'git-a': record({ due: NOW }) }, [0.5]), { card: cards[0], reason: 'due' });
});

test('the topic of a new card is drawn with a weight of one plus its likes', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git'), card('http-a', 'http')];
  // git weighs 1 + 1 like, http weighs 1: a draw under 2/3 is git, over it is http.
  const records = { 'git-a': record({ liked: true }) };
  assert.equal(pick(cards, records, [0.5, 0.6]).card.id, 'git-b');
  assert.equal(pick(cards, records, [0.5, 0.7]).card.id, 'http-a');
});

test('a high draw explores the topic with the fewest seen cards', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git'), card('http-a', 'http'), card('http-b', 'http')];
  const records = { 'git-a': record(), 'http-a': record(), 'http-b': record() };
  // git has one seen card, http two, but http has no new card left: git is explored.
  assert.deepEqual(pick(cards, records, [0.9]), { card: cards[1], reason: 'explore' });
  const more = [...cards, card('db-a', 'db')];
  assert.deepEqual(pick(more, records, [0.9]), { card: more[4], reason: 'explore' });
});

test('retired, suspended and excluded cards never show', () => {
  const cards = [card('git-a', 'git', 'intro', { retired: true }), card('git-b', 'git'), card('git-c', 'git')];
  const records = { 'git-b': record({ due: NOW - DAY, suspended: true }) };
  assert.equal(pick(cards, records, [0.1, 0], ['git-c']), null);
  assert.equal(pick(cards, records, [0.1, 0]).card.id, 'git-c');
});

test('no due and no new card is the end of the feed', () => {
  const cards = [card('git-a', 'git')];
  assert.equal(pick(cards, { 'git-a': record() }, [0.1]), null);
  assert.equal(pick([], {}, [0.5]), null);
});

test('nextCards gives up to count cards, none twice', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git'), card('git-c', 'git')];
  const entries = nextCards(pool(cards), doc(), { now: NOW, random: seq(0.5, 0), exclude: ['git-a'], count: 5 });
  assert.deepEqual(entries.map((entry) => entry.card.id), ['git-b', 'git-c']);
});

test('seenAgain gives the least recently seen cards that can show', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git'), card('git-c', 'git'), card('git-d', 'git')];
  const records = {
    'git-a': record({ last: NOW - DAY }),
    'git-b': record({ last: NOW - 3 * DAY }),
    'git-c': record({ last: NOW - 5 * DAY, suspended: true }),
  };
  const entries = seenAgain(pool(cards), doc(records), { exclude: [], count: 5 });
  assert.deepEqual(entries.map((entry) => [entry.card.id, entry.reason]), [['git-b', 'again'], ['git-a', 'again']]);
  assert.deepEqual(seenAgain(pool(cards), doc(records), { exclude: ['git-b'], count: 1 }).map((entry) => entry.card.id), ['git-a']);
});

test('dueCount counts the due cards that can show', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git'), card('git-c', 'git', 'intro', { retired: true })];
  const records = {
    'git-a': record({ due: NOW }),
    'git-b': record({ due: NOW, suspended: true }),
    'git-c': record({ due: NOW }),
    'gone-x': record({ due: NOW }),
  };
  assert.equal(dueCount(pool(cards), doc(records), NOW), 1);
});

test('savedCards gives the saved cards, the last saved first, retired ones too', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git', 'intro', { retired: true }), card('git-c', 'git')];
  const records = {
    'git-a': record({ saved: true, savedAt: NOW - DAY }),
    'git-b': record({ saved: true, savedAt: NOW }),
    'git-c': record(),
    'gone-x': record({ saved: true, savedAt: NOW }),
  };
  assert.deepEqual(savedCards(pool(cards), doc(records)).map((one) => one.id), ['git-b', 'git-a']);
});

const TOPICS = [{ id: 'git', title: 'Git' }, { id: 'http', title: 'HTTP' }, { id: 'testing', title: 'Testing' }];

test('a card of a topic that is off never shows, and is not in the due count', () => {
  const cards = [card('git-a', 'git'), card('http-a', 'http')];
  const records = { 'git-a': record({ due: NOW - DAY }) };
  const options = { now: NOW, random: seq(0.1, 0.5, 0.9), off: ['git'] };
  assert.deepEqual(nextCards(pool(cards), doc(records), { ...options, count: 5 }).map((entry) => entry.card.id), ['http-a']);
  assert.equal(dueCount(pool(cards), doc(records), NOW, ['git']), 0);
  assert.equal(dueCount(pool(cards), doc(records), NOW), 1);
  assert.deepEqual(seenAgain(pool(cards), doc(records), { count: 5, off: ['git'] }), []);
});

test('savedCards keeps the saved cards of a topic that is off', () => {
  const cards = [card('git-a', 'git')];
  const records = { 'git-a': record({ saved: true, savedAt: NOW }) };
  assert.deepEqual(savedCards(pool(cards), doc(records)), cards);
});

test('hiddenTopics gives the ids that are off, and none when they cover every topic', () => {
  assert.deepEqual(hiddenTopics(TOPICS, ['http']), ['http']);
  assert.deepEqual(hiddenTopics(TOPICS, ['gone']), ['gone']);
  assert.deepEqual(hiddenTopics(TOPICS, ['git', 'http', 'testing']), []);
  assert.deepEqual(hiddenTopics(TOPICS, ['testing', 'git', 'http', 'gone']), []);
});

test('switchTopic turns a topic off and on again', () => {
  assert.deepEqual(switchTopic(TOPICS, [], 'http', false), ['http']);
  assert.deepEqual(switchTopic(TOPICS, ['http', 'git'], 'http', true), ['git']);
});

test('switchTopic keeps the ids of no pack, so a pack that comes back stays off', () => {
  assert.deepEqual(switchTopic(TOPICS, ['gone'], 'git', false), ['gone', 'git']);
});

test('switchTopic does not turn off the last topic that is on', () => {
  assert.deepEqual(switchTopic(TOPICS, ['git', 'http'], 'testing', false), ['git', 'http']);
});

test('switchTopic of an unknown id changes nothing', () => {
  assert.deepEqual(switchTopic(TOPICS, ['git'], 'nope', false), ['git']);
});

test('counts of an empty doc are zero', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git'), card('http-a', 'http')];
  const input = [pool(cards), doc(), NOW];
  assert.deepEqual(dueBars(...input), [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(newCount(pool(cards), doc()), 3);
  assert.deepEqual(stateCounts(pool(cards), doc()), { learning: 0, known: 0, mastered: 0 });
  assert.deepEqual(topicLedger(...input), [
    { id: 'git', title: 'git', seen: 0, due: 0, fresh: 2 },
    { id: 'http', title: 'http', seen: 0, due: 0, fresh: 1 },
  ]);
});

test('dueBars puts a record in the window that holds its due time', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((one) => `git-${one}`);
  const cards = ids.map((id) => card(id, 'git'));
  const dues = [NOW - DAY, NOW, NOW + 1, NOW + DAY, NOW + DAY + 1, NOW + 8 * DAY, NOW + 6 * DAY];
  const records = Object.fromEntries(ids.map((id, index) => [id, record({ due: dues[index] })]));
  assert.deepEqual(dueBars(pool(cards), doc(records), NOW), [2, 2, 1, 0, 0, 0, 1]);
  assert.equal(dueBars(pool(cards), doc(records), NOW, [], 3).length, 3);
});

test('counts leave out suspended, retired and off-topic cards', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git'), card('git-c', 'git', 'intro', { retired: true }), card('http-a', 'http')];
  const records = {
    'git-a': record({ due: NOW, suspended: true }),
    'git-c': record({ due: NOW }),
    'http-a': record({ due: NOW }),
  };
  const off = ['http'];
  assert.deepEqual(dueBars(pool(cards), doc(records), NOW, off), [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(newCount(pool(cards), doc(records), off), 1);
  assert.deepEqual(stateCounts(pool(cards), doc(records), off), { learning: 0, known: 0, mastered: 0 });
  assert.deepEqual(topicLedger(pool(cards), doc(records), NOW, off), [{ id: 'git', title: 'git', seen: 0, due: 0, fresh: 1 }]);
});

test('stateCounts groups the boxes', () => {
  const cards = [0, 1, 2, 3, 4].map((box) => card(`git-${box}`, 'git'));
  const records = Object.fromEntries(cards.map(({ id }, box) => [id, record({ box })]));
  assert.deepEqual(stateCounts(pool(cards), doc(records)), { learning: 2, known: 2, mastered: 1 });
});

test('the ledger sums to the totals', () => {
  const cards = [card('git-a', 'git'), card('git-b', 'git'), card('http-a', 'http'), card('http-b', 'http'), card('http-c', 'http')];
  const records = {
    'git-a': record({ due: NOW - DAY, box: 0 }),
    'http-a': record({ due: NOW, box: 3 }),
    'http-b': record({ due: NOW + 2 * DAY, box: 4 }),
  };
  const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
  const rows = topicLedger(pool(cards), doc(records), NOW);
  const states = stateCounts(pool(cards), doc(records));
  assert.equal(sum(rows, 'due'), dueBars(pool(cards), doc(records), NOW)[0]);
  assert.equal(sum(rows, 'fresh'), newCount(pool(cards), doc(records)));
  assert.equal(sum(rows, 'seen'), states.learning + states.known + states.mastered);
});

test('greetingOf splits the day at 6, 14 and 21', () => {
  const bands = [[5, 'evening'], [6, 'morning'], [13, 'morning'], [14, 'afternoon'], [20, 'afternoon'], [21, 'evening'], [0, 'evening']];
  bands.forEach(([hour, band]) => assert.equal(greetingOf(hour), band));
});
