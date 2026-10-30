import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, LEVELS, MEDIA, MAX_TITLE, normalizeCard, normalizePack, buildPool } from '#cards';

const concept = (over = {}) => ({ id: 'git-a', kind: 'concept', level: 'intro', title: 'Title', body: 'Body.', ...over });
const quiz = (over = {}) => concept({ id: 'git-q', kind: 'quiz', options: ['Yes', 'No'], answer: 1, ...over });
const resource = (over = {}) =>
  concept({ id: 'git-r', kind: 'resource', url: 'https://git-scm.com/book', media: 'book', minutes: 30, ...over });
const pack = (cards, over = {}) => ({ id: 'git', version: 1, title: 'Git', cards, ...over });

test('the kinds, levels and media are fixed', () => {
  assert.deepEqual(KINDS, ['concept', 'snippet', 'pitfall', 'quiz', 'resource']);
  assert.deepEqual(LEVELS, ['intro', 'intermediate', 'advanced']);
  assert.deepEqual(MEDIA, ['article', 'docs', 'video', 'course', 'book', 'repo']);
});

test('a concept card is trimmed, gets rev 1 and loses unknown fields', () => {
  const input = concept({ title: '  Title ', body: ' Body. ', extra: 1, code: 'x' });
  assert.deepEqual(normalizeCard(input, 'git'), {
    id: 'git-a',
    rev: 1,
    kind: 'concept',
    level: 'intro',
    title: 'Title',
    body: 'Body.',
  });
  assert.equal(input.title, '  Title ');
});

test('a card keeps its rev and its retired flag', () => {
  const card = normalizeCard(concept({ rev: 3, retired: true }), 'git');
  assert.equal(card.rev, 3);
  assert.equal(card.retired, true);
  assert.equal('retired' in normalizeCard(concept({ retired: 'yes' }), 'git'), false);
});

test('a card with a bad id, kind, level, title or body is null', () => {
  for (const bad of [
    { id: 'http-a' },
    { id: 'git-A b' },
    { id: 42 },
    { kind: 'poem' },
    { level: 'expert' },
    { title: '  ' },
    { title: 'x'.repeat(MAX_TITLE + 1) },
    { body: '' },
    { rev: 0 },
    { rev: 1.5 },
  ]) {
    assert.equal(normalizeCard(concept(bad), 'git'), null, JSON.stringify(bad));
  }
  assert.equal(normalizeCard(null, 'git'), null);
});

test('a snippet needs its code, kept as written', () => {
  const code = 'git log --oneline\n  --graph';
  assert.equal(normalizeCard(concept({ kind: 'snippet', code }), 'git').code, code);
  assert.equal(normalizeCard(concept({ kind: 'snippet' }), 'git'), null);
  assert.equal(normalizeCard(concept({ kind: 'snippet', code: '  ' }), 'git'), null);
});

test('a quiz needs two to four options and the index of the answer', () => {
  const card = normalizeCard(quiz({ options: [' Yes ', 'No'] }), 'git');
  assert.deepEqual([card.options, card.answer], [['Yes', 'No'], 1]);
  for (const bad of [{ options: ['Only'] }, { options: ['a', 'b', 'c', 'd', 'e'] }, { options: ['a', ''] }, { answer: 2 }, { answer: -1 }, { answer: '0' }]) {
    assert.equal(normalizeCard(quiz(bad), 'git'), null, JSON.stringify(bad));
  }
});

test('a resource needs an https URL, a medium and a time in minutes', () => {
  const card = normalizeCard(resource(), 'git');
  assert.deepEqual([card.url, card.media, card.minutes], ['https://git-scm.com/book', 'book', 30]);
  for (const bad of [{ url: 'http://git-scm.com' }, { url: 'not a url' }, { media: 'tweet' }, { minutes: 0 }, { minutes: 2.5 }]) {
    assert.equal(normalizeCard(resource(bad), 'git'), null, JSON.stringify(bad));
  }
});

test('a pack keeps its valid cards and names the dropped ones', () => {
  const { pack: clean, dropped } = normalizePack(pack([concept(), concept({ id: 'git-b', kind: 'poem' }), 'x']));
  assert.deepEqual(clean.cards.map((card) => card.id), ['git-a']);
  assert.deepEqual(dropped, ['git-b', '#2']);
  assert.deepEqual([clean.id, clean.version, clean.title], ['git', 1, 'Git']);
});

test('a card id that is twice in a pack is dropped the second time', () => {
  const { pack: clean, dropped } = normalizePack(pack([concept(), concept({ title: 'Other' })]));
  assert.equal(clean.cards.length, 1);
  assert.equal(clean.cards[0].title, 'Title');
  assert.deepEqual(dropped, ['git-a']);
});

test('a pack with a bad id, version, title or cards is null', () => {
  for (const bad of [{ id: 'Git' }, { version: 0 }, { title: '' }, { cards: {} }]) {
    assert.equal(normalizePack(pack([concept()], bad)).pack, null, JSON.stringify(bad));
  }
  assert.equal(normalizePack(null).pack, null);
});

test('the pool has each card of each pack with its topic, and the topics in pack order', () => {
  const http = { id: 'http', version: 2, title: 'HTTP', cards: [{ ...normalizeCard(concept({ id: 'http-a' }), 'http') }] };
  const git = normalizePack(pack([concept(), quiz()])).pack;
  const pool = buildPool([git, http]);
  assert.deepEqual(pool.cards.map((card) => [card.id, card.topic]), [['git-a', 'git'], ['git-q', 'git'], ['http-a', 'http']]);
  assert.deepEqual(pool.topics, [{ id: 'git', title: 'Git' }, { id: 'http', title: 'HTTP' }]);
});

test('a pack id that is twice keeps the first pack', () => {
  const one = normalizePack(pack([concept()])).pack;
  const two = normalizePack(pack([concept({ id: 'git-b' })], { title: 'Again' })).pack;
  const pool = buildPool([one, two]);
  assert.deepEqual(pool.cards.map((card) => card.id), ['git-a']);
  assert.deepEqual(pool.topics, [{ id: 'git', title: 'Git' }]);
});
