import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATALOGS } from '#i18n';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const body = html.slice(html.indexOf('<body'), html.indexOf('<script type="importmap">'));

const textKeys = [...body.matchAll(/data-i18n="([^"]+)"/g)].map(([, key]) => key);
const attrKeys = [...body.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap(([, pairs]) =>
  pairs.split(',').map((pair) => pair.split(':')[1]));

test('the page has translated text and translated attributes', () => {
  assert.ok(textKeys.length > 0);
  assert.ok(attrKeys.length > 0);
});

test('each key of the page is in the Spanish catalog', () => {
  for (const key of [...textKeys, ...attrKeys]) assert.ok(Object.hasOwn(CATALOGS.es, key), key);
});

test('an element with a text key is empty in the markup', () => {
  for (const [, key, text] of body.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) assert.equal(text.trim(), '', key);
});

test('the markup has no text of its own', () => {
  const visible = body
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<span class="chevron"[^>]*>[^<]*<\/span>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[+\s]/g, '');
  assert.equal(visible, '');
  assert.doesNotMatch(body, /\s(aria-label|placeholder|title)="/);
});

test('the Feed has its list, the mark of its end, and its end and error states (FEED-7, FEED-4)', () => {
  const [section = ''] = body.match(/<section id="feed" class="feed">[\s\S]*?<\/section>/) ?? [];
  assert.match(section, /<ol id="feed-list" class="feed-list"><\/ol>\s*<div id="feed-more" class="feed-more"><\/div>/);
  assert.match(section, /<div id="feed-end" class="empty-state" hidden>[\s\S]*<button id="feed-again" class="button primary"/);
  assert.match(section, /<div id="feed-error" class="empty-state" hidden>[\s\S]*<button id="feed-retry" class="button primary"/);
});

test('the Feed has the side column with its four panels (FEED-18)', () => {
  const [side = ''] = body.match(/<aside id="feed-side" class="feed-side-col">[\s\S]*?<\/aside>/) ?? [];
  assert.match(side, /^<aside id="feed-side" class="feed-side-col">\s*<div id="feed-panels" class="feed-panels" hidden>/);
  const panels = [...side.matchAll(/<section id="([^"]+)" class="feed-panel">/g)].map(([, id]) => id);
  assert.deepEqual(panels, ['panel-today', 'panel-bars', 'panel-states', 'panel-topics']);
  assert.match(side, /<div id="today-progress" class="progress data" role="progressbar" aria-valuemin="0" aria-labelledby="today-title today-count"><\/div>/);
  assert.match(side, /<ol id="due-bars" class="due-bars"><\/ol>/);
  assert.match(side, /<ol id="topic-ledger" class="topic-ledger"><\/ol>/);
  assert.equal([...body.matchAll(/id="feed-panels"/g)].length, 1);
});

test('Saved has its list and an empty state that goes to the feed (FEED-13)', () => {
  const [section = ''] = body.match(/<section id="saved" class="feed" hidden>[\s\S]*?<\/section>/) ?? [];
  assert.match(section, /<ol id="saved-list" class="feed-list"><\/ol>/);
  assert.match(section, /<div id="saved-empty" class="empty-state" hidden>[\s\S]*<button id="saved-feed" class="button primary"/);
});

test('the card sheet has a veil, a dialog with its title and Close, and one entry for each other signal (FEED-11)', () => {
  const [layer = ''] = body.match(/<div id="card-sheet" class="sheet-layer"[\s\S]*?<\/section>\s*<\/div>/) ?? [];
  assert.match(layer, /<div id="card-veil" class="sheet-veil">/);
  assert.match(layer, /<section id="card-menu" class="sheet" role="dialog" aria-modal="true" aria-labelledby="card-sheet-title">/);
  assert.match(layer, /<header class="sheet-head"><h2 id="card-sheet-title" class="sheet-title main" data-i18n="card.sheetTitle"><\/h2><button id="card-close" class="button tonal" type="button" data-i18n="card.close"><\/button><\/header>/);
  const signals = [...layer.matchAll(/<button class="entry" type="button" data-signal="(\w+)">/g)].map(([, kind]) => kind);
  assert.deepEqual(signals, ['hard', 'skip', 'report']);
});

test('the walkthrough is one page: the logo, the title, the text, the topic tiles, then Start and How review works (ONB-2)', () => {
  const [layer = ''] = body.match(/<div id="onboarding" [\s\S]*?<section id="auth"/) ?? [];
  assert.match(layer, /^<div id="onboarding" class="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" hidden>/);
  const parts = [...layer.matchAll(/<(img|h2|p|div|button) (?:id="([^"]+)" )?class="([^"]+)"/g)].map(([, tag, id, name]) => id ?? `${tag}.${name}`);
  assert.deepEqual(parts, [
    'onboarding',
    'div.onboarding-page',
    'img.onboarding-logo',
    'onboarding-title',
    'p.onboarding-text',
    'onboarding-topics',
    'onboarding-sample',
    'div.onboarding-bar',
    'onboarding-start',
    'onboarding-how',
  ]);
  assert.match(layer, /<img class="onboarding-logo" src="\.\/icons\/logo\.png" alt="">/);
  assert.match(layer, /<h2 id="onboarding-title" class="onboarding-title" data-i18n="onboarding.title"><\/h2>/);
  assert.match(layer, /<p class="onboarding-text" data-i18n="onboarding.text"><\/p>/);
  assert.match(layer, /<div id="onboarding-topics" class="topic-tiles" role="group" aria-labelledby="onboarding-title"><\/div>/);
  assert.match(layer, /<button id="onboarding-start" class="button primary" type="button"><\/button>/);
  assert.match(layer, /<button id="onboarding-how" class="button quiet" type="button" data-i18n="onboarding.how"><\/button>/);
  assert.doesNotMatch(layer, /<svg|onboarding-skip|onboarding-dots|data-page=/);
});

test('the review sheet has a veil, a dialog with its title and Close, and a body (ONB-5)', () => {
  const [layer = ''] = body.match(/<div id="review-sheet" class="sheet-layer[^"]*"[\s\S]*?<\/section>\s*<\/div>/) ?? [];
  assert.match(layer, /<div id="review-veil" class="sheet-veil">/);
  assert.match(layer, /<section id="review" class="sheet" role="dialog" aria-modal="true" aria-labelledby="review-title">/);
  assert.match(layer, /<header class="sheet-head"><h2 id="review-title" class="sheet-title main" data-i18n="review.title"><\/h2><button id="review-close" class="button tonal" type="button" data-i18n="review.close"><\/button><\/header>/);
  assert.match(layer, /<div id="review-body" class="sheet-body review-body"><\/div>/);
  // Aplicación in Settings opens the same sheet, from the row after Show the introduction.
  assert.match(body, /<button id="show-onboarding" class="settings-row" type="button">[\s\S]*?<\/button>\s*<button id="show-review" class="settings-row" type="button"><span class="settings-row-label" data-i18n="settings.review"><\/span><span class="chevron" aria-hidden="true">›<\/span><\/button>/);
});

test('the What\'s new sheet has a veil, a dialog with its title and Close, and a body (VER-22)', () => {
  const [layer = ''] = body.match(/<div id="whatsnew-sheet" class="sheet-layer"[\s\S]*?<\/section>\s*<\/div>/) ?? [];
  assert.match(layer, /<div id="whatsnew-veil" class="sheet-veil">/);
  assert.match(layer, /<section id="whatsnew" class="sheet" role="dialog" aria-modal="true" aria-labelledby="whatsnew-title">/);
  assert.match(layer, /<h2 id="whatsnew-title" class="sheet-title main" data-i18n="whatsNew.title"><\/h2><button id="whatsnew-close" class="button tonal" type="button" data-i18n="whatsNew.close"><\/button>/);
  assert.match(layer, /<div id="whatsnew-body" class="sheet-body whatsnew-body"><\/div>/);
});

test('Aplicación in Settings has the What\'s new row, hidden until there are notes (VER-23)', () => {
  assert.match(body, /<button id="show-whatsnew" class="settings-row" type="button" hidden><span class="settings-row-label" data-i18n="settings.whatsNew"><\/span><span class="chevron" aria-hidden="true">›<\/span><\/button>/);
});

test('the account screens cover the app: Sign in with Google or offline, and Waiting for approval (ACC-2)', () => {
  const [layer = ''] = body.match(/<section id="auth" class="account" role="dialog" aria-modal="true"[\s\S]*?<\/section>/) ?? [];
  assert.match(layer, /<div id="login" class="account-page">/);
  const order = ['account-logo', 'id="login-title"', 'account.login.text', 'id="login-facts"', 'id="login-offline"', 'id="login-google"', 'id="login-error"', 'account.login.fine', 'id="login-sample"'];
  const at = order.map((mark) => layer.indexOf(mark));
  assert.ok(at.every((index) => index >= 0), 'every part is there');
  assert.deepEqual(at, [...at].sort((a, b) => a - b));
  assert.match(layer, /<h2 id="login-title" class="account-title" tabindex="-1" data-i18n="account.login.title">/);
  assert.match(layer, /<dl id="login-facts" class="account-facts" hidden>/);
  assert.match(layer, /<button id="login-offline" class="button primary wide" type="button" data-i18n="account.offline"><\/button>/);
  assert.match(layer, /<button id="login-google" class="button tonal wide" type="button"><svg class="icon small" aria-hidden="true"><use href="icons.svg#google"\/><\/svg>/);
  assert.match(layer, /<p id="login-error" class="input-help danger" role="alert" hidden><\/p>/);
  assert.match(layer, /<div id="login-sample" class="account-sample" hidden><\/div>/);
  assert.match(layer, /<div id="waiting" class="account-page" hidden>/);
  assert.match(layer, /<h2 id="waiting-title" class="account-title" tabindex="-1" data-i18n="account.waiting.title">/);
  const buttons = [...layer.matchAll(/<button id="(waiting-[^"]+)"/g)].map(([, id]) => id);
  assert.deepEqual(buttons, ['waiting-check', 'waiting-logout']);
});

test('Settings has its groups in order: Temas, Preferencias, Cuenta y copia, Aplicación, Borrar (SET-1)', () => {
  const [settings = ''] = body.match(/<section id="settings"[\s\S]*?<\/main>/) ?? [];
  const heads = [...settings.matchAll(/<h2 class="list-group-head" data-i18n="([^"]+)">/g)].map(([, key]) => key);
  assert.deepEqual(heads, ['settings.topics', 'settings.preferences', 'settings.accountBackup', 'settings.app', 'settings.erase']);
  assert.match(settings, /data-i18n="settings.preferencesNote"/);
  assert.match(settings, /data-i18n="settings.eraseNote"/);
  assert.match(settings, /<p id="topics-note" class="settings-note">/);
  // The ids that go with each group, in order.
  const order = ['id="topics"', 'id="language"', 'id="card-language"', 'id="hand"', 'id="theme"', 'data-module="saved"', 'id="account-group"', 'id="export"', 'id="import"', 'id="install-group"', 'id="show-onboarding"', 'id="show-review"', 'id="show-whatsnew"', 'class="about"', 'id="reset"'];
  const at = order.map((mark) => settings.indexOf(mark));
  assert.ok(at.every((index) => index >= 0), 'every part is there');
  assert.deepEqual(at, [...at].sort((a, b) => a - b));
  assert.doesNotMatch(settings, /settings\.(modules|backup|help)\b/);
});

test('Preferencias ends with the switch of Saved (MOD-1)', () => {
  assert.match(body, /<label class="switch"><span data-i18n="settings.savedInNav"><\/span><input class="switch-input" type="checkbox" role="switch" data-module="saved"><\/label>\s*<\/div>/);
});

test('Settings has the account rows in Cuenta y copia: the email and Log out, or Sign in with Google (ACC-8)', () => {
  const [group = ''] = body.match(/<div id="account-group" class="list-group" hidden>[\s\S]*?<\/div>\s*<\/div>/) ?? [];
  assert.match(group, /<span id="account-email" class="settings-row-label"><\/span>/);
  assert.match(group, /<div id="account-row" class="settings-row"><span id="account-email" class="settings-row-label"><\/span><\/div>/);
  assert.match(group, /<button id="logout" class="settings-row" type="button">/);
  assert.match(group, /<button id="account-login" class="settings-row" type="button"><span class="settings-row-label" data-i18n="account.signIn"><\/span>/);
});

test('Install is hidden until it is available, in Aplicación (INS-2)', () => {
  assert.match(body, /<div id="install-group" class="list-group" hidden>\s*<button id="install" class="settings-row" type="button">/);
});

test('Borrar holds only Delete all data, a danger row with no chevron, last (SET-2)', () => {
  assert.match(body, /<h2 class="list-group-head" data-i18n="settings.erase"><\/h2>[\s\S]*?<div class="list-group">\s*<button id="reset" class="settings-row danger" type="button"><span class="settings-row-label" data-i18n="settings.reset"><\/span><\/button>\s*<\/div>/);
  assert.equal(body.match(/<section id="settings"[\s\S]*?<\/main>/)[0].match(/id="reset"/g).length, 1);
  assert.ok(body.indexOf('id="reset"') > body.indexOf('id="show-whatsnew"'));
});
