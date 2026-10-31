import { textParts } from '#onboarding';
import { saveOnboarded } from '#storage';
import { bindSheetDrag } from '#ds/sheet';
import { $, el, storage, pool, ui, t, lang } from '#ui/context';
import { icon } from '#ui/controls';
import { cardNode } from '#ui/card';
import { chooseTopic, topicStates } from '#ui/feed';

// The tiles of the topics (ONB-4). A tile node stays while the topics stay, so the focus stays on
// the tile that was pressed.
const renderTiles = (topics) => {
  const list = $('onboarding-topics');
  const ids = topics.map(({ id }) => id).join();
  if (list.dataset.ids !== ids) {
    list.dataset.ids = ids;
    list.replaceChildren(
      ...topics.map(({ id, title }) => {
        const tile = el('button', { type: 'button', className: 'topic-tile' }, [
          el('span', { className: 'topic-tile-check' }, [icon('check', 'small')]),
          el('span', { className: 'topic-tile-title', textContent: title, lang: 'en' }),
          el('span', { className: 'topic-tile-count' }),
        ]);
        tile.addEventListener('click', () => chooseTopic(id, tile.getAttribute('aria-pressed') !== 'true'));
        return tile;
      }),
    );
  }
  [...list.children].forEach((tile, index) => {
    const { on, last, count } = topics[index];
    tile.setAttribute('aria-pressed', String(on));
    tile.disabled = last;
    tile.querySelector('.topic-tile-count').textContent = t('onboarding.count', { count });
  });
};

// The sample: the first card of the first topic that is on, inert. It stays while that card and
// the language stay.
const renderSample = (topics) => {
  const sample = $('onboarding-sample');
  const topic = topics.find(({ on }) => on);
  const card = topic && pool.cards.find((item) => item.topic === topic.id && !item.retired);
  sample.hidden = !card;
  const key = card && `${lang}:${card.id}`;
  if (!card || sample.dataset.card === key) return;
  sample.dataset.card = key;
  sample.replaceChildren(el('ul', { className: 'onboarding-sample-list' }, [cardNode(card, null, { preview: true })]));
};

export const renderOnboarding = () => {
  const open = ui.onboarding;
  $('onboarding').hidden = !open;
  // The walkthrough covers the app: no tap, no slide and no focus goes below it.
  document.querySelectorAll('.app-header, main, .fab, .nav-bar').forEach((node) => {
    node.inert = open;
  });
  if (!open) return;
  const topics = topicStates();
  renderTiles(topics);
  renderSample(topics);
  const count = topics.filter(({ on }) => on).reduce((sum, topic) => sum + topic.count, 0);
  // With no packs yet there is no count to show (ONB-4).
  $('onboarding-start').textContent = pool && topics.length ? t('onboarding.start', { count }) : t('onboarding.startPlain');
};

const openOnboarding = () => {
  ui.onboarding = true;
  renderOnboarding();
  $('onboarding-start').focus();
};

// A close marks the walkthrough as seen and keeps the topics it has on. With no storage it shows
// only from Settings.
export const closeOnboarding = () => {
  ui.onboarding = false;
  if (storage) saveOnboarded(storage);
  renderOnboarding();
  if (ui.view === 'settings') $('show-onboarding').focus();
};

// A part of a text of the review sheet, with its **bold** text.
const textPart = ({ text, key, strong }) => {
  const node = key ? el('span', { className: 'onboarding-key' }, [text]) : text;
  return strong ? el('strong', {}, [node]) : node;
};

// The review sheet (ONB-5), over the walkthrough or over Settings.
export const openReview = () => {
  $('review-body').replaceChildren(
    ...['review.when', 'review.grades'].map((key) => el('p', { className: 'review-text' }, textParts(t(key)).map(textPart))),
  );
  $('review-sheet').hidden = false;
  // The walkthrough below takes no tap and no focus while the sheet is open.
  $('onboarding').inert = true;
  $('review-close').focus();
};

export const isReviewOpen = () => !$('review-sheet').hidden;

export const closeReview = () => {
  $('review-sheet').hidden = true;
  $('onboarding').inert = false;
  if (ui.onboarding) $('onboarding-how').focus();
  else if (ui.view === 'settings') $('show-review').focus();
};

export const bind = () => {
  $('onboarding-start').addEventListener('click', closeOnboarding);
  $('onboarding-how').addEventListener('click', openReview);
  $('show-onboarding').addEventListener('click', openOnboarding);
  $('show-review').addEventListener('click', openReview);
  $('review-veil').addEventListener('click', closeReview);
  $('review-close').addEventListener('click', closeReview);
  bindSheetDrag($('review-sheet'), { close: closeReview });
};
