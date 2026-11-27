import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, LEVELS, MEDIA, MAX_TITLE, MAX_BODY, MAX_BODY_SOURCE, MAX_ALT, SOURCE_LANG, normalizeCard, normalizePack, buildPool, normalizePaths } from '#cards';
import { plainText } from '#richtext';

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

// A body with `runs` marked runs of `run` characters after a plain prefix of `prefix` characters.
const marked = (prefix, runs, run, marker = '*') =>
  ['p'.repeat(prefix), ...Array.from({ length: runs }, () => `${marker}${'a'.repeat(run)}${marker}`)].join(' ');

test('the body limit counts the visible text, with a cap on the raw text', () => {
  assert.equal(MAX_BODY, 600);
  assert.equal(MAX_BODY_SOURCE, 800);
  const fits = marked(65, 25, 20);
  assert.deepEqual([plainText(fits).length, fits.length], [590, 640]);
  assert.equal(normalizeCard(concept({ body: fits }), 'git').body, fits);
  const es = normalizeCard(concept({ translations: { es: { title: 'Título', body: fits } } }), 'git');
  assert.equal(es.translations.es.body, fits);

  const long = marked(76, 25, 20);
  assert.equal(plainText(long).length, 601);
  assert.equal(normalizeCard(concept({ body: long }), 'git'), null);
  assert.equal(normalizeCard(concept({ translations: { es: { title: 'T', body: long } } }), 'git').translations, undefined);

  const raw = marked(201, 100, 1, '**');
  assert.deepEqual([plainText(raw).length < MAX_BODY, raw.length], [true, 801]);
  assert.equal(normalizeCard(concept({ body: raw }), 'git'), null);
  assert.equal(normalizeCard(concept({ body: raw.slice(1) }), 'git').body, raw.slice(1));
});

test('a body made only of markers is kept as text, a blank one is null', () => {
  assert.equal(normalizeCard(concept({ body: '****' }), 'git').body, '****');
  assert.equal(normalizeCard(concept({ body: '\n\n' }), 'git'), null);
  assert.equal(normalizeCard(concept({ body: 'x'.repeat(MAX_BODY) }), 'git').body.length, MAX_BODY);
  assert.equal(normalizeCard(concept({ body: 'x'.repeat(MAX_BODY + 1) }), 'git'), null);
});

test('a snippet needs its code, kept as written', () => {
  const code = 'git log --oneline\n  --graph';
  assert.equal(normalizeCard(concept({ kind: 'snippet', code }), 'git').code, code);
  assert.equal(normalizeCard(concept({ kind: 'snippet' }), 'git'), null);
  assert.equal(normalizeCard(concept({ kind: 'snippet', code: '  ' }), 'git'), null);
});

test('a snippet keeps a known syntax and drops an unknown one', () => {
  const snippet = (syntax) => normalizeCard(concept({ kind: 'snippet', code: 'git log', syntax }), 'git');
  assert.equal(snippet('sh').syntax, 'sh');
  assert.equal('syntax' in snippet('cobol'), false);
  assert.equal('syntax' in snippet(undefined), false);
  assert.equal('syntax' in normalizeCard(concept({ syntax: 'sh' }), 'git'), false);
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
  assert.deepEqual(pool.topics, [{ id: 'git', title: 'Git', lang: 'en' }, { id: 'http', title: 'HTTP', lang: 'en' }]);
  assert.ok(pool.cards.every((card) => card.lang === 'en'));
});

test('a pack id that is twice keeps the first pack', () => {
  const one = normalizePack(pack([concept()])).pack;
  const two = normalizePack(pack([concept({ id: 'git-b' })], { title: 'Again' })).pack;
  const pool = buildPool([one, two]);
  assert.deepEqual(pool.cards.map((card) => card.id), ['git-a']);
  assert.deepEqual(pool.topics, [{ id: 'git', title: 'Git', lang: 'en' }]);
});

test('the text of the cards is English', () => {
  assert.equal(SOURCE_LANG, 'en');
});

test('a card keeps its valid translations, trimmed, and drops the others (CARD-7)', () => {
  const card = normalizeCard(
    concept({
      translations: {
        es: { title: ' Título ', body: 'Cuerpo.', extra: 1 },
        fr: { title: 'Titre' },
        EN: { title: 'T', body: 'B' },
        de: 'Titel',
      },
    }),
    'git',
  );
  assert.deepEqual(card.translations, { es: { title: 'Título', body: 'Cuerpo.' } });
  assert.equal('translations' in normalizeCard(concept({ translations: { fr: {} } }), 'git'), false);
  assert.equal('translations' in normalizeCard(concept({ translations: 'es' }), 'git'), false);
});

test('a quiz translation has as many options as the quiz (CARD-7)', () => {
  const good = normalizeCard(quiz({ translations: { es: { title: 'T', body: 'B', options: ['Sí ', 'No'] } } }), 'git');
  assert.deepEqual(good.translations.es.options, ['Sí', 'No']);
  const short = normalizeCard(quiz({ translations: { es: { title: 'T', body: 'B', options: ['Sí'] } } }), 'git');
  assert.equal('translations' in short, false);
  const none = normalizeCard(quiz({ translations: { es: { title: 'T', body: 'B' } } }), 'git');
  assert.equal('translations' in none, false);
  const extra = normalizeCard(concept({ translations: { es: { title: 'T', body: 'B', options: ['a', 'b'] } } }), 'git');
  assert.deepEqual(extra.translations.es, { title: 'T', body: 'B' });
});

test('a pack keeps the valid translations of its title (CARD-7)', () => {
  const { pack: one } = normalizePack(pack([concept()], { translations: { es: { title: ' Git ' }, fr: { title: '' } } }));
  assert.deepEqual(one.translations, { es: { title: 'Git' } });
  assert.equal('translations' in normalizePack(pack([concept()])).pack, false);
});

test('the pool takes the text of a language and keeps English where a card has no translation (CARD-7)', () => {
  const git = normalizePack(
    pack(
      [
        concept({ translations: { es: { title: 'Título', body: 'Cuerpo.' } } }),
        quiz({ translations: { es: { title: '¿Sí?', body: 'Porque.', options: ['Sí', 'No'] } } }),
        concept({ id: 'git-b' }),
      ],
      { title: 'Git', translations: { es: { title: 'Git en español' } } },
    ),
  ).pack;
  const pool = buildPool([git], 'es');
  const [a, q, b] = pool.cards;
  assert.deepEqual([a.title, a.body, a.lang], ['Título', 'Cuerpo.', 'es']);
  assert.deepEqual([q.title, q.options, q.answer, q.lang], ['¿Sí?', ['Sí', 'No'], 1, 'es']);
  assert.deepEqual([b.title, b.lang], ['Title', 'en']);
  assert.ok(pool.cards.every((card) => !('translations' in card)));
  assert.deepEqual(pool.topics, [{ id: 'git', title: 'Git en español', lang: 'es' }]);
  assert.equal(buildPool([git], 'en').cards[0].title, 'Title');
  assert.equal(buildPool([git]).topics[0].title, 'Git');
  assert.equal(git.cards[0].title, 'Title');
});

const DIAGRAM = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" role="img"><rect class="d-box" x="8" y="8" width="64" height="28"/></svg>';
const drawn = (over = {}) => concept({ diagram: { svg: DIAGRAM, alt: ' A box. ' }, ...over });

test('a card keeps a valid diagram with its alt text trimmed (CARD-9)', () => {
  assert.deepEqual(normalizeCard(drawn(), 'git').diagram, { svg: DIAGRAM, alt: 'A box.' });
  assert.deepEqual(normalizeCard(drawn({ kind: 'quiz', options: ['a', 'b'], answer: 0 }), 'git').diagram.alt, 'A box.');
});

test('a diagram that is not valid is dropped and its card stays (CARD-9)', () => {
  for (const diagram of [
    'x',
    { svg: DIAGRAM },
    { svg: DIAGRAM, alt: ' ' },
    { svg: DIAGRAM, alt: 'a'.repeat(MAX_ALT + 1) },
    { svg: DIAGRAM.replace('d-box', 'box'), alt: 'A box.' },
    { svg: DIAGRAM.replace('<rect', '<script'), alt: 'A box.' },
  ]) {
    const card = normalizeCard(drawn({ diagram }), 'git');
    assert.ok(card, JSON.stringify(diagram));
    assert.equal('diagram' in card, false, JSON.stringify(diagram));
  }
});

test('a translation of a card with a diagram needs its alt text (CARD-9)', () => {
  const es = { title: 'Título', body: 'Cuerpo.' };
  const kept = normalizeCard(drawn({ translations: { es: { ...es, diagram: { alt: ' Una caja. ' } } } }), 'git');
  assert.deepEqual(kept.translations.es, { ...es, diagram: { svg: DIAGRAM, alt: 'Una caja.' } });
  assert.equal(normalizeCard(drawn({ translations: { es } }), 'git').translations, undefined);
  assert.deepEqual(normalizeCard(concept({ translations: { es: { ...es, diagram: { alt: 'x' } } } }), 'git').translations.es, es);
});

test('the pool gives a card the diagram with the alt text of its language (CARD-9)', () => {
  const card = drawn({ translations: { es: { title: 'Título', body: 'Cuerpo.', diagram: { alt: 'Una caja.' } } } });
  const { pack: built } = normalizePack(pack([card]));
  assert.deepEqual(buildPool([built], 'es').cards[0].diagram, { svg: DIAGRAM, alt: 'Una caja.' });
  assert.deepEqual(buildPool([built], 'en').cards[0].diagram, { svg: DIAGRAM, alt: 'A box.' });
});

const PATH_POOL = {
  topics: [{ id: 'git', title: 'Git', lang: 'en' }, { id: 'http', title: 'HTTP', lang: 'en' }],
  cards: [{ id: 'git-a', topic: 'git' }, { id: 'git-b', topic: 'git' }, { id: 'http-a', topic: 'http' }, { id: 'http-b', topic: 'http' }],
};

test('a path flattens its steps, a pack to its cards in pack order and a card to itself (CARD-11)', () => {
  const raw = [{ id: 'web', title: ' Web ', steps: ['http-b', 'git'] }];
  assert.deepEqual(normalizePaths(raw, PATH_POOL), [{ id: 'web', title: 'Web', lang: 'en', ids: ['http-b', 'git-a', 'git-b'] }]);
});

test('a card listed alone and inside a listed pack is in the path once, at its first place (CARD-11)', () => {
  const [path] = normalizePaths([{ id: 'web', title: 'Web', steps: ['git-b', 'git', 'http', 'http-a'] }], PATH_POOL);
  assert.deepEqual(path.ids, ['git-b', 'git-a', 'http-a', 'http-b']);
});

test('a step that did not load is dropped, and a path with no card is dropped (CARD-11)', () => {
  const raw = [
    { id: 'web', title: 'Web', steps: ['css', 'git-z', 'http-a', 7] },
    { id: 'gone', title: 'Gone', steps: ['css', 'git-z'] },
  ];
  assert.deepEqual(normalizePaths(raw, PATH_POOL).map(({ id, ids }) => [id, ids]), [['web', ['http-a']]]);
});

test('a path with a bad or repeated id, a bad title or no steps is dropped; no list is no path (CARD-11)', () => {
  const ok = { id: 'web', title: 'Web', steps: ['git'] };
  const raw = [ok, { ...ok, title: 'Again' }, { ...ok, id: 'Web' }, { ...ok, id: 'x', title: 'a'.repeat(MAX_TITLE + 1) }, { ...ok, id: 'y', steps: 'git' }, null];
  assert.deepEqual(normalizePaths(raw, PATH_POOL).map(({ title }) => title), ['Web']);
  assert.deepEqual(normalizePaths(undefined, PATH_POOL), []);
  assert.deepEqual(normalizePaths({}, PATH_POOL), []);
});

test('the title of a path takes the language of the screen, like a pack (CARD-11)', () => {
  const raw = [{ id: 'ai', title: 'Learn AI', translations: { es: { title: 'Aprender IA' } }, steps: ['git'] }];
  assert.deepEqual(normalizePaths(raw, PATH_POOL, 'es').map(({ title, lang }) => [title, lang]), [['Aprender IA', 'es']]);
  assert.deepEqual(normalizePaths(raw, PATH_POOL, 'en').map(({ title, lang }) => [title, lang]), [['Learn AI', 'en']]);
});
