import { normalizePack, buildPool } from '#cards';
import { nextCards, seenAgain, dueBars, newCount, stateCounts, topicLedger, sessionDone, greetingOf, hiddenTopics, switchTopic } from '#feed';
import { markSeen, isUpdated } from '#learning';
import { $, el, ui, state, pool, lang, t, scroller, topicsOff, setPool, setTopics, commit, render } from '#ui/context';
import { cardOf, cardNode } from '#ui/card';

// The Feed section: the packs, the cards that come in as the user scrolls, and the seen ones
// (FEED-6 to FEED-8).
const BATCH = 5;
// How far below the screen the end of the list is when the next cards come in.
const AHEAD = 600;
// A card counts as seen when 60% of it, or 60% of the height of the screen, is in view.
const SEEN = 0.6;
// From this width the panels stand in a column beside the cards; below it they come after the
// first cards of the list (FEED-18).
const WIDE = matchMedia('(min-width: 840px)');
const PANELS_AFTER = 3;
// The item of the list that holds the panels below 840px.
const slot = el('li', { className: 'feed-panels-item' });

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

// The topics whose cards do not show (FEED-14).
const off = () => hiddenTopics(pool.topics, topicsOff);

const nearEnd = () => $('feed-more').getBoundingClientRect().top < scroller.getBoundingClientRect().bottom + AHEAD;

// Adds the next cards, and goes on while the end of the list is still near the screen.
const fill = () => {
  if (!pool) {
    render();
    return;
  }
  const exclude = ui.feed.map((entry) => entry.id);
  const entries = ui.again
    ? seenAgain(pool, state, { exclude, off: off(), count: BATCH })
    : nextCards(pool, state, { now: Date.now(), random: Math.random, exclude, off: off(), count: BATCH });
  ui.feed.push(...entries.map(({ card, reason }) => ({ id: card.id, reason, updated: isUpdated(state.records[card.id], card) })));
  for (const { card, reason } of entries) if (reason === 'due') ui.dueIds.add(card.id);
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
    .filter(({ card }) => card && !state.records[card.id]?.suspended && !off().includes(card.topic));
  // The action that has the focus keeps it in the new node of its card.
  const focused = document.activeElement?.closest('.feed-card') ? document.activeElement : null;
  const keep = cards.map(({ entry, card }) => nodeFor(entry, card));
  // One node of the panels moves between the side column and the list; the item that holds it
  // in the list is kept like a card.
  const panels = $('feed-panels');
  // An empty side column below 840px is no landmark.
  $('feed-side').hidden = !WIDE.matches;
  if (WIDE.matches) {
    if (panels.parentElement !== $('feed-side')) $('feed-side').append(panels);
  } else {
    if (panels.parentElement !== slot) slot.append(panels);
    keep.splice(Math.min(PANELS_AFTER, keep.length), 0, slot);
  }
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
  renderSide();
};

const ledgerCell = (text, number) => el('span', { textContent: text, className: number ? 'topic-ledger-value' : 'topic-ledger-title' });

// The panels of the side column: Today, the coming reviews, the card states and the topics
// (FEED-18). Hidden until the packs load.
const renderSide = () => {
  $('feed-panels').hidden = !pool;
  slot.hidden = !pool;
  if (!pool) return;
  const now = Date.now();
  const hidden = off();
  const bars = dueBars(pool, state, now, hidden);
  // A card of a topic that is off leaves Today, as it leaves the due count.
  const topicOn = (id) => {
    const card = cardOf(id);
    return Boolean(card) && !hidden.includes(card.topic);
  };
  const done = sessionDone(ui.dueIds, ui.seen, topicOn);
  const total = done + bars[0];
  $('today-count').textContent = t('side.todayCount', { done, count: total });
  const progress = $('today-progress');
  progress.style.setProperty('--pct', `${total ? (done / total) * 100 : 0}%`);
  progress.setAttribute('aria-valuemax', String(total));
  progress.setAttribute('aria-valuenow', String(done));
  $('today-note').textContent = bars[0] > 0 ? t('side.todayNote', { count: bars[0] }) : t('side.todayDone');

  const max = Math.max(1, ...bars);
  $('due-bars').replaceChildren(
    ...bars.map((value, day) => {
      // The count stands over the fill; as an image, the track reads as its label.
      const track = el('span', { className: 'due-bar-track' }, [
        el('span', { className: 'due-bar-count', textContent: String(value) }),
        el('span', { className: 'due-bar-fill' }),
      ]);
      track.setAttribute('role', 'img');
      track.setAttribute('aria-label', t('side.barLabel', { count: value }));
      const bar = el('li', { className: day === 0 ? 'due-bar today' : 'due-bar' }, [
        track,
        el('span', { className: 'due-bar-day', textContent: day === 0 ? t('side.day0') : t('side.dayN', { count: day }) }),
      ]);
      bar.style.setProperty('--bar', String(value / max));
      return bar;
    }),
  );

  const counts = stateCounts(pool, state, hidden);
  $('states-title').textContent = t('side.states', { count: counts.learning + counts.known + counts.mastered });
  for (const name of ['learning', 'known', 'mastered']) $(`state-${name}`).textContent = String(counts[name]);

  $('topic-ledger').replaceChildren(
    ...topicLedger(pool, state, now, hidden).map(({ title, seen, due, fresh }) => {
      const name = ledgerCell(title, false);
      // A long title is cut with an ellipsis; the whole title shows on hover.
      Object.assign(name, { lang: 'en', title });
      return el('li', { className: 'topic-ledger-line' }, [name, ...[seen, due, fresh].map((value) => ledgerCell(String(value), true))]);
    }),
  );
};

// The line under the title: a greeting, what comes back today and what is new. Empty until the packs load.
export const subline = () => {
  if (!pool) return '';
  const hidden = off();
  const due = dueBars(pool, state, Date.now(), hidden)[0];
  const fresh = newCount(pool, state, hidden);
  const count = pool.topics.length - hidden.filter((id) => pool.topics.some((topic) => topic.id === id)).length;
  const topics = t('feed.topics', { count });
  const greeting = t(`feed.greeting.${greetingOf(new Date().getHours())}`);
  if (due > 0) return `${greeting} ${t('feed.dueToday', { count: due })}${fresh > 0 ? ` ${t('feed.thenNew', { count: fresh, topics })}` : ''}`;
  return `${greeting} ${fresh > 0 ? `${t('feed.nothingDue')} ${t('feed.newOnly', { count: fresh, topics })}` : t('feed.allDone')}`;
};

// A switch of a topic, from the walkthrough or from Settings. The cards of a topic that is off
// leave the list and come back when it is on again; a topic that is on may add cards at the end.
export const chooseTopic = (id, on) => {
  if (!pool) return;
  setTopics(switchTopic(pool.topics, topicsOff, id, on));
  ui.ended = false;
  fill();
};

// Whether a topic is on, and whether its switch is locked as the last one on.
export const topicStates = () => {
  if (!pool) return [];
  const hidden = off();
  const on = pool.topics.filter(({ id }) => !hidden.includes(id));
  return pool.topics.map(({ id, title }) => ({ id, title, on: !hidden.includes(id), last: on.length === 1 && on[0].id === id }));
};

export const bind = () => {
  WIDE.addEventListener('change', render);
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
