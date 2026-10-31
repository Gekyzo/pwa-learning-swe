// The colours of the code of a snippet (CARD-8): the code in tokens, each with a type that a code
// theme of styles.css paints (SET-3). A small scanner for each syntax, not a parser.
export const SYNTAXES = ['js', 'sql', 'sh'];
export const TOKENS = ['plain', 'keyword', 'string', 'number', 'comment', 'function'];

const words = (text) => new Set(text.split(' '));

const JS_KEYWORDS = words(
  'async await break case catch class const continue default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while yield',
);
const SQL_KEYWORDS = words(
  'add all alter analyze and as asc between buffers by case create delete desc distinct drop else end exists explain from group having in index inner insert into is join key left limit not null offset on or order outer primary references right select set table then union unique update values when where with',
);
const SH_KEYWORDS = words('case do done elif else esac fi for function if in then until while');

const NUMBER = /0x[\da-f]+|\d[\d_]*(\.\d+)?(e[+-]?\d+)?n?/iy;
const BLOCK_COMMENT = /\/\*[\s\S]*?(\*\/|$)/y;
const quoted = (quote) => new RegExp(`${quote}(\\\\[\\s\\S]|[^${quote}\\\\])*(${quote}|$)`, 'y');

// A rule is [type, pattern]: a sticky pattern tried at the place of the scan. A `word` rule gives
// its type by the word and the text after it.
const GRAMMARS = {
  js: {
    rules: [
      ['comment', /\/\/[^\n]*/y],
      ['comment', BLOCK_COMMENT],
      ['string', quoted("'")],
      ['string', quoted('"')],
      ['string', quoted('`')],
      ['number', NUMBER],
    ],
    word: /[a-z_$][\w$]*/iy,
    typeOf: (word, rest) => (JS_KEYWORDS.has(word) ? 'keyword' : /^\s*\(/.test(rest) ? 'function' : 'plain'),
  },
  sql: {
    rules: [
      ['comment', /--[^\n]*/y],
      ['comment', BLOCK_COMMENT],
      ['string', /'(''|[^'])*('|$)/y],
      ['number', NUMBER],
    ],
    word: /[a-z_][\w$]*/iy,
    typeOf: (word, rest) => (SQL_KEYWORDS.has(word.toLowerCase()) ? 'keyword' : /^\s*\(/.test(rest) ? 'function' : 'plain'),
  },
  sh: {
    rules: [
      // A # starts a comment only at the start of a word.
      ['comment', /(?<=^|\s)#[^\n]*/y],
      ['string', /'[^']*('|$)/y],
      ['string', quoted('"')],
      ['keyword', /(?<=^|\s)--?[a-z][\w-]*/iy],
      ['number', /(?<=^|\s)\d+(?=\s|$)/y],
    ],
    word: /[^\s|&;()'"]+/y,
    // The first word of a line or of a step of a pipeline is the command.
    typeOf: (word, rest, before) => (SH_KEYWORDS.has(word) ? 'keyword' : /(^|[|&;(]|\n)\s*$/.test(before) ? 'function' : 'plain'),
  },
};

const at = (pattern, code, index) => {
  pattern.lastIndex = index;
  return pattern.exec(code)?.[0] || null;
};

// [{ type, text }] whose texts join back into `code`. With no known syntax the code is one plain
// token. The plain parts next to each other are one token.
export const highlight = (code, syntax) => {
  const grammar = GRAMMARS[syntax];
  if (!grammar) return code ? [{ type: 'plain', text: code }] : [];
  const tokens = [];
  const push = (type, text) => {
    const last = tokens.at(-1);
    if (type === 'plain' && last?.type === 'plain') last.text += text;
    else tokens.push({ type, text });
  };
  let index = 0;
  while (index < code.length) {
    const rule = grammar.rules.map(([type, pattern]) => [type, at(pattern, code, index)]).find(([, text]) => text);
    const word = rule ? null : at(grammar.word, code, index);
    if (rule) push(...rule);
    else if (word) push(grammar.typeOf(word, code.slice(index + word.length), code.slice(0, index)), word);
    else push('plain', code[index]);
    index += (rule?.[1] ?? word ?? code[index]).length;
  }
  return tokens;
};
