# Feed

The domain of the app: a feed of short cards about software engineering. A seen card comes back
for review on a spaced schedule. Rules of `src/cards.js` and the packs of `content/`.

## Cards

- **CARD-1** A card has a `kind`: `concept`, `snippet` (with `code`), `pitfall`, `quiz` (with
  `options` and `answer`) or `resource` (with `url`, `media` and `minutes`). It has a `level`:
  `intro`, `intermediate` or `advanced`, and a `title` and a `body`. Its `rev`, 1 when absent,
  goes up when its text changes. A card with `retired: true` never shows in the feed.
- **CARD-2** `normalizeCard` accepts a card whose `id` is lowercase, starts with the id of its
  pack and a hyphen, and whose title (at most 120 characters) and body (at most 600) are not
  blank. It trims the texts and drops the fields that the kind does not have. A `snippet` keeps
  its `code` as written, at most 800 characters.
- **CARD-3** A `quiz` has two to four options, each a text of at most 120 characters, and the
  index of the right one. A `resource` has an `https` URL, a medium (`article`, `docs`, `video`,
  `course`, `book`, `repo`) and a whole number of minutes from 1 to 600. The body of a quiz is
  its explanation.
- **CARD-4** A pack is `{ id, version, title, cards }`, one topic. `normalizePack` keeps its
  valid cards and names the ones that it drops; a card id that is twice in the pack is dropped
  the second time. A pack with a bad id, version, title or card list is dropped whole.
- **CARD-5** `buildPool` joins the packs in their order. Each card takes the id of its pack as its
  `topic`. A pack id that is twice keeps the first pack.
- **CARD-6** The packs are `content/<id>.json`, listed in `content/index.json` and in `SHELL`.
  Their text is in English in every language of the screen. `tests/content.test.js` checks that
  each pack is valid and drops no card, and that each card id is unique.
