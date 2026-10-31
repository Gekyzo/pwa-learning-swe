import { FEED_KEY, emptyLearning, normalizeLearning } from '#learning';
import {
  loadDoc,
  saveDoc,
  loadLanguage,
  saveLanguage,
  loadCardLanguage,
  saveCardLanguage,
  loadHand,
  saveHand,
  loadTheme,
  saveTheme,
  CODE_THEMES,
  loadCodeTheme,
  saveCodeTheme,
  loadModules,
  saveModules,
  loadTopics,
  saveTopics,
  loadOnboarded,
  hasStoredDoc,
} from '#storage';
import { LANGUAGES, resolveLanguage, resolveCardLanguage, translator } from '#i18n';
import { shouldShow } from '#onboarding';

// The values that the views share. A view reads them through the import, a live binding, and
// changes them only through the setters of this module.

export const UNDO_MS = 5000;
export const MESSAGE_MS = 3000;
export const CLICK_GUARD_MS = 350;
// The wait for the service worker to load the new deploy.
export const REFRESH_MS = 15000;
// The wait for the deployed version: a weak network can leave the request open.
export const CHECK_MS = 8000;

export const $ = (id) => document.getElementById(id);

export const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

export const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();

export const scroller = document.querySelector('main');

// The choice of the user, or null to follow the phone.
export let chosen = storage ? loadLanguage(storage, LANGUAGES) : null;
export let lang = resolveLanguage(navigator.languages, chosen);
export let t = translator(lang);
// The choice for the text of the cards, a language or `app`, and the language that it gives (I18N-7).
export let cardChoice = storage ? loadCardLanguage(storage, LANGUAGES) : 'en';
export let cardLang = resolveCardLanguage(cardChoice, lang);
// The hand that holds the phone: `left` mirrors the controls, in styles.css.
export let hand = storage ? loadHand(storage) : 'right';
document.documentElement.dataset.hand = hand;

// The colours: `light` or `dark` override the phone, in styles.css; `system` follows it.
export let theme = storage ? loadTheme(storage) : 'system';
document.documentElement.dataset.theme = theme;

// The colours of the code of a snippet (SET-3), in styles.css.
export let codeTheme = storage ? loadCodeTheme(storage) : 'auto';
document.documentElement.dataset.codeTheme = codeTheme;

// The modules that the user turned off (MOD-2).
export let off = storage ? loadModules(storage) : [];
export const isOn = (id) => !off.includes(id);
export let navMotion = false;

// The topics that the user turned off (FEED-14), by pack id.
export let topicsOff = storage ? loadTopics(storage) : [];

// The text of a message of a pure module.
export const textOf = ({ key, params }) => t(key, params);

// Read before the doc. A stored doc, valid or not, means that the install is not new.
export const firstStart = storage ? shouldShow({ seen: loadOnboarded(storage), hasState: hasStoredDoc(storage, FEED_KEY) }) : false;

const DOC = { key: FEED_KEY, normalize: normalizeLearning, empty: emptyLearning };
export let state = storage ? loadDoc(storage, DOC) : emptyLearning();

// The cards of the packs of content/, or null until they load (FEED-6).
export let pool = null;

export const ui = {
  // The section in view.
  view: 'feed',
  // The cards of the feed in this start, in their order: { id, reason } (FEED-7).
  feed: [],
  // The ids that counted as seen in this start, so that a card counts once (FEED-8).
  seen: new Set(),
  // The ids that came into the feed as due in this start. Show seen cards again keeps them (FEED-18).
  dueIds: new Set(),
  // The ids that show the gesture hint on a first start: the first two cards that came into the feed. Never cleared (FEED-19).
  hinted: new Set(),
  // What the user did to a card in this start, by id: the quiz answer { choice, correct }, the
  // review grade (true for Remembered) and I knew this.
  answers: {},
  graded: {},
  knew: {},
  // True once the feed reached its end, and once it shows the seen cards again (FEED-4).
  ended: false,
  again: false,
  // True when the packs could not be read.
  loadError: false,
  // The card whose sheet of signals is open, or null.
  sheetCard: null,
  // True while the walkthrough is open.
  onboarding: firstStart,
  // `running` is the version of the cached shell; `latest` is the deployed one.
  version: { running: null, latest: null, checking: false },
  // The install offer: `idle`, `available` or `installed` (INS-1).
  install: 'idle',
  // True once the update toast showed in this start (VER-18).
  updateOffered: false,
};

let toastTimer = null;
// The button of the toast: { label, run }, or null.
export let toastAction = null;

// `undo` is the doc to go back to; `action` is { label, run } for any other button.
export const showToast = (text, { undo = null, action = null, ms = undo || action ? UNDO_MS : MESSAGE_MS } = {}) => {
  clearTimeout(toastTimer);
  toastAction = undo ? { label: t('toast.undo'), run: () => commit(undo) } : action;
  $('toast-text').textContent = text;
  $('toast-action').textContent = toastAction?.label ?? '';
  $('toast-action').hidden = !toastAction;
  $('toast').hidden = false;
  toastTimer = setTimeout(hideToast, ms);
};

export const hideToast = () => {
  clearTimeout(toastTimer);
  toastAction = null;
  $('toast').hidden = true;
};

// The render of the whole screen. app.js registers it, so that a view renders without importing app.js.
let renderer = () => {};
export const setRender = (fn) => {
  renderer = fn;
};
export const render = () => renderer();

export const commit = (next) => {
  state = next;
  const saved = storage !== null && saveDoc(storage, FEED_KEY, state);
  render();
  return saved;
};

// Applies a pure operation. `undoText` makes the change reversible for a few seconds.
export const apply = (result, { undoText = null } = {}) => {
  if (result.error) {
    showToast(textOf(result.error));
    return false;
  }
  const previous = state;
  const saved = commit(result.state);
  if (!saved) showToast(t('error.notSaved'));
  else if (undoText) showToast(undoText, { undo: previous });
  else hideToast();
  return true;
};

// The click that follows a drag, a drop or a slide must not press the button below the finger.
export let clickGuardUntil = 0;
export const guardClick = () => {
  clickGuardUntil = Date.now() + CLICK_GUARD_MS;
};

export const setPool = (next) => {
  pool = next;
};

// With no storage a choice lasts until the app closes.
export const setLanguage = (code) => {
  chosen = code;
  if (storage) saveLanguage(storage, chosen);
  lang = resolveLanguage(navigator.languages, chosen);
  t = translator(lang);
  cardLang = resolveCardLanguage(cardChoice, lang);
};

export const setCardLanguage = (choice) => {
  cardChoice = choice === 'app' || LANGUAGES.includes(choice) ? choice : 'en';
  if (storage) saveCardLanguage(storage, cardChoice);
  cardLang = resolveCardLanguage(cardChoice, lang);
};

export const setHand = (value) => {
  hand = value === 'left' ? 'left' : 'right';
  if (storage) saveHand(storage, hand);
  document.documentElement.dataset.hand = hand;
};

export const setTheme = (value) => {
  theme = ['light', 'dark'].includes(value) ? value : 'system';
  if (storage) saveTheme(storage, theme);
  document.documentElement.dataset.theme = theme;
};

export const setCodeTheme = (value) => {
  codeTheme = CODE_THEMES.includes(value) ? value : 'auto';
  if (storage) saveCodeTheme(storage, codeTheme);
  document.documentElement.dataset.codeTheme = codeTheme;
};

export const setModules = (next) => {
  off = next;
  if (storage) saveModules(storage, off);
};

export const setTopics = (next) => {
  topicsOff = next;
  if (storage) saveTopics(storage, topicsOff);
};

// Set by a switch of Modules, so that the render that follows animates the navigation (MOD-3).
export const setNavMotion = (on) => {
  navMotion = on;
};
