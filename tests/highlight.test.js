import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYNTAXES, TOKENS, highlight } from '#highlight';

const typed = (code, syntax) => highlight(code, syntax).filter(({ type }) => type !== 'plain').map(({ type, text }) => [type, text]);
const joined = (tokens) => tokens.map(({ text }) => text).join('');

test('the syntaxes and the token types are fixed', () => {
  assert.deepEqual(SYNTAXES, ['js', 'sql', 'sh']);
  assert.deepEqual(TOKENS, ['plain', 'keyword', 'string', 'number', 'comment', 'function']);
});

test('the tokens give back the code as written, in each syntax', () => {
  const samples = {
    js: "const a = f(`x ${1}`, 'b\\'c'); // end\n/* open",
    sql: "SELECT * FROM t WHERE a = 'it''s' -- note\n",
    sh: 'git log --oneline | grep "fix" # a#b\n',
  };
  for (const [syntax, code] of Object.entries(samples)) assert.equal(joined(highlight(code, syntax)), code, syntax);
});

test('no syntax or an unknown one is one plain token', () => {
  assert.deepEqual(highlight('const a = 1;'), [{ type: 'plain', text: 'const a = 1;' }]);
  assert.deepEqual(highlight('const a = 1;', 'cobol'), [{ type: 'plain', text: 'const a = 1;' }]);
});

test('empty code has no token', () => {
  assert.deepEqual(highlight('', 'js'), []);
});

test('js marks keywords, strings, numbers, comments and calls', () => {
  assert.deepEqual(typed("const n = Math.max(1, 2.5e3); // big\nreturn 'a';", 'js'), [
    ['keyword', 'const'],
    ['function', 'max'],
    ['number', '1'],
    ['number', '2.5e3'],
    ['comment', '// big'],
    ['keyword', 'return'],
    ['string', "'a'"],
  ]);
});

test('js keeps an escaped quote and a template inside the string', () => {
  assert.deepEqual(typed("'it\\'s' `a ${b}`", 'js'), [
    ['string', "'it\\'s'"],
    ['string', '`a ${b}`'],
  ]);
});

test('js reads a word with a digit as one word, and a block comment to its end', () => {
  assert.deepEqual(typed('let x2 = y; /* a\nb */ z', 'js'), [
    ['keyword', 'let'],
    ['comment', '/* a\nb */'],
  ]);
});

test('an unclosed string or comment runs to the end of the code', () => {
  assert.deepEqual(typed('a = "open', 'js'), [['string', '"open']]);
  assert.deepEqual(typed('a /* open', 'js'), [['comment', '/* open']]);
});

test('sql keywords are in any case, and a doubled quote stays in the string', () => {
  assert.deepEqual(typed("select COUNT(*) From t where a = 'it''s'; -- n", 'sql'), [
    ['keyword', 'select'],
    ['function', 'COUNT'],
    ['keyword', 'From'],
    ['keyword', 'where'],
    ['string', "'it''s'"],
    ['comment', '-- n'],
  ]);
});

test('sh marks the command of each pipeline step, the flags and the comments', () => {
  assert.deepEqual(typed('git log --oneline -n 5 | grep "fix" # last', 'sh'), [
    ['function', 'git'],
    ['keyword', '--oneline'],
    ['keyword', '-n'],
    ['number', '5'],
    ['function', 'grep'],
    ['string', '"fix"'],
    ['comment', '# last'],
  ]);
});

test('sh reads a # inside a word as text, and a command after a new line', () => {
  assert.deepEqual(typed('echo a#b\ncurl https://x.dev/#top', 'sh'), [
    ['function', 'echo'],
    ['function', 'curl'],
  ]);
});

test('the plain parts between tokens are joined', () => {
  assert.deepEqual(highlight('a + b', 'js'), [{ type: 'plain', text: 'a + b' }]);
});
