// The pages of the walkthrough of the first start, in their order. The last one chooses the topics.
export const PAGES = ['welcome', 'review', 'keep', 'offline', 'topics'];

// The walkthrough shows at the start of a new install only: no seen flag and no stored state.
export const shouldShow = ({ seen, hasState }) => !seen && !hasState;

// The index of the page after a move of `direction` (1, -1 or 0). It stays in the pages.
export const step = (index, direction) => Math.min(Math.max(index + direction, 0), PAGES.length - 1);

export const isLast = (index) => index === PAGES.length - 1;

// A key that starts with `#name` shows the icon `name` of the sprite, then the rest of its text.
const keyPart = (text) => {
  const match = text.match(/^#([a-z][\w-]*)(?: (.*))?$/s);
  return match ? { text: match[2] ?? '', key: true, icon: match[1] } : { text, key: true };
};

// The parts of a page text. A text between two backticks is a key, such as `↻` or `+`; a
// backtick with no pair stays in the text. A text between two `**` is bold (`strong: true`), keys
// in it too; a `**` with no pair stays in the text.
export const textParts = (text) => {
  const pieces = text.split('`');
  // An even count of pieces means that the last backtick has no pair.
  const open = pieces.length % 2 === 0 ? pieces.splice(-2).join('`') : null;
  const raw = pieces.map((piece, index) => ({ text: piece, key: index % 2 === 1 }));
  if (open !== null) raw.push({ text: open, key: false });
  // The bold marks outside the keys. An odd last mark has no pair.
  const marks = raw.filter((part) => !part.key).reduce((count, part) => count + part.text.split('**').length - 1, 0);
  let pairs = marks - (marks % 2);
  let strong = false;
  const parts = [];
  for (const part of raw) {
    if (part.key) {
      parts.push({ ...part, strong });
      continue;
    }
    part.text.split('**').forEach((piece, index) => {
      if (index > 0 && pairs > 0) {
        pairs -= 1;
        strong = !strong;
        parts.push({ text: piece, key: false, strong });
      } else parts.push({ text: index > 0 ? `**${piece}` : piece, key: false, strong });
    });
  }
  return parts
    .filter((part) => part.text)
    .reduce((joined, { strong: bold, ...part }) => {
      const last = joined.at(-1);
      if (last && !last.key && !part.key && Boolean(last.strong) === bold) last.text += part.text;
      else joined.push({ ...(part.key ? keyPart(part.text) : part), ...(bold && { strong: true }) });
      return joined;
    }, []);
};
