import { normalizeLearning } from '#learning';
import { exportJson, exportFilename, importJson, resetAll } from '#storage';
import { LANGUAGES, LANGUAGE_NAMES } from '#i18n';
import { switchModule } from '#modules';
import {
  $,
  el,
  state,
  storage,
  t,
  lang,
  chosen,
  cardChoice,
  hand,
  theme,
  off,
  isOn,
  textOf,
  showToast,
  apply,
  render,
  setLanguage,
  setCardLanguage,
  setHand,
  setTheme,
  setModules,
  setNavMotion,
} from '#ui/context';
import { runUpdate } from '#ui/update';
import { chooseTopic, topicStates, localizePool } from '#ui/feed';
import { signedIn } from '#ui/account';

// The value of a row of Preferences is the text of the option that its select has.
const renderValues = () => {
  for (const id of ['language', 'card-language', 'hand', 'theme']) {
    $(`${id}-value`).textContent = $(id).selectedOptions[0]?.textContent ?? '';
  }
};

// Writes the fixed text of the page, then the text that a render builds.
export const applyLanguage = () => {
  document.documentElement.lang = lang;
  document.title = t('app.title');
  // The worker answers the manifest in this language (SW-13).
  const text = { type: 'manifest', lang, name: t('app.title'), description: t('app.description') };
  navigator.serviceWorker?.ready.then((registration) => registration.active?.postMessage(text)).catch(() => {});
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((node) => {
    node.dataset.i18nAttr.split(',').forEach((pair) => {
      const [name, key] = pair.split(':');
      node.setAttribute(name, t(key));
    });
  });
  const option = (value, text) => el('option', { value, textContent: text, selected: value === (chosen ?? '') });
  $('language').replaceChildren(
    option('', t('settings.automatic')),
    ...LANGUAGES.map((code) => option(code, LANGUAGE_NAMES[code])),
  );
  const cardOption = (value, text) => el('option', { value, textContent: text, selected: value === cardChoice });
  $('card-language').replaceChildren(
    cardOption('app', t('settings.cardLanguageApp')),
    ...LANGUAGES.map((code) => cardOption(code, LANGUAGE_NAMES[code])),
  );
  const handOption = (value, key) => el('option', { value, textContent: t(key), selected: value === hand });
  $('hand').replaceChildren(handOption('right', 'settings.handRight'), handOption('left', 'settings.handLeft'));
  const themeOption = (value, key) => el('option', { value, textContent: t(key), selected: value === theme });
  $('theme').replaceChildren(
    themeOption('system', 'settings.automatic'),
    themeOption('light', 'settings.themeLight'),
    themeOption('dark', 'settings.themeDark'),
  );
  document.querySelectorAll('[data-module]').forEach((box) => {
    box.checked = isOn(box.dataset.module);
  });
  renderValues();
  render();
};

// The Topics group (FEED-15): one switch for each pack, once the packs load. A switch node stays
// while the topics stay, so the focus stays on the switch that was pressed.
export const renderTopics = () => {
  const topics = topicStates();
  $('topics').closest('.settings-group').hidden = !topics.length;
  const shown = topics.filter(({ on }) => on);
  $('topics-note').textContent = t('settings.topicsNote', {
    on: shown.length,
    total: topics.length,
    count: shown.reduce((sum, { count }) => sum + count, 0),
  });
  const list = $('topics');
  if (list.dataset.ids !== topics.map(({ id }) => id).join()) {
    list.dataset.ids = topics.map(({ id }) => id).join();
    list.replaceChildren(
      ...topics.map(({ id }) => {
        const box = el('input', { className: 'switch-input', type: 'checkbox', onchange: (event) => chooseTopic(id, event.target.checked) });
        box.setAttribute('role', 'switch');
        const name = el('span', { className: 'switch-title' }, [el('span'), el('span', { className: 'switch-meta' })]);
        return el('label', { className: 'switch' }, [name, box]);
      }),
    );
  }
  // A title follows the card language (I18N-7).
  [...list.querySelectorAll('.switch')].forEach((label, index) => {
    Object.assign(label.querySelector('.switch-title').firstElementChild, { textContent: topics[index].title, lang: topics[index].lang });
    label.querySelector('.switch-meta').textContent = t('onboarding.count', { count: topics[index].count });
  });
  [...list.querySelectorAll('.switch-input')].forEach((box, index) => {
    box.checked = topics[index].on;
    box.disabled = topics[index].last;
  });
};

const download = (filename, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  el('a', { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const bind = () => {
  $('export').addEventListener('click', () => {
    download(exportFilename(new Date()), exportJson(state));
  });
  $('import').addEventListener('click', () => $('import-file').click());
  // SET-2: the app starts again as a new install, with the walkthrough. With no storage the data is
  // only in memory, so the reload alone clears it. The session key goes too, so a signed-in device
  // opens Sign in.
  $('reset').addEventListener('click', () => {
    if (!window.confirm(t(signedIn() ? 'reset.confirmLocal' : 'reset.confirm'))) return;
    if (storage && !resetAll(storage)) {
      showToast(t('error.resetFailed'));
      return;
    }
    location.reload();
  });
  $('language').addEventListener('change', (event) => {
    setLanguage(event.target.value || null);
    localizePool();
    applyLanguage();
  });
  // The cards take the new language in place; the feed keeps them and their order.
  $('card-language').addEventListener('change', (event) => {
    setCardLanguage(event.target.value);
    localizePool();
    applyLanguage();
  });
  $('hand').addEventListener('change', (event) => setHand(event.target.value));
  $('theme').addEventListener('change', (event) => setTheme(event.target.value));
  for (const id of ['hand', 'theme']) $(id).addEventListener('change', renderValues);
  document.querySelectorAll('[data-module]').forEach((box) => {
    box.addEventListener('change', () => {
      setModules(switchModule(off, box.dataset.module, box.checked));
      setNavMotion(true);
      render();
      setNavMotion(false);
    });
  });
  $('update').addEventListener('click', () => runUpdate($('update')));
  $('import-file').addEventListener('change', async (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    const result = importJson(await file.text(), normalizeLearning);
    if (result.error) {
      showToast(textOf(result.error));
      return;
    }
    const summary = t('learning.count', { count: Object.keys(result.state.records).length });
    if (!window.confirm(t('import.confirm', { summary }))) return;
    apply(result, { undoText: t('toast.imported') });
  });
};
