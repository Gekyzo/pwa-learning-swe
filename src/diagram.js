// The diagram of a card (CARD-9): a small SVG that the card shows inline. The parser accepts a
// strict subset of SVG markup and nothing else, so a diagram can never run code or load a file.
// The view builds the nodes from the tree, never from the markup.
export const MAX_DIAGRAM = 6000;

// The classes of `.feed-card-diagram` in styles.css: the only styling a diagram has.
export const CLASSES = [
  'd-box', 'd-hi', 'd-dot', 'd-ink', 'd-text', 'd-on-hi', 'd-note', 'd-label', 'd-start', 'd-end',
  'd-line', 'd-arrow', 'd-data-line', 'd-dash', 'd-head', 'd-data-head',
];

const SHAPE = ['class', 'transform', 'marker-start', 'marker-end'];
// The attributes of each element.
const ELEMENTS = {
  svg: ['xmlns', 'viewBox', 'role'],
  g: ['class', 'transform'],
  defs: [],
  marker: ['id', 'viewBox', 'refX', 'refY', 'markerWidth', 'markerHeight', 'orient'],
  path: [...SHAPE, 'd'],
  rect: [...SHAPE, 'x', 'y', 'width', 'height', 'rx', 'ry'],
  circle: [...SHAPE, 'cx', 'cy', 'r'],
  ellipse: [...SHAPE, 'cx', 'cy', 'rx', 'ry'],
  line: [...SHAPE, 'x1', 'y1', 'x2', 'y2'],
  polyline: [...SHAPE, 'points'],
  polygon: [...SHAPE, 'points'],
  text: ['class', 'transform', 'x', 'y', 'dx', 'dy'],
  tspan: ['class', 'x', 'y', 'dx', 'dy'],
};
// The elements that hold text.
const TEXT = ['text', 'tspan'];

const SVG_NS = 'http://www.w3.org/2000/svg';
// A plain value: numbers, path commands, a transform. No colon, quote or angle bracket.
const PLAIN = /^[\w\s.,#()+%-]*$/;
const REF = /^url\(#([a-z0-9-]+)\)$/;
const ENTITY = /&(?:(amp|lt|gt|quot|apos)|#(\d{1,6})|#x([0-9a-fA-F]{1,6}));/g;
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const OPEN = /<([a-zA-Z]+)((?:\s+[a-zA-Z-]+="[^"<>]*")*)\s*(\/?)>/y;
const CLOSE = /<\/([a-zA-Z]+)\s*>/y;
const CHARS = /[^<]+/y;
const ATTR = /([a-zA-Z-]+)="([^"]*)"/g;

const ownId = (value, prefix) => value.startsWith(`${prefix}-`) && /^[a-z0-9-]+$/.test(value);

const validValue = (name, value, prefix) => {
  if (name === 'xmlns') return value === SVG_NS;
  if (name === 'role') return value === 'img';
  if (name === 'class') return value.trim().split(/\s+/).every((one) => CLASSES.includes(one));
  if (name === 'id') return ownId(value, prefix);
  if (name === 'marker-start' || name === 'marker-end') return ownId(value.match(REF)?.[1] ?? '', prefix);
  return PLAIN.test(value);
};

// The attributes of a tag as an object, or null when one is not allowed or is twice.
const attrsOf = (name, source, prefix) => {
  const attrs = {};
  for (const [, key, value] of source.matchAll(ATTR)) {
    if (key in attrs || !ELEMENTS[name].includes(key) || !validValue(key, value, prefix)) return null;
    attrs[key] = value;
  }
  return attrs;
};

// The text with its entities decoded, or null when it has a bare `&` or an unknown entity.
const decode = (raw) => {
  if (raw.replace(ENTITY, '').includes('&')) return null;
  return raw.replace(ENTITY, (_, named, dec, hex) => NAMED[named] ?? String.fromCodePoint(Number.parseInt(dec ?? hex, dec ? 10 : 16)));
};

const at = (pattern, source, index) => {
  pattern.lastIndex = index;
  return pattern.exec(source);
};

// The tree `{ name, attrs, children }` of the diagram, whose children are nodes and strings, or
// null. `prefix` is the id of the card: each id of the diagram starts with it, so two diagrams on
// one page never share an id.
export const parseDiagram = (svg, prefix) => {
  if (typeof svg !== 'string' || svg.length > MAX_DIAGRAM) return null;
  const source = svg.trim();
  const root = { children: [] };
  const stack = [root];
  let index = 0;
  while (index < source.length) {
    const parent = stack.at(-1);
    const open = at(OPEN, source, index);
    const close = open ? null : at(CLOSE, source, index);
    const chars = open || close ? null : at(CHARS, source, index);
    if (open) {
      const [whole, name, rawAttrs, selfClosing] = open;
      const isRoot = parent === root;
      if (!(name in ELEMENTS) || isRoot !== (name === 'svg') || (isRoot && root.children.length)) return null;
      if (name === 'tspan' && parent.name !== 'text') return null;
      const attrs = attrsOf(name, rawAttrs, prefix);
      if (!attrs) return null;
      const node = { name, attrs, children: [] };
      parent.children.push(node);
      if (!selfClosing) stack.push(node);
      index += whole.length;
    } else if (close) {
      if (parent === root || close[1] !== parent.name) return null;
      stack.pop();
      index += close[0].length;
    } else if (chars) {
      const raw = chars[0];
      if (TEXT.includes(parent.name)) {
        const text = decode(raw);
        if (text === null) return null;
        parent.children.push(text);
      } else if (raw.trim()) return null;
      index += raw.length;
    } else return null;
  }
  const [tree] = root.children;
  if (stack.length !== 1 || !tree || !tree.attrs.viewBox) return null;
  return tree;
};
