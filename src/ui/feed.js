import { normalizePack, buildPool } from '#cards';
import { nextCards, seenAgain, dueCount } from '#feed';
import { markSeen, isUpdated } from '#learning';
import { $, ui, state, pool, lang, t, scroller, setPool, commit, render } from '#ui/context';
import { cardOf, cardNode } from '#ui/card';

// The Feed section: the packs, the cards that come in as the user scrolls, and the seen ones
// (FEED-6 to FEED-8).
const BATCH = 5;
// How far below the screen the end of the list is when the next cards come in.
const AHEAD = 600;
// A card counts as seen when 60% of it, or 60% of the height of the screen, is in view.
const SEEN = 0.6;

const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  return response.json();
};

// A pack that cannot be read is left out; an index that cannot be read is an error.
export const loadPool = async () => {
  ui.loadError = false;
  render();
  try {
    const { packs } = await getJson('./content/index.json');
    const read = (id) => getJson(`./content/${id}.json`).then((data) => normalizePack(data).pack, () => null);
    setPool(buildPool((await Promise.all(packs.map(read))).filter(Boolean)));
  } catch {
    ui.loadError = true;
  }
  fill();
};

const nearEnd = () => $('feed-more').getBoundingClientRect().top < scroller.getBoundingClientRect().bottom + AHEAD;

// Adds the next cards, and goes on while the end of the list is still near the screen.
const fill = () => {
  if (!pool) {
    render();
    return;
  }
  const exclude = ui.feed.map((entry) => entry.id);
  const entries = ui.again
    ? seenAgain(pool, state, { exclude, count: BATCH })
    : nextCards(pool, state, { now: Date.now(), random: Math.random, exclude, count: BATCH });
  ui.feed.push(...entries.map(({ card, reason }) => ({ id: card.id, reason, updated: isUpdated(state.records[card.id], card) })));
  ui.ended = entries.length < BATCH;
  render();
  requestAnimationFrame(() => {
    if (!ui.ended && ui.view === 'feed' && nearEnd()) fill();
  });
};

const seenObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const enough = entry.intersectionRatio >= SEEN || entry.intersectionRect.height >= SEEN * (entry.rootBounds?.height ?? Infinity);
      if (!entry.isIntersecting || !enough) continue;
      const { id } = entry.target.dataset;
      seenObserver.unobserve(entry.target);
      const card = cardOf(id);
      if (ui.seen.has(id) || !card) continue;
      ui.seen.add(id);
      commit(markSeen(state, card, Date.now()).state);
    }
  },
  { root: scroller, threshold: [0, 0.25, 0.5, SEEN, 0.8, 1] },
);

// A node of a card stays while what it shows does not change, so a seen card is not built again.
const nodes = new Map();

const keyOf = (id) => {
  const record = state.records[id];
  return JSON.stringify([lang, record?.liked, record?.saved, record?.box, ui.answers[id], ui.graded[id], ui.knew[id]]);
};

const nodeFor = (entry, card) => {
  const key = keyOf(card.id);
  const cached = nodes.get(card.id);
  if (cached?.key === key) return cached.node;
  const node = cardNode(card, entry);
  nodes.set(card.id, { key, node });
  if (!ui.seen.has(card.id)) seenObserver.observe(node);
  return node;
};

export const renderFeed = () => {
  $('feed').hidden = ui.view !== 'feed';
  const list = $('feed-list');
  const cards = (pool ? ui.feed : [])
    .map((entry) => ({ entry, card: cardOf(entry.id) }))
    .filter(({ card }) => card && !state.records[card.id]?.suspended);
  // The action that has the focus keeps it in the new node of its card.
  const focused = document.activeElement?.closest('.feed-card') ? document.activeElement : null;
  const keep = cards.map(({ entry, card }) => nodeFor(entry, card));
  [...list.children].forEach((child) => {
    if (!keep.includes(child)) child.remove();
  });
  keep.forEach((node, index) => {
    if (list.children[index] !== node) list.insertBefore(node, list.children[index] ?? null);
  });
  if (focused && !focused.isConnected) {
    const id = focused.closest('.feed-card').dataset.id;
    list.querySelector(`.feed-card[data-id="${id}"] [data-action="${focused.dataset.action}"]`)?.focus();
  }
  $('feed-end').hidden = !(pool && ui.ended);
  $('feed-end-text').textContent = t(ui.again ? 'feed.endAgain' : 'feed.end');
  $('feed-again').hidden = ui.again;
  $('feed-error').hidden = !ui.loadError;
};

// The line under the title: the cards to review now, or nothing.
export const dueText = () => {
  const count = pool ? dueCount(pool, state, Date.now()) : 0;
  return count ? t('feed.due', { count }) : '';
};

export const bind = () => {
  new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && pool && !ui.ended && ui.view === 'feed') fill();
    },
    { root: scroller, rootMargin: `0px 0px ${AHEAD}px 0px` },
  ).observe($('feed-more'));
  // Every card is in the list at the end, so the seen cards start the list again from the top.
  $('feed-again').addEventListener('click', () => {
    Object.assign(ui, { again: true, ended: false, feed: [] });
    scroller.scrollTop = 0;
    fill();
  });
  $('feed-retry').addEventListener('click', loadPool);
};
