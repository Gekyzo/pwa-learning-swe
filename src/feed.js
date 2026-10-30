import { LEVELS } from '#cards';
import { isDue } from '#learning';

// The order of the feed (FEED-1 to FEED-5). The random source is a parameter, so a test can fix it.
// A draw below DUE_SHARE takes a due card, below NEW_SHARE a new card, and else it explores.
export const DUE_SHARE = 0.25;
export const NEW_SHARE = 0.85;

// The cards that may show: not retired, not suspended, not in the feed yet.
const eligible = (pool, state, exclude) =>
  pool.cards.filter((card) => !card.retired && !state.records[card.id]?.suspended && !exclude.includes(card.id));

// The first card of the lowest level, in pack order.
const easiest = (cards) => cards.reduce((best, card) => (LEVELS.indexOf(card.level) < LEVELS.indexOf(best.level) ? card : best));

const topicsOf = (cards) => [...new Set(cards.map((card) => card.topic))];

const pickDue = ({ due }) => (due.length ? { card: due[0], reason: 'due' } : null);

// A topic of the new cards, drawn with the weight 1 + the likes of the topic.
const pickNew = ({ fresh, pool, state, random }) => {
  if (!fresh.length) return null;
  const topics = topicsOf(fresh);
  const weights = topics.map((topic) => 1 + pool.cards.filter((card) => card.topic === topic && state.records[card.id]?.liked).length);
  let draw = random() * weights.reduce((sum, weight) => sum + weight, 0);
  const index = weights.findIndex((weight) => (draw -= weight) < 0);
  const topic = topics[index < 0 ? topics.length - 1 : index];
  return { card: easiest(fresh.filter((card) => card.topic === topic)), reason: 'new' };
};

// The topic of the new cards with the fewest seen cards; the first one in pack order on a tie.
const pickExplore = ({ fresh, pool, state }) => {
  if (!fresh.length) return null;
  const seen = (topic) => pool.cards.filter((card) => card.topic === topic && state.records[card.id]).length;
  const topic = topicsOf(fresh).reduce((best, topic) => (seen(topic) < seen(best) ? topic : best));
  return { card: easiest(fresh.filter((card) => card.topic === topic)), reason: 'explore' };
};

// { card, reason } for the next card of the feed, or null at its end (FEED-1 to FEED-3).
export const nextCard = (pool, state, { now, random, exclude = [] }) => {
  const cards = eligible(pool, state, exclude);
  const due = cards
    .filter((card) => isDue(state.records[card.id], now))
    .sort((a, b) => state.records[a.id].due - state.records[b.id].due);
  const fresh = cards.filter((card) => !state.records[card.id]);
  const context = { due, fresh, pool, state, random };
  const draw = random();
  if (draw < DUE_SHARE) return pickDue(context) ?? pickNew(context);
  if (draw < NEW_SHARE) return pickNew(context) ?? pickDue(context);
  return pickExplore(context) ?? pickDue(context);
};

export const nextCards = (pool, state, { now, random, exclude = [], count }) => {
  const entries = [];
  while (entries.length < count) {
    const entry = nextCard(pool, state, { now, random, exclude: [...exclude, ...entries.map(({ card }) => card.id)] });
    if (!entry) break;
    entries.push(entry);
  }
  return entries;
};

// The seen cards that may show, the least recently seen first (FEED-4).
export const seenAgain = (pool, state, { exclude = [], count }) =>
  eligible(pool, state, exclude)
    .filter((card) => state.records[card.id])
    .sort((a, b) => state.records[a.id].last - state.records[b.id].last)
    .slice(0, count)
    .map((card) => ({ card, reason: 'again' }));

export const dueCount = (pool, state, now) => eligible(pool, state, []).filter((card) => isDue(state.records[card.id], now)).length;

// The saved cards of the pool, the last saved first. A retired card stays (FEED-5).
export const savedCards = (pool, state) =>
  pool.cards.filter((card) => state.records[card.id]?.saved).sort((a, b) => state.records[b.id].savedAt - state.records[a.id].savedAt);
