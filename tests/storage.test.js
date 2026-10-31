import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_SLUG } from '#config';
import {
  keyOf,
  loadDoc,
  saveDoc,
  exportJson,
  exportFilename,
  importJson,
  hasStoredDoc,
  LANGUAGE_KEY,
  loadLanguage,
  saveLanguage,
  CARD_LANGUAGE_KEY,
  loadCardLanguage,
  saveCardLanguage,
  HAND_KEY,
  loadHand,
  saveHand,
  THEME_KEY,
  loadTheme,
  saveTheme,
  CODE_THEME_KEY,
  CODE_THEMES,
  loadCodeTheme,
  saveCodeTheme,
  MODULES_KEY,
  loadModules,
  saveModules,
  TOPICS_KEY,
  loadTopics,
  saveTopics,
  ONBOARDED_KEY, SEEN_VERSION_KEY, loadSeen, saveSeen,
  loadOnboarded,
  saveOnboarded,
  resetAll,
} from '#storage';

const fakeStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
};

const brokenStorage = () => ({
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('denied');
  },
});

const KEY = keyOf('doc');
const empty = () => ({ version: 1, items: [] });
const normalize = (data) => (data?.version === 1 && Array.isArray(data.items) ? { version: 1, items: data.items } : null);
const opts = { key: KEY, normalize, empty };

test('every key starts with the slug of the app', () => {
  for (const key of [KEY, LANGUAGE_KEY, HAND_KEY, THEME_KEY, CODE_THEME_KEY, MODULES_KEY, ONBOARDED_KEY, SEEN_VERSION_KEY]) {
    assert.ok(key.startsWith(`${APP_SLUG}.`), key);
  }
});

test('no stored doc loads the empty doc', () => {
  assert.deepEqual(loadDoc(fakeStorage(), opts), empty());
});

test('a stored doc loads normalized', () => {
  const storage = fakeStorage({ [KEY]: JSON.stringify({ version: 1, items: ['a'], extra: 1 }) });
  assert.deepEqual(loadDoc(storage, opts), { version: 1, items: ['a'] });
});

test('a doc that is not valid is kept at <key>.corrupt and the empty doc loads', () => {
  const storage = fakeStorage({ [KEY]: '{"version":9}' });
  assert.deepEqual(loadDoc(storage, opts), empty());
  assert.equal(storage.getItem(`${KEY}.corrupt`), '{"version":9}');
});

test('text that is not JSON is kept at <key>.corrupt', () => {
  const storage = fakeStorage({ [KEY]: 'not json' });
  assert.deepEqual(loadDoc(storage, opts), empty());
  assert.equal(storage.getItem(`${KEY}.corrupt`), 'not json');
});

test('a broken storage loads the empty doc and a save returns false', () => {
  assert.deepEqual(loadDoc(brokenStorage(), opts), empty());
  assert.equal(saveDoc(brokenStorage(), KEY, empty()), false);
  assert.equal(hasStoredDoc(brokenStorage(), KEY), false);
});

test('a saved doc loads back', () => {
  const storage = fakeStorage();
  assert.equal(saveDoc(storage, KEY, { version: 1, items: ['x'] }), true);
  assert.deepEqual(loadDoc(storage, opts), { version: 1, items: ['x'] });
  assert.equal(hasStoredDoc(storage, KEY), true);
});

test('hasStoredDoc is true for a stored text that is not a valid doc, and false for none', () => {
  assert.equal(hasStoredDoc(fakeStorage({ [KEY]: 'x' }), KEY), true);
  assert.equal(hasStoredDoc(fakeStorage(), KEY), false);
});

test('an import of text that is not JSON is an error', () => {
  assert.deepEqual(importJson('{', normalize), { error: { key: 'error.invalidJson' } });
});

test('an import of a file of another app is an error', () => {
  assert.deepEqual(importJson('{"version":5,"items":[],"recipes":[]}', normalize), { error: { key: 'error.notBackup' } });
});

test('an export imports back', () => {
  const doc = { version: 1, items: ['a'] };
  assert.deepEqual(importJson(exportJson(doc), normalize), { state: doc });
});

test('the export file name has the slug, the local date and the time', () => {
  assert.equal(exportFilename(new Date(2026, 0, 2, 3, 4, 5)), `${APP_SLUG}-2026-01-02-030405.json`);
});

test('loadLanguage returns the stored language when it is supported', () => {
  assert.equal(loadLanguage(fakeStorage({ [LANGUAGE_KEY]: 'es' }), ['es', 'en']), 'es');
});

test('loadLanguage returns null for no value and for an unsupported value', () => {
  assert.equal(loadLanguage(fakeStorage(), ['es', 'en']), null);
  assert.equal(loadLanguage(fakeStorage({ [LANGUAGE_KEY]: 'xx' }), ['es', 'en']), null);
  assert.equal(loadLanguage(fakeStorage({ [LANGUAGE_KEY]: '' }), ['es', 'en']), null);
});

test('saveLanguage stores a language and null removes it', () => {
  const storage = fakeStorage();
  assert.equal(saveLanguage(storage, 'en'), true);
  assert.equal(storage.getItem(LANGUAGE_KEY), 'en');
  assert.equal(saveLanguage(storage, null), true);
  assert.equal(storage.getItem(LANGUAGE_KEY), null);
});

test('the language functions do not throw when the storage does', () => {
  assert.equal(loadLanguage(brokenStorage(), ['es']), null);
  assert.equal(saveLanguage(brokenStorage(), 'es'), false);
  assert.equal(saveLanguage(brokenStorage(), null), false);
});

test('loadCardLanguage returns the stored choice, else en (I18N-7)', () => {
  assert.equal(loadCardLanguage(fakeStorage({ [CARD_LANGUAGE_KEY]: 'es' }), ['es', 'en']), 'es');
  assert.equal(loadCardLanguage(fakeStorage({ [CARD_LANGUAGE_KEY]: 'app' }), ['es', 'en']), 'app');
  assert.equal(loadCardLanguage(fakeStorage(), ['es', 'en']), 'en');
  assert.equal(loadCardLanguage(fakeStorage({ [CARD_LANGUAGE_KEY]: 'xx' }), ['es', 'en']), 'en');
});

test('saveCardLanguage stores a choice and en removes the key', () => {
  const storage = fakeStorage();
  assert.equal(saveCardLanguage(storage, 'app'), true);
  assert.equal(storage.getItem(CARD_LANGUAGE_KEY), 'app');
  assert.equal(saveCardLanguage(storage, 'en'), true);
  assert.equal(storage.getItem(CARD_LANGUAGE_KEY), null);
});

test('the card language functions do not throw when the storage does', () => {
  assert.equal(loadCardLanguage(brokenStorage(), ['es']), 'en');
  assert.equal(saveCardLanguage(brokenStorage(), 'es'), false);
});

test('a preference is not part of the stored doc', () => {
  const storage = fakeStorage();
  saveLanguage(storage, 'en');
  saveCardLanguage(storage, 'es');
  saveHand(storage, 'left');
  saveTheme(storage, 'dark');
  saveModules(storage, ['saved']);
  saveTopics(storage, ['git']);
  saveOnboarded(storage);
  assert.deepEqual(loadDoc(storage, opts), empty());
  assert.equal(hasStoredDoc(storage, KEY), false);
});

test('loadHand returns the stored hand', () => {
  assert.equal(loadHand(fakeStorage({ [HAND_KEY]: 'left' })), 'left');
  assert.equal(loadHand(fakeStorage({ [HAND_KEY]: 'right' })), 'right');
});

test('loadHand returns right for no value and for an unknown value', () => {
  assert.equal(loadHand(fakeStorage()), 'right');
  assert.equal(loadHand(fakeStorage({ [HAND_KEY]: 'both' })), 'right');
  assert.equal(loadHand(fakeStorage({ [HAND_KEY]: '' })), 'right');
});

test('saveHand stores left and right removes the key', () => {
  const storage = fakeStorage();
  assert.equal(saveHand(storage, 'left'), true);
  assert.equal(storage.getItem(HAND_KEY), 'left');
  assert.equal(saveHand(storage, 'right'), true);
  assert.equal(storage.getItem(HAND_KEY), null);
});

test('the hand functions do not throw when the storage does', () => {
  assert.equal(loadHand(brokenStorage()), 'right');
  assert.equal(saveHand(brokenStorage(), 'left'), false);
  assert.equal(saveHand(brokenStorage(), 'right'), false);
});

test('loadTheme returns the stored theme', () => {
  assert.equal(loadTheme(fakeStorage({ [THEME_KEY]: 'light' })), 'light');
  assert.equal(loadTheme(fakeStorage({ [THEME_KEY]: 'dark' })), 'dark');
});

test('loadTheme returns system for no value and for an unknown value', () => {
  assert.equal(loadTheme(fakeStorage()), 'system');
  assert.equal(loadTheme(fakeStorage({ [THEME_KEY]: 'blue' })), 'system');
  assert.equal(loadTheme(fakeStorage({ [THEME_KEY]: '' })), 'system');
});

test('saveTheme stores light and dark and system removes the key', () => {
  const storage = fakeStorage();
  assert.equal(saveTheme(storage, 'dark'), true);
  assert.equal(storage.getItem(THEME_KEY), 'dark');
  assert.equal(saveTheme(storage, 'light'), true);
  assert.equal(storage.getItem(THEME_KEY), 'light');
  assert.equal(saveTheme(storage, 'system'), true);
  assert.equal(storage.getItem(THEME_KEY), null);
});

test('saveTheme removes the key for an unknown theme', () => {
  const storage = fakeStorage({ [THEME_KEY]: 'dark' });
  assert.equal(saveTheme(storage, 'blue'), true);
  assert.equal(storage.getItem(THEME_KEY), null);
});

test('loadCodeTheme returns each stored code theme', () => {
  for (const theme of CODE_THEMES) assert.equal(loadCodeTheme(fakeStorage({ [CODE_THEME_KEY]: theme })), theme);
});

test('loadCodeTheme returns auto for no value and for an unknown value', () => {
  assert.equal(loadCodeTheme(fakeStorage()), 'auto');
  assert.equal(loadCodeTheme(fakeStorage({ [CODE_THEME_KEY]: 'blue' })), 'auto');
  assert.equal(loadCodeTheme(fakeStorage({ [CODE_THEME_KEY]: 'auto' })), 'auto');
});

test('saveCodeTheme stores a code theme, and auto or an unknown one removes the key', () => {
  const storage = fakeStorage();
  assert.equal(saveCodeTheme(storage, 'nord'), true);
  assert.equal(storage.getItem(CODE_THEME_KEY), 'nord');
  assert.equal(saveCodeTheme(storage, 'auto'), true);
  assert.equal(storage.getItem(CODE_THEME_KEY), null);
  saveCodeTheme(storage, 'dracula');
  assert.equal(saveCodeTheme(storage, 'blue'), true);
  assert.equal(storage.getItem(CODE_THEME_KEY), null);
});

test('the code theme functions do not throw when the storage does', () => {
  assert.equal(loadCodeTheme(brokenStorage()), 'auto');
  assert.equal(saveCodeTheme(brokenStorage(), 'nord'), false);
});

test('the theme functions do not throw when the storage does', () => {
  assert.equal(loadTheme(brokenStorage()), 'system');
  assert.equal(saveTheme(brokenStorage(), 'dark'), false);
  assert.equal(saveTheme(brokenStorage(), 'system'), false);
});

test('loadModules returns the stored ids that are modules', () => {
  assert.deepEqual(loadModules(fakeStorage({ [MODULES_KEY]: '["saved"]' })), ['saved']);
});

test('loadModules returns no module off for no value, bad JSON, a value that is not a list and unknown ids', () => {
  assert.deepEqual(loadModules(fakeStorage()), []);
  assert.deepEqual(loadModules(fakeStorage({ [MODULES_KEY]: '{' })), []);
  assert.deepEqual(loadModules(fakeStorage({ [MODULES_KEY]: '"saved"' })), []);
  assert.deepEqual(loadModules(fakeStorage({ [MODULES_KEY]: '{"saved":true}' })), []);
  assert.deepEqual(loadModules(fakeStorage({ [MODULES_KEY]: '["shops",1,null]' })), []);
});

test('saveModules stores the known ids and an empty list removes the key', () => {
  const storage = fakeStorage();
  assert.equal(saveModules(storage, ['shops', 'saved']), true);
  assert.equal(storage.getItem(MODULES_KEY), '["saved"]');
  assert.equal(saveModules(storage, []), true);
  assert.equal(storage.getItem(MODULES_KEY), null);
});

test('the module functions do not throw when the storage does', () => {
  assert.deepEqual(loadModules(brokenStorage()), []);
  assert.equal(saveModules(brokenStorage(), ['saved']), false);
  assert.equal(saveModules(brokenStorage(), []), false);
});

test('loadTopics returns the stored topic ids, in their order', () => {
  assert.deepEqual(loadTopics(fakeStorage({ [TOPICS_KEY]: '["http","git"]' })), ['http', 'git']);
});

test('loadTopics returns no topic off for no value, bad JSON, a value that is not a list and bad ids', () => {
  assert.deepEqual(loadTopics(fakeStorage()), []);
  assert.deepEqual(loadTopics(fakeStorage({ [TOPICS_KEY]: '{' })), []);
  assert.deepEqual(loadTopics(fakeStorage({ [TOPICS_KEY]: '"git"' })), []);
  assert.deepEqual(loadTopics(fakeStorage({ [TOPICS_KEY]: '["git",1,null,"Bad id","git"]' })), ['git']);
});

test('saveTopics stores the ids and an empty list removes the key', () => {
  const storage = fakeStorage();
  assert.equal(saveTopics(storage, ['git', 'http']), true);
  assert.equal(storage.getItem(TOPICS_KEY), '["git","http"]');
  assert.equal(saveTopics(storage, []), true);
  assert.equal(storage.getItem(TOPICS_KEY), null);
});

test('the topic functions do not throw when the storage does', () => {
  assert.deepEqual(loadTopics(brokenStorage()), []);
  assert.equal(saveTopics(brokenStorage(), ['git']), false);
});

test('loadOnboarded is true only when the flag is stored', () => {
  assert.equal(loadOnboarded(fakeStorage({ [ONBOARDED_KEY]: '1' })), true);
  assert.equal(loadOnboarded(fakeStorage()), false);
  assert.equal(loadOnboarded(fakeStorage({ [ONBOARDED_KEY]: 'yes' })), false);
});

test('loadOnboarded is true for a storage that throws, so the walkthrough does not show at each start', () => {
  assert.equal(loadOnboarded(brokenStorage()), true);
});

test('saveOnboarded stores the flag, and is false for a storage that throws', () => {
  const storage = fakeStorage();
  assert.equal(saveOnboarded(storage), true);
  assert.equal(storage.getItem(ONBOARDED_KEY), '1');
  assert.equal(saveOnboarded(brokenStorage()), false);
});

test('loadSeen gives the stored version, and null when there is none or the storage throws', () => {
  assert.equal(loadSeen(fakeStorage({ [SEEN_VERSION_KEY]: '1.2.3' })), '1.2.3');
  assert.equal(loadSeen(fakeStorage()), null);
  assert.equal(loadSeen(brokenStorage()), null);
});

test('saveSeen stores the version, and is false for a storage that throws', () => {
  const storage = fakeStorage();
  assert.equal(saveSeen(storage, '1.2.3'), true);
  assert.equal(loadSeen(storage), '1.2.3');
  assert.equal(saveSeen(brokenStorage(), '1.2.3'), false);
});

test('resetAll removes every key of the app, the corrupt copies too, and keeps the keys of other apps (SET-2)', () => {
  const storage = fakeStorage({
    [keyOf('notes')]: '{}',
    [`${keyOf('notes')}.corrupt`]: 'x',
    [keyOf('lang')]: 'es',
    [keyOf('session')]: '{}',
    [keyOf('offline')]: '1',
    'other.notes': 'kept',
    [`${APP_SLUG}x.lang`]: 'kept',
  });
  assert.equal(resetAll(storage), true);
  assert.deepEqual([...Array(storage.length).keys()].map((index) => storage.key(index)).sort(), ['other.notes', `${APP_SLUG}x.lang`]);
});

test('resetAll reports a storage that refuses the removal (SET-2)', () => {
  const storage = { length: 1, key: () => keyOf('lang'), removeItem: () => { throw new Error('denied'); } };
  assert.equal(resetAll(storage), false);
});
