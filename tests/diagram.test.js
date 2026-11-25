import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, MAX_DIAGRAM, parseDiagram } from '#diagram';

const svg = (inner, attrs = 'viewBox="0 0 320 120" role="img"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`;
const parse = (inner, attrs) => parseDiagram(svg(inner, attrs), 'rag-a');

test('a diagram parses into a tree of elements, attributes and texts', () => {
  const tree = parse('<rect class="d-box" x="8" y="20" width="64" height="28" rx="6"/><text class="d-text" x="40" y="34">docs</text>');
  assert.deepEqual(tree, {
    name: 'svg',
    attrs: { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 320 120', role: 'img' },
    children: [
      { name: 'rect', attrs: { class: 'd-box', x: '8', y: '20', width: '64', height: '28', rx: '6' }, children: [] },
      { name: 'text', attrs: { class: 'd-text', x: '40', y: '34' }, children: ['docs'] },
    ],
  });
});

test('a marker with an id of the card and a path that points to it are kept', () => {
  const tree = parse(
    '<defs><marker id="rag-a-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="d-head" d="M0 0L8 4L0 8z"/></marker></defs>' +
      '<path class="d-arrow" marker-end="url(#rag-a-head)" d="M40 120V168H86"/>',
  );
  assert.equal(tree.children[0].children[0].attrs.id, 'rag-a-head');
  assert.equal(tree.children[1].attrs['marker-end'], 'url(#rag-a-head)');
});

test('whitespace between elements is dropped and text keeps its entities decoded', () => {
  const tree = parse('\n  <text class="d-note" x="1" y="2">a &lt; b &amp; c &#952; &#x2713;</text>\n');
  assert.deepEqual(tree.children, [{ name: 'text', attrs: { class: 'd-note', x: '1', y: '2' }, children: ['a < b & c θ ✓'] }]);
});

test('a tspan inside a text is kept', () => {
  const tree = parse('<text class="d-text" x="1" y="2">k = <tspan class="d-on-hi">5</tspan></text>');
  assert.deepEqual(tree.children[0].children, ['k = ', { name: 'tspan', attrs: { class: 'd-on-hi' }, children: ['5'] }]);
});

test('the classes are the d- classes of the stylesheet', () => {
  assert.ok(CLASSES.includes('d-box') && CLASSES.includes('d-hi') && CLASSES.includes('d-arrow'));
  assert.ok(CLASSES.every((name) => name.startsWith('d-')));
});

test('a forbidden element makes the diagram null', () => {
  for (const inner of [
    '<script>alert(1)</script>',
    '<foreignObject><div/></foreignObject>',
    '<image x="1"/>',
    '<use x="1"/>',
    '<a><rect class="d-box"/></a>',
    '<style>rect{}</style>',
    '<title>t</title>',
  ]) {
    assert.equal(parse(inner), null, inner);
  }
});

test('a forbidden attribute or value makes the diagram null', () => {
  for (const inner of [
    '<rect onclick="x()"/>',
    '<rect style="fill:red"/>',
    '<rect fill="red"/>',
    '<rect href="https://x.org"/>',
    '<rect class="d-box other"/>',
    '<rect x="javascript:1"/>',
    '<rect id="other-head"/>',
    '<path marker-end="url(https://x.org/a.svg#h)"/>',
    '<path marker-end="url(#other-head)"/>',
    "<rect x='1'/>",
    '<rect x=1/>',
    '<text x="1" text-anchor="start">a</text>',
  ]) {
    assert.equal(parse(inner), null, inner);
  }
});

test('the root must be one svg with a viewBox and no size', () => {
  assert.equal(parseDiagram('<g></g>', 'rag-a'), null);
  assert.equal(parse('', 'role="img"'), null);
  assert.equal(parse('', 'viewBox="0 0 320 120" width="320"'), null);
  assert.equal(parseDiagram(`${svg('')}<svg viewBox="0 0 1 1"></svg>`, 'rag-a'), null);
  assert.equal(parseDiagram(`x${svg('')}`, 'rag-a'), null);
});

test('markup that is not well formed makes the diagram null', () => {
  for (const bad of [
    svg('<g><rect/></svg>'),
    svg('<g></rect>'),
    svg('<!-- c -->'),
    svg('<![CDATA[x]]>'),
    '<!DOCTYPE svg><svg viewBox="0 0 1 1"></svg>',
    svg('<text x="1">a & b</text>'),
    svg('<text x="1">&nbsp;</text>'),
    svg('<rect x="1" x="2"/>'),
    svg('stray text'),
  ]) {
    assert.equal(parseDiagram(bad, 'rag-a'), null, bad);
  }
});

test('a diagram that is not a string, is blank or is longer than MAX_DIAGRAM is null', () => {
  assert.equal(parseDiagram(null, 'rag-a'), null);
  assert.equal(parseDiagram('  ', 'rag-a'), null);
  const long = svg(`<text class="d-note" x="1" y="1">${'a'.repeat(MAX_DIAGRAM)}</text>`);
  assert.equal(parseDiagram(long, 'rag-a'), null);
});
