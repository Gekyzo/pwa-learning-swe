import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodyReport } from '../scripts/check-bodies.mjs';

const GOOD = 'An *embedding* is a **vector**.\n\nOnly the *distances* matter.';
const GOOD_ES = 'Un *embedding* es un **vector**.\n\nSolo importan las *distancias*.';
const card = (id, body, es = GOOD_ES) => ({
  id,
  kind: 'concept',
  level: 'intro',
  title: 'A title',
  body,
  translations: { es: { title: 'Un título', body: es } },
});
const pack = (cards) => ({ id: 'p', version: 1, title: 'P', cards });

test('bodyReport counts the bodies of every language and prints no line when all follow the rules', () => {
  assert.deepEqual(bodyReport([pack([card('p-a', GOOD), card('p-b', GOOD)])]), { lines: [], count: 4 });
});

test('bodyReport prints one line per failing body with its card id, language and issues', () => {
  const report = bodyReport([pack([card('p-a', 'One plain paragraph.'), card('p-b', GOOD, 'Un *solo* párrafo.')])]);
  assert.deepEqual(report.lines, ['p-a en paragraphs,bold,italic', 'p-b es paragraphs,bold']);
  assert.equal(report.count, 4);
});

test('bodyReport prints a card or a translation that the validator drops', () => {
  const report = bodyReport([pack([card('p-a', ''), card('p-b', GOOD, '')])]);
  assert.deepEqual(report.lines, ['p-a en dropped', 'p-a es dropped', 'p-b es dropped']);
});

test('bodyReport prints a pack that is not one', () => {
  assert.deepEqual(bodyReport([{ id: 'x' }]).lines, ['x - not a pack']);
});
