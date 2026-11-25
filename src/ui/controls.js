const SVG_NS = 'http://www.w3.org/2000/svg';

// A line icon of icons.svg.
export const icon = (name, variant = '') => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', variant ? `icon ${variant}` : 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `icons.svg#${name}`);
  svg.append(use);
  return svg;
};

let sprite = null;

// The shapes of a symbol, for a copy of an icon that must stand alone, such as a data: image.
export const symbolNodes = async (name) => {
  sprite ??= fetch('icons.svg')
    .then((response) => response.text())
    .then((text) => new DOMParser().parseFromString(text, 'image/svg+xml'));
  const symbol = (await sprite).getElementById(name);
  return symbol ? [...symbol.childNodes].map((node) => node.cloneNode(true)) : [];
};

// An SVG node of the tree of a diagram (CARD-9), built element by element, never from markup.
const svgNode = ({ name, attrs, children }) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) if (key !== 'xmlns') node.setAttribute(key, value);
  node.append(...children.map((child) => (typeof child === 'string' ? child : svgNode(child))));
  return node;
};

// The svg of a diagram, named by its alt text.
export const diagramSvg = (tree, alt) => {
  const svg = svgNode(tree);
  svg.setAttribute('class', 'diagram');
  svg.setAttribute('aria-label', alt);
  return svg;
};
