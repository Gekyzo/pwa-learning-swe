import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { KINDS, SOURCE_LANG, normalizePack, buildPool } from '#cards';
import { LANGUAGES } from '#i18n';

// The packs of content/ that the app ships (CARD-6).
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const index = JSON.parse(read('content/index.json'));
const packs = index.packs.map((id) => ({ id, data: JSON.parse(read(`content/${id}.json`)) }));

test('the index lists each pack file of content/ one time', () => {
  const files = readdirSync(new URL('content/', root)).filter((file) => file.endsWith('.json') && file !== 'index.json');
  assert.deepEqual([...index.packs].sort(), files.map((file) => file.slice(0, -'.json'.length)).sort());
  assert.equal(new Set(index.packs).size, index.packs.length);
});

test('each pack is valid, has its file name as its id and drops no card', () => {
  for (const { id, data } of packs) {
    const { pack, dropped } = normalizePack(data);
    assert.ok(pack, id);
    assert.equal(pack.id, id);
    assert.deepEqual(dropped, [], id);
  }
});

test('each pack and each card has a valid translation for each other language of the screen (CARD-7)', () => {
  const others = LANGUAGES.filter((lang) => lang !== SOURCE_LANG);
  for (const { id, data } of packs) {
    const { pack } = normalizePack(data);
    for (const lang of others) {
      assert.ok(pack.translations?.[lang], `${id} ${lang}`);
      for (const card of pack.cards) assert.ok(card.translations?.[lang], `${card.id} ${lang}`);
    }
  }
});

test('each card id is unique across the packs', () => {
  const ids = packs.flatMap(({ data }) => data.cards.map((card) => card.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('the content has each kind of card', () => {
  const { cards } = buildPool(packs.map(({ data }) => normalizePack(data).pack));
  for (const kind of KINDS) assert.ok(cards.some((card) => card.kind === kind), kind);
});

test('SHELL of sw.js has the index and each pack, so the feed works offline', () => {
  const shell = read('sw.js');
  for (const file of ['index', ...index.packs]) assert.ok(shell.includes(`'./content/${file}.json'`), file);
});
