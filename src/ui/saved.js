import { savedCards } from '#feed';
import { $, ui, state, pool } from '#ui/context';
import { cardNode } from '#ui/card';
import { setView } from '#ui/nav';

// The Saved section: the saved cards, the last saved first (FEED-13).
export const renderSaved = () => {
  const visible = ui.view === 'saved';
  $('saved').hidden = !visible;
  if (!visible) return;
  const cards = pool ? savedCards(pool, state) : [];
  $('saved-list').replaceChildren(...cards.map((card) => cardNode(card)));
  $('saved-empty').hidden = !pool || cards.length > 0;
};

export const bind = () => {
  $('saved-feed').addEventListener('click', () => setView('feed'));
};
