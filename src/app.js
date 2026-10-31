import { $, ui, storage, t, setRender, showToast, hideToast, toastAction, clickGuardUntil } from '#ui/context';
import { bind as bindNav, renderNav } from '#ui/nav';
import { bind as bindFeed, renderFeed, loadPool, subline } from '#ui/feed';
import { bind as bindSaved, renderSaved } from '#ui/saved';
import { bind as bindCard, renderCardSheet, closeCardSheet } from '#ui/card';
import { bind as bindSettings, applyLanguage, renderTopics } from '#ui/settings';
import { bind as bindInstall, renderInstall } from '#ui/install';
import { readVersion, renderVersion, offerUpdate } from '#ui/update';
import { bind as bindOnboarding, renderOnboarding, closeOnboarding, isReviewOpen, closeReview } from '#ui/onboarding';
import { bind as bindWhatsNew, startWhatsNew, isWhatsNewOpen, closeWhatsNew } from '#ui/whatsnew';
import { bind as bindAccount, renderAccount, startAccount, goOnline, isAccountOpen, closeAccount } from '#ui/account';
import { readOAuthReturn } from '#session';

// The return of the Google sign-in (ACC-4): `code`, `state` and `error` leave the URL at once.
const { oauth, clean } = readOAuthReturn(new URL(location.href));
if (oauth) history.replaceState(history.state, '', clean);

const renderAll = () => {
  renderNav();
  $('title').textContent = t(`nav.${ui.view}`);
  $('subtitle').textContent = ui.view === 'feed' ? subline() : '';
  renderFeed();
  renderSaved();
  renderCardSheet();
  $('settings').hidden = ui.view !== 'settings';
  renderTopics();
  renderOnboarding();
  renderVersion();
  renderInstall();
  renderAccount();
};
setRender(renderAll);

bindNav();
bindFeed();
bindSaved();
bindCard();
bindSettings();
bindInstall();
bindOnboarding();
bindWhatsNew();
bindAccount();

document.addEventListener(
  'click',
  (event) => {
    if (Date.now() >= clickGuardUntil) return;
    event.preventDefault();
    event.stopPropagation();
  },
  true,
);

document.addEventListener('keydown', (event) => {
  // The account screens cover the app, the walkthrough too. Only Sign in over an open app closes (ACC-2).
  if (isAccountOpen()) {
    if (event.key === 'Escape') closeAccount();
    return;
  }
  if (event.key !== 'Escape') return;
  // The review sheet sits over the walkthrough, and the walkthrough over the app (ONB-2, ONB-5).
  if (isReviewOpen()) {
    closeReview();
    return;
  }
  if (ui.onboarding) {
    closeOnboarding();
    return;
  }
  if (isWhatsNewOpen()) {
    closeWhatsNew();
    return;
  }
  if (ui.sheetCard !== null) closeCardSheet();
});

$('toast-action').addEventListener('click', () => {
  const action = toastAction;
  hideToast();
  action?.run();
});

applyLanguage();
loadPool();
if (ui.onboarding) $('onboarding-start').focus();
startAccount(oauth);
window.addEventListener('online', goOnline);
if (!storage) showToast(t('error.noStorage'));
navigator.storage?.persist?.().catch(() => {});
navigator.serviceWorker?.register('./sw.js').catch(() => {});
// Read once at the start: the worker answers from the cache, then stores the file of the next deploy.
readVersion('./version.json').then((running) => {
  ui.version.running = running;
  renderVersion();
  startWhatsNew(running);
  navigator.serviceWorker?.ready.then(offerUpdate).catch(() => {});
});
