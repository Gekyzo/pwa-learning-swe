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

## Order of the feed

Rules of `src/feed.js`. The random source is a parameter; the screen passes `Math.random`.

- **FEED-1** A card may show when it is not retired, not suspended and not in the feed yet. A
  card with no record is new; a card whose record is due is due (LRN-3).
- **FEED-2** Each next card takes one draw from 0 to 1. Below 0.25 it is the most overdue card;
  below 0.85 a new card; else an exploration card. A share with no card takes a due card, and a
  due draw with no due card takes a new card.
- **FEED-3** A new card comes from a topic drawn with the weight 1 plus the liked cards of the
  topic. An exploration card comes from the topic with the fewest seen cards, the first in pack
  order on a tie. In both, the lowest level of the topic comes first, then the pack order. With no
  due and no new card, the feed is at its end.
- **FEED-4** At the end, **Show seen cards again** fills the feed with the seen cards that may
  show, the least recently seen first.
- **FEED-5** The due count is the due cards that may show. The saved cards are the cards of the
  packs whose record is saved, the last saved first; a retired card stays among them.
- **FEED-16** The due bars count the cards that may show (not retired, not suspended, topic on)
  for each of the next 7 days, in windows of 24 hours from the moment of the count. Bar 0, today,
  is the cards due now (LRN-3). Bar k, from 1, is the cards due after `now + (k-1)` days and up to
  `now + k` days. A card due later than 7 days is in no bar.
- **FEED-17** The new count is the cards that may show and have no record. The state counts are
  the seen cards that may show, in the groups of LRN-2: learning, known and mastered. The ledger
  has one row for each topic that is on, in pack order, with its seen, due and new cards that may
  show. The rows add up to the due bar 0, the new count and the state counts.

## Screen

Rules of `src/ui/feed.js`, `src/ui/card.js` and `src/ui/saved.js`.

- **FEED-6** At each start the app reads `content/index.json`, then each pack that it lists. A
  pack that cannot be read or is not valid is left out. An index that cannot be read shows
  `feed.error` with **Try again**, which reads the packs again.
- **FEED-7** The Feed is one column of cards. It starts with 5 cards and adds the next 5 when the
  end of the list comes within 600 px of the screen, until the feed is at its end (FEED-3). Then it
  shows **All caught up** with **Show seen cards again**, which starts the list again from the top
  with the seen cards (FEED-4); once that list ends too, the end shows `feed.endAgain` with no
  button. The cards of the feed are kept for the time of the
  start only.
- **FEED-8** A card counts as seen (LRN-4) once in a start, when 60% of the card, or 60% of the
  height of the screen, is in view. The subline of the Feed is a greeting (`feed.greeting.morning` from 6:00,
  `feed.greeting.afternoon` from 14:00, `feed.greeting.evening` from 21:00) and one of four forms: `feed.dueToday` with
  the due count (FEED-5) and `feed.thenNew` for the new cards; `feed.nothingDue` with `feed.newOnly`; or `feed.allDone`.
  The topics of the new cards are `feed.topics`, for the topics that are on. The line is empty only until the packs load.
- **FEED-9** A card shows its topic, kind and level; a pill by the reason it came: **Review** (in the data hue) for a due
  card, **New** for a new or explore card, and none for a card shown again; **Updated** when it was updated (LRN-7) as it came in, and **Retired** when it is retired.
  Then its title, the code of a snippet, and its body. A resource has a button that opens its URL
  in a new tab, with the medium and the minutes. The text of a card is in English (`lang="en"`).
- **FEED-10** A quiz shows its options. A tap answers it (LRN-5): the options lock, the right one
  is marked, a wrong choice is marked too, and `card.right` or `card.wrong` shows above the
  explanation.
- **FEED-11** Each card of the feed has **Like** and **Save** (LRN-6), then **I knew this**, or
  **Remembered** and **Forgot** for a due card that is not a quiz. After an answer, a grade or
  **I knew this**, the card says when it comes back (`card.back`). **More** opens a sheet with
  **Too hard**, **Not interested** and **Wrong or outdated** (LRN-5); each one closes the sheet and
  shows its toast with **Undo**. A suspended card leaves the feed at once.
- **FEED-12** A card that shows the same thing keeps its node, so a sight does not build it
  again; an action keeps the focus on its button in the new node of its card.
- **FEED-13** Saved lists the saved cards (FEED-5) with **Like** and **Save** only. Unsave there
  removes the card from the list, with **Undo**. With no saved card it shows `saved.empty` and
  **Go to the feed**.
- **FEED-14** The topics that are off are a preference of the device under
  `pwa-learning-swe.topics`: a list of pack ids, with no key when every topic is on. A card of a
  topic that is off does not come into the Feed, leaves the list of this start, and is not in the
  due count; Saved still shows it, and its record keeps its review state. The last topic that is
  on cannot be turned off, and a list that covers every pack counts as no topic off. An id of no
  pack stays in the list, so a pack that comes back is still off.
- **FEED-15** Settings has the group **Topics**, once the packs load: one switch for each pack, in
  pack order, with the title of the pack in English. A switch acts at once, as a chip of ONB-4
  does: the switch of the last topic that is on is disabled, and a topic that comes back on may
  add its cards at the end of the list.
