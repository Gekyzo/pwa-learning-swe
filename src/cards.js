import { SYNTAXES } from '#highlight';
import { parseDiagram } from '#diagram';
import { plainText } from '#richtext';

// The content of the feed: cards in packs, one pack for each topic (CARD-1 to CARD-6). The packs
// are the JSON files of content/; this module only validates them.
export const KINDS = ['concept', 'snippet', 'pitfall', 'quiz', 'resource'];
export const LEVELS = ['intro', 'intermediate', 'advanced'];
export const MEDIA = ['article', 'docs', 'video', 'course', 'book', 'repo'];
export const MAX_TITLE = 120;
// The body limit counts the visible text; the raw text, markup included, has its own cap (CARD-10).
export const MAX_BODY = 600;
export const MAX_BODY_SOURCE = 800;
export const MAX_CODE = 800;
export const MAX_MINUTES = 600;
export const MAX_ALT = 400;
// The language of the text of the packs; a translation adds another one (CARD-7).
export const SOURCE_LANG = 'en';

const ID = /^[a-z][a-z0-9-]*$/;
const LANG = /^[a-z]{2}$/;

const isCount = (value, min = 1) => Number.isInteger(value) && value >= min;

// The trimmed text, or null when it is blank or longer than `max`.
const text = (value, max) => {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean && clean.length <= max ? clean : null;
};

// The trimmed body as written, markup included, or null when it is blank, longer than
// MAX_BODY_SOURCE, or when its visible text is empty or longer than MAX_BODY (CARD-2).
const body = (value) => {
  const clean = text(value, MAX_BODY_SOURCE);
  if (!clean) return null;
  const visible = plainText(clean).length;
  return visible >= 1 && visible <= MAX_BODY ? clean : null;
};

const httpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
};

// The fields that only one kind has.
const KIND_FIELDS = {
  concept: () => ({}),
  pitfall: () => ({}),
  // A syntax that the highlight does not know is dropped: the code shows plain (CARD-8).
  snippet: ({ code, syntax }) =>
    typeof code === 'string' && code.trim() && code.length <= MAX_CODE ? { code, ...(SYNTAXES.includes(syntax) ? { syntax } : {}) } : null,
  quiz: ({ options, answer }) => {
    if (!Array.isArray(options) || options.length < 2 || options.length > 4) return null;
    const clean = options.map((option) => text(option, MAX_TITLE));
    if (clean.includes(null) || !Number.isInteger(answer) || answer < 0 || answer >= clean.length) return null;
    return { options: clean, answer };
  },
  resource: ({ url, media, minutes }) => {
    if (!httpsUrl(url) || !MEDIA.includes(media) || !isCount(minutes) || minutes > MAX_MINUTES) return null;
    return { url, media, minutes };
  },
};

// `{ [lang]: texts }` with the texts that `clean` accepts, or null when no language has them (CARD-7).
const translationsOf = (data, clean) => {
  if (typeof data !== 'object' || data === null) return null;
  const kept = Object.entries(data)
    .filter(([lang]) => LANG.test(lang) && lang !== SOURCE_LANG)
    .map(([lang, texts]) => [lang, typeof texts === 'object' && texts !== null ? clean(texts) : null])
    .filter(([, texts]) => texts);
  return kept.length ? Object.fromEntries(kept) : null;
};

// `{ diagram }` when the card has a valid diagram and alt text, else nothing: a bad diagram is
// dropped and its card stays (CARD-9).
const diagramOf = (data, id) => {
  if (typeof data !== 'object' || data === null) return {};
  const alt = text(data.alt, MAX_ALT);
  return alt && parseDiagram(data.svg, id) ? { diagram: { svg: data.svg.trim(), alt } } : {};
};

const withTranslations = (translations) => (translations ? { translations } : {});

// The options of a quiz in another language, as many as it has, or null.
const optionsOf = (card, texts) => {
  const options = Array.isArray(texts.options) ? texts.options.map((option) => text(option, MAX_TITLE)) : [];
  return options.length === card.options.length && !options.includes(null) ? { options } : null;
};

// The diagram of a card with the alt text of another language, or null when it has none (CARD-9).
const altOf = (card, texts) => {
  const alt = text(texts.diagram?.alt, MAX_ALT);
  return alt ? { diagram: { svg: card.diagram.svg, alt } } : null;
};

// The title and the body of a card in another language, the options of a quiz and the alt text of
// a diagram.
const cardTexts = (card) => (texts) => {
  const title = text(texts.title, MAX_TITLE);
  const clean = body(texts.body);
  const options = card.kind === 'quiz' ? optionsOf(card, texts) : {};
  const diagram = card.diagram ? altOf(card, texts) : {};
  return title && clean && options && diagram ? { title, body: clean, ...options, ...diagram } : null;
};

const packTexts = (texts) => {
  const title = text(texts.title, MAX_TITLE);
  return title ? { title } : null;
};

// A clean card of the pack `packId`, or null (CARD-2, CARD-3).
export const normalizeCard = (data, packId) => {
  if (typeof data !== 'object' || data === null) return null;
  const { id, rev = 1, kind, level } = data;
  if (typeof id !== 'string' || !ID.test(id) || !id.startsWith(`${packId}-`)) return null;
  if (!isCount(rev) || !KINDS.includes(kind) || !LEVELS.includes(level)) return null;
  const title = text(data.title, MAX_TITLE);
  const clean = body(data.body);
  const extra = KIND_FIELDS[kind](data);
  if (!title || !clean || !extra) return null;
  const card = { id, rev, kind, level, title, body: clean, ...extra, ...diagramOf(data.diagram, id), ...(data.retired === true ? { retired: true } : {}) };
  return { ...card, ...withTranslations(translationsOf(data.translations, cardTexts(card))) };
};

// { pack, dropped }: the pack with its valid cards and the ids of the cards it dropped (`#index`
// for a card with no id), or { pack: null } for a pack that is not one (CARD-4).
export const normalizePack = (data) => {
  if (typeof data !== 'object' || data === null) return { pack: null, dropped: [] };
  const { id, version, cards } = data;
  const title = text(data.title, MAX_TITLE);
  if (typeof id !== 'string' || !ID.test(id) || !isCount(version) || !title || !Array.isArray(cards)) {
    return { pack: null, dropped: [] };
  }
  const kept = [];
  const dropped = [];
  cards.forEach((raw, index) => {
    const card = normalizeCard(raw, id);
    if (card && !kept.some((other) => other.id === card.id)) kept.push(card);
    else dropped.push(typeof raw?.id === 'string' ? raw.id : `#${index}`);
  });
  const translations = withTranslations(translationsOf(data.translations, packTexts));
  return { pack: { id, version, title, ...translations, cards: kept }, dropped };
};

// A card or a topic in `lang` where it has a translation, else in English, with the language of its text.
const localize = ({ translations, ...item }, lang) => {
  const texts = translations?.[lang];
  return texts ? { ...item, ...texts, lang } : { ...item, lang: SOURCE_LANG };
};

// The cards of the packs, each with its topic, and the topics in the order of the packs, in `lang`
// (CARD-7). A pack id that is twice keeps its first pack (CARD-5).
export const buildPool = (packs, lang = SOURCE_LANG) => {
  const used = packs.filter((pack, index) => packs.findIndex((other) => other.id === pack.id) === index);
  return {
    cards: used.flatMap((pack) => pack.cards.map((card) => ({ ...localize(card, lang), topic: pack.id }))),
    topics: used.map(({ id, title, translations }) => localize({ id, title, translations }, lang)),
  };
};

// The card ids of the steps of a path in `pool`: a pack id gives its cards in pack order, a card id
// gives that card. A step that did not load is dropped, and a card that is twice keeps its first place (CARD-11).
const pathIds = (steps, pool) => {
  const ids = steps.flatMap((step) =>
    pool.topics.some((topic) => topic.id === step)
      ? pool.cards.filter((card) => card.topic === step).map((card) => card.id)
      : pool.cards.some((card) => card.id === step) ? [step] : [],
  );
  return [...new Set(ids)];
};

// The paths of content/index.json, `[{ id, title, lang, ids }]`, with the title in `lang` (CARD-11).
export const normalizePaths = (raw, pool, lang = SOURCE_LANG) => {
  if (!Array.isArray(raw)) return [];
  const paths = [];
  for (const data of raw) {
    if (typeof data !== 'object' || data === null || !Array.isArray(data.steps)) continue;
    const { id } = data;
    const title = text(data.title, MAX_TITLE);
    if (typeof id !== 'string' || !ID.test(id) || !title || paths.some((path) => path.id === id)) continue;
    const ids = pathIds(data.steps, pool);
    const translations = translationsOf(data.translations, packTexts);
    if (ids.length) paths.push({ ...localize({ id, title, ...withTranslations(translations) }, lang), ids });
  }
  return paths;
};
