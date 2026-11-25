// The rich text of a card body (CARD-10): a blank line starts a paragraph, one newline is a break,
// **x** is bold, *x* is italic and \* is a literal star. No nesting and no other markup. A marker
// with no closing pair in its line stays as text and counts as unclosed.
export const MIN_PARAGRAPHS = 2;
export const MAX_PARAGRAPHS = 4;
export const MAX_BOLD = 3;
export const MAX_BOLD_LENGTH = 60;

const unescape = (text) => text.replaceAll('\\*', '*');
const isEscape = (line, i) => line[i] === '\\' && line[i + 1] === '*';

// The index of the `**` that closes a bold run opened at `start`, with at least one character
// between, or -1.
const closeBold = (line, start) => {
  for (let j = start + 3; j < line.length - 1; j += 1) {
    if (isEscape(line, j)) j += 1;
    else if (line[j] === '*' && line[j + 1] === '*') return j;
  }
  return -1;
};

// The index of the single `*` (not part of `**`) that closes an italic run opened at `start`, or -1.
const closeItalic = (line, start) => {
  for (let j = start + 1; j < line.length; j += 1) {
    if (isEscape(line, j)) j += 1;
    else if (line[j] === '*') {
      if (line[j + 1] !== '*') return j;
      j += 1;
    }
  }
  return -1;
};

const parseLine = (line) => {
  const tokens = [];
  let text = '';
  let unclosed = 0;
  const run = (type, inner) => {
    if (text) tokens.push({ type: 'text', text });
    text = '';
    tokens.push({ type, text: unescape(inner) });
  };
  let i = 0;
  while (i < line.length) {
    if (isEscape(line, i)) {
      text += '*';
      i += 2;
    } else if (line[i] === '*' && line[i + 1] === '*') {
      const end = closeBold(line, i);
      if (end < 0) {
        text += '**';
        unclosed += 1;
        i += 2;
      } else {
        run('bold', line.slice(i + 2, end));
        i = end + 2;
      }
    } else if (line[i] === '*') {
      const end = closeItalic(line, i);
      if (end < 0) {
        text += '*';
        unclosed += 1;
        i += 1;
      } else {
        run('italic', line.slice(i + 1, end));
        i = end + 1;
      }
    } else {
      text += line[i];
      i += 1;
    }
  }
  if (text) tokens.push({ type: 'text', text });
  return { tokens, unclosed };
};

const parse = (text) => {
  let unclosed = 0;
  const paragraphs = String(text ?? '')
    .replaceAll('\r\n', '\n')
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines) =>
      lines.flatMap((line, index) => {
        const parsed = parseLine(line);
        unclosed += parsed.unclosed;
        return index === 0 ? parsed.tokens : [{ type: 'break', text: '' }, ...parsed.tokens];
      }));
  return { paragraphs, unclosed };
};

export const parseRich = (text) => parse(text).paragraphs;

export const plainText = (text) =>
  parseRich(text)
    .map((tokens) => tokens.map((token) => (token.type === 'break' ? ' ' : token.text)).join(''))
    .join(' ');

export const richStats = (text) => {
  const { paragraphs, unclosed } = parse(text);
  const tokens = paragraphs.flat();
  const bolds = tokens.filter((token) => token.type === 'bold');
  return {
    paragraphs: paragraphs.length,
    bold: bolds.length,
    italic: tokens.filter((token) => token.type === 'italic').length,
    unclosed,
    longestBold: Math.max(0, ...bolds.map((token) => token.text.length)),
  };
};

// The style rules of a body that a test checks on content/; they never drop a card at run time.
export const bodyIssues = (text) => {
  const stats = richStats(text);
  return [
    (stats.paragraphs < MIN_PARAGRAPHS || stats.paragraphs > MAX_PARAGRAPHS) && 'paragraphs',
    (stats.bold < 1 || stats.bold > MAX_BOLD) && 'bold',
    stats.italic < 1 && 'italic',
    stats.unclosed > 0 && 'unclosed',
    stats.longestBold > MAX_BOLD_LENGTH && 'bold-length',
  ].filter(Boolean);
};
