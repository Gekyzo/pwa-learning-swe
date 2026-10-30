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

## Learning

Rules of `src/learning.js`. Each operation takes the time `now` as a parameter and never reads
the clock.

- **LRN-1** The learning doc is `{ version: 1, records: { [card id]: record } }`, stored as JSON
  under `pwa-learning-swe.feed`. A stored doc that is not valid is kept under
  `pwa-learning-swe.feed.corrupt`, and the app starts with no record. A record is
  `{ seen, last, box, due, rev, saved, savedAt, liked, suspended, flag }`.
- **LRN-2** The state of a card comes from its record and is never stored: no record is `new`,
  box 0 or 1 is `learning`, box 2 or 3 is `known`, box 4 is `mastered`, and `suspended` wins over
  each of them.
- **LRN-3** The review boxes 0 to 4 wait 1, 3, 7, 16 and 35 days. A card is due from its `due`
  time, unless it is suspended.
- **LRN-4** The first sight of a card makes its record: seen 1, box 0, due in one day, the `rev` of
  the card. A later sight counts one more, takes the `rev` of the card and keeps the box. A due
  card that is seen with no grade comes back one day later.
- **LRN-5** **Remembered** moves the card up one box, at most to box 4; **Forgot** puts it in
  box 0. Each waits the time of its new box. A right quiz answer is **Remembered**, a wrong one
  **Forgot**. **I knew this** puts the card in box 2 at least. **Too hard** puts it in box 0 with
  the flag `hard`. **Not interested** and **Wrong or outdated** suspend the card, with the flag
  `skip` or `report`.
- **LRN-6** **Like** and **Save** switch on and off. A save keeps its time in `savedAt`.
- **LRN-7** A card is updated when its `rev` is past the `rev` of its record: its state
  stays, and its next sight takes the new `rev`.
- **LRN-8** `normalizeLearning` accepts a doc of version 1 whose records are all valid, and drops
  unknown fields. A record of a card that no pack has stays in the doc and shows nowhere, so a
  pack that comes back finds its state.
