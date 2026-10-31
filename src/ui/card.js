import { INTERVALS, answerQuiz, grade, signal, toggleLike, toggleSaved } from '#learning';
import { tagOf } from '#feed';
import { bindSheetDrag } from '#ds/sheet';
import { $, el, ui, state, pool, t, apply, render } from '#ui/context';
import { icon } from '#ui/controls';

// One card of the feed or of Saved (FEED-9 to FEED-12), and the sheet of its other signals.

export const cardOf = (id) => pool?.cards.find((card) => card.id === id) ?? null;

const now = () => Date.now();

const toggle = (action, name, label, pressed, onClick) => {
  const button = el('button', { type: 'button', className: 'button icon toggle', onclick: onClick }, [icon(name)]);
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', String(pressed));
  button.dataset.action = action;
  return button;
};

const action = (name, className, text, onClick) => {
  const button = el('button', { type: 'button', className, textContent: text, onclick: onClick });
  button.dataset.action = name;
  return button;
};

// The wait of the box of the card, as a line: Back for review in 7 days.
const backLine = (card) => el('p', { className: 'feed-card-note', textContent: t('card.back', { count: INTERVALS[state.records[card.id]?.box ?? 0] }) });

const answer = (card, choice) => {
  const result = answerQuiz(state, card, choice, now());
  ui.answers[card.id] = { choice, correct: result.correct };
  apply(result);
};

const options = (card, chosen) =>
  el(
    'div',
    { className: 'feed-card-options' },
    card.options.map((text, index) => {
      const button = action(`option-${index}`, 'button outline wide feed-card-option', text, () => answer(card, index));
      button.disabled = Boolean(chosen);
      if (chosen && index === card.answer) button.dataset.result = 'right';
      else if (chosen && index === chosen.choice) button.dataset.result = 'wrong';
      return button;
    }),
  );

const pill = (text, className = 'pill') => el('span', { className, textContent: text });

// The text of a card is English in every language of the screen (CARD-6).
const cardShell = (card, parts) => {
  const node = el('li', { className: 'feed-card', lang: 'en' }, parts);
  node.dataset.id = card.id;
  node.dataset.kind = card.kind;
  return node;
};

const previewNode = (card, parts) => {
  const node = cardShell(card, parts);
  node.inert = true;
  return node;
};

// `entry` is the place of the card in the feed, { reason, updated }, or null in Saved.
// With `preview` the node has no actions and is inert: the sample of Sign in and of the walkthrough.
export const cardNode = (card, entry = null, { preview = false } = {}) => {
  const record = state.records[card.id];
  const chosen = ui.answers[card.id] ?? null;
  const topic = pool.topics.find((one) => one.id === card.topic)?.title ?? card.topic;
  const meta = el('p', { className: 'feed-card-meta' }, [`${topic} · ${t(`kind.${card.kind}`)} · ${t(`level.${card.level}`)}`]);
  const tag = tagOf(entry?.reason);
  if (tag === 'review') meta.append(pill(t('card.review'), 'pill data'));
  else if (tag === 'new') meta.append(pill(t('card.new')));
  if (entry?.updated) meta.append(pill(t('card.updated')));
  if (card.retired) meta.append(el('span', { className: 'pill ghost', textContent: t('card.retired') }));

  const parts = [meta, el('h2', { className: 'feed-card-title', textContent: card.title })];
  if (card.kind === 'snippet') parts.push(el('pre', { className: 'feed-card-code', textContent: card.code }));
  if (card.kind === 'quiz') parts.push(options(card, chosen));
  if (card.kind === 'quiz' && chosen) {
    const result = el('p', { className: 'feed-card-result', textContent: t(chosen.correct ? 'card.right' : 'card.wrong') });
    result.dataset.result = chosen.correct ? 'right' : 'wrong';
    parts.push(result);
  }
  if (card.kind !== 'quiz' || chosen) parts.push(el('p', { className: 'feed-card-body', textContent: card.body }));
  if (card.kind === 'resource') {
    const label = t('card.open', { media: t(`media.${card.media}`), minutes: card.minutes });
    parts.push(el('a', { className: 'button tonal feed-card-link', href: card.url, target: '_blank', rel: 'noopener', textContent: label }));
  }

  if (preview) return previewNode(card, parts);

  const actions = [
    toggle('like', 'heart', t('card.like'), Boolean(record?.liked), () => apply(toggleLike(state, card, now()))),
    toggle('save', 'bookmark', t('card.save'), Boolean(record?.saved), () =>
      apply(toggleSaved(state, card, now()), { undoText: record?.saved ? t('toast.unsaved') : null })),
  ];
  // Saved shows the card only: the review and the signals belong to the feed.
  if (entry) {
    const graded = card.id in ui.graded || card.id in ui.knew || Boolean(chosen);
    if (graded) parts.push(backLine(card));
    else if (entry.reason === 'due' && card.kind !== 'quiz') {
      const rate = (remembered) => () => {
        ui.graded[card.id] = remembered;
        apply(grade(state, card, remembered, now()));
      };
      actions.push(action('remembered', 'button tonal', t('card.remembered'), rate(true)), action('forgot', 'button outline', t('card.forgot'), rate(false)));
    } else if (card.kind !== 'quiz') {
      actions.push(
        action('knew', 'button tonal', t('card.knew'), () => {
          ui.knew[card.id] = true;
          apply(signal(state, card, 'knew', now()));
        }),
      );
    }
    const more = el('button', { type: 'button', className: 'button icon feed-card-more', onclick: () => openCardSheet(card.id) }, [icon('more')]);
    more.setAttribute('aria-label', t('card.more'));
    more.dataset.action = 'more';
    actions.push(more);
  }
  parts.push(el('div', { className: 'cluster feed-card-actions' }, actions));

  return cardShell(card, parts);
};

const openCardSheet = (id) => {
  ui.sheetCard = id;
  render();
  $('card-close').focus();
};

export const closeCardSheet = () => {
  ui.sheetCard = null;
  render();
};

export const renderCardSheet = () => {
  $('card-sheet').hidden = ui.sheetCard === null;
};

export const bind = () => {
  $('card-veil').addEventListener('click', closeCardSheet);
  $('card-close').addEventListener('click', closeCardSheet);
  bindSheetDrag($('card-menu'), { close: closeCardSheet });
  document.querySelectorAll('[data-signal]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = cardOf(ui.sheetCard);
      const kind = button.dataset.signal;
      ui.sheetCard = null;
      if (card) apply(signal(state, card, kind, now()), { undoText: t(`toast.${kind}`) });
      else render();
    });
  });
};
