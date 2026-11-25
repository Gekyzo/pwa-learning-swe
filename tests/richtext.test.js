import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_PARAGRAPHS, MAX_PARAGRAPHS, MAX_BOLD, MAX_BOLD_LENGTH, parseRich, plainText, richStats, bodyIssues,
} from '#richtext';

test('the limits of the style rules are fixed', () => {
  assert.equal(MIN_PARAGRAPHS, 2);
  assert.equal(MAX_PARAGRAPHS, 4);
  assert.equal(MAX_BOLD, 3);
  assert.equal(MAX_BOLD_LENGTH, 60);
});

test('parseRich reads italic and bold runs between text', () => {
  assert.deepEqual(parseRich('A *b* **c**.'), [[
    { type: 'text', text: 'A ' },
    { type: 'italic', text: 'b' },
    { type: 'text', text: ' ' },
    { type: 'bold', text: 'c' },
    { type: 'text', text: '.' },
  ]]);
});

test('two or more newlines start a paragraph', () => {
  assert.equal(parseRich('One.\n\nTwo.\n\n\nThree.').length, 3);
});

test('one newline is a break inside the paragraph', () => {
  assert.deepEqual(parseRich('a\nb'), [[
    { type: 'text', text: 'a' },
    { type: 'break', text: '' },
    { type: 'text', text: 'b' },
  ]]);
});

test('CRLF line ends and spaces around lines give the same paragraphs', () => {
  assert.deepEqual(parseRich('one \r\n\r\n two '), parseRich('one\n\ntwo'));
});

test('a stray star stays as text and counts as unclosed', () => {
  assert.deepEqual(parseRich('SELECT * FROM t'), [[{ type: 'text', text: 'SELECT * FROM t' }]]);
  assert.equal(richStats('SELECT * FROM t').unclosed, 1);
});

test('an escaped star is a literal star', () => {
  assert.deepEqual(parseRich('2 \\* 3'), [[{ type: 'text', text: '2 * 3' }]]);
  assert.equal(richStats('2 \\* 3').unclosed, 0);
});

test('bold and italic do not nest', () => {
  assert.deepEqual(parseRich('**a *b* c**'), [[{ type: 'bold', text: 'a *b* c' }]]);
});

test('italic does not cross a line break', () => {
  assert.deepEqual(parseRich('*a\nb*'), [[
    { type: 'text', text: '*a' },
    { type: 'break', text: '' },
    { type: 'text', text: 'b*' },
  ]]);
  assert.equal(richStats('*a\nb*').unclosed, 2);
});

test('a plain body is one paragraph with one text token', () => {
  assert.deepEqual(parseRich('Plain body.'), [[{ type: 'text', text: 'Plain body.' }]]);
});

test('empty text has no paragraphs', () => {
  assert.deepEqual(parseRich(''), []);
  assert.deepEqual(parseRich('\n\n'), []);
});

test('plainText joins paragraphs and breaks with one space', () => {
  assert.equal(plainText('A **b**\n\n*c*'), 'A b c');
  assert.equal(plainText('a\nb'), 'a b');
});

test('a marker with nothing between stays as text', () => {
  assert.equal(plainText('****'), '****');
  assert.ok(richStats('****').unclosed > 0);
});

test('richStats counts paragraphs, runs, unclosed markers and the longest bold run', () => {
  assert.deepEqual(richStats('**ab** *c*\n\n**d**'), { paragraphs: 2, bold: 2, italic: 1, unclosed: 0, longestBold: 2 });
});

test('bodyIssues is empty for a body that follows the rules', () => {
  assert.deepEqual(bodyIssues('One **b** *i*.\n\nTwo.'), []);
});

test('bodyIssues names each broken rule', () => {
  const plain = bodyIssues('Plain.');
  for (const id of ['paragraphs', 'bold', 'italic']) assert.ok(plain.includes(id), id);
  assert.ok(bodyIssues('**b** *i*\n\n2\n\n3\n\n4\n\n5').includes('paragraphs'));
  assert.ok(bodyIssues('**a** **b** **c** **d** *i*\n\nTwo.').includes('bold'));
  assert.ok(bodyIssues(`**${'x'.repeat(61)}** *i*\n\nTwo.`).includes('bold-length'));
  assert.ok(!bodyIssues(`**${'x'.repeat(60)}** *i*\n\nTwo.`).includes('bold-length'));
  assert.ok(bodyIssues('A *b').includes('unclosed'));
});
