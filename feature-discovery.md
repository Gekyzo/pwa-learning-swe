# Learning SWE — functional feature discovery

Date: 2026-10-30. Input: the one-sentence description of `CLAUDE.md`.

> A doomscroll feed of software development content and learning resources.

Scope: functional behaviour, domain rules and data only. Architecture, stack, UI and layout are out
of scope.

---

## 1. Product understanding

### Purpose

The app replaces an idle scroll session with a scroll session that teaches software engineering. The
user keeps the habit (open, swipe, next card) and gets a better outcome (knowledge that stays).

### Underlying domain

Three domains overlap:

1. **Content curation.** Units of content, their sources, topics, difficulty, freshness and quality.
2. **Feed ranking.** The choice of the next item from a large pool, with a mix of novelty, interest
   and repetition.
3. **Learning.** Retention, recall, mastery of a topic, and progress over time.

The tension of the product: a doomscroll feed rewards time spent; a learning tool rewards knowledge
kept. The functional rules must resolve this tension, not ignore it.

### Intended use cases

- Short sessions of 2–10 minutes: a commute, a queue, a break.
- Sessions with no connection: a train, a plane, a weak mobile signal.
- Discovery of a topic the user does not know yet.
- Recall of a topic the user learned and can forget.
- Capture of a resource to read in full later.

### Facts and assumptions

| # | Statement | Source |
|---|---|---|
| F1 | The product is a feed with continuous scroll. | Description ("doomscroll feed") |
| F2 | Two content kinds: software development content, and learning resources. | Description |
| F3 | The app works offline on Android. | `CLAUDE.md` |
| F4 | The app has no build step and no dependencies; there is no app server of its own. | `CLAUDE.md` |
| F5 | The app has two UI languages, `es` and `en`. | `src/locales/` |
| F6 | An optional Google account gates access; app data stays on the device and does not sync. | `docs/spec/08-account.md` (ACC) |
| F7 | Export, import and Delete all data exist. | `docs/spec/01-engineering.md`, SET-2 |
| A1 | The single user is a developer who wants to learn, not a beginner who wants a course. | Assumption |
| A2 | "Content" means short units that a user reads in under one minute (a card). | Assumption |
| A3 | "Learning resources" means links to longer material: articles, docs, courses, videos, books. | Assumption |
| A4 | The core content is curated and ships with the app; external sources are an addition. | Assumption, from F3 and F4 |
| A5 | The user wants retention, not only entertainment. | Assumption, from the app name |
| A6 | Content is in English; the UI is in `es` or `en`. | Assumption |

---

## 2. Functional feature inventory

Legend. Priority: **M** must-have, **S** should-have, **C** could-have, **F** future.
Complexity: **L** low, **M** medium, **H** high.

### 2.1 Content model

| ID | Feature | Description | Value | Pri | Cx | Dependencies |
|---|---|---|---|---|---|---|
| C-1 | Card | The unit of the feed: id, kind, title, body, topic tags, difficulty, source, language, date, content version. | Every other rule needs one stable unit. | M | L | — |
| C-2 | Card kinds | A fixed set of kinds: concept, code snippet, comparison ("X vs Y"), pitfall/anti-pattern, quiz, command or shortcut, quote, resource link. | Each kind has its own interaction rules (a quiz has an answer, a resource has a URL). | M | M | C-1 |
| C-3 | Topic taxonomy | A two-level tree of topics (for example `databases > indexing`). Each card has one primary topic and optional secondary tags. | Ranking, filters, mastery and statistics work per topic. | M | M | C-1 |
| C-4 | Difficulty level | Each card has a level: intro, intermediate, advanced. | The feed matches the user level; "too easy" and "too hard" signals have a target. | M | L | C-1 |
| C-5 | Prerequisite links | A card can name other cards or topics that it needs. | The feed does not show an advanced card before its base. | C | M | C-3 |
| C-6 | Card series | An ordered group of cards on one subject ("Git internals, 1 of 6"). | Depth on a subject inside a shallow format. | S | M | C-1 |
| C-7 | Resource metadata | A resource link has its type (article, doc, video, course, book, repo), estimated time, free or paid, and the date it was last checked. | The user decides before leaving the app; the app can rank by time available. | S | L | C-2 |
| C-8 | Content packs | Cards ship in versioned packs per topic. A pack has an id, a version and a list of cards. | Updates add, change or retire cards with no loss of user state. | M | M | C-1 |
| C-9 | Card retirement | A pack version can mark a card as retired (wrong, outdated). A retired card leaves the feed; a saved copy keeps a "retired" flag. | Old or wrong technical facts do not stay in front of the user. | S | L | C-8 |

### 2.2 Feed and ranking

| ID | Feature | Description | Value | Pri | Cx | Dependencies |
|---|---|---|---|---|---|---|
| R-1 | Infinite feed | The feed produces the next card on demand from the local pool, with no end of list while unseen or due cards exist. | The core behaviour of the description. | M | M | C-1 |
| R-2 | Seen tracking | The app records each card shown, with the date and the dwell time. | No repeat of new content; input for ranking and statistics. | M | L | R-1 |
| R-3 | Ranking mix | Each next card comes from a weighted mix: new cards of preferred topics, due review cards (L-2), and exploration cards of other topics. The weights are fixed rules, for example 60 / 25 / 15. | Balance of interest, retention and discovery. | M | M | R-2, L-2 |
| R-4 | Topic interest weights | Each topic has a weight that explicit choices (follow, mute) and implicit signals (like, skip, dwell) change. | The feed adapts with no manual set-up. | S | M | R-2, I-1 |
| R-5 | Variety rules | No more than N consecutive cards of one topic or one kind; a series card follows its predecessor within M cards. | A feed that stays interesting; series stay coherent. | S | L | R-3, C-6 |
| R-6 | Difficulty adaptation | "Too easy" and "too hard" signals and quiz results move the target level per topic. | The feed matches the user as the user improves. | S | M | C-4, I-1 |
| R-7 | Feed modes | Named modes change the mix: Discover (new only), Review (due only), Focus (one topic), Quick (cards under 20 seconds). | One feed serves several intents. | S | M | R-3 |
| R-8 | Pool exhaustion | When no unseen card of the active filters exists, the feed says so and offers: widen the filters, review mode, or older seen cards. | No silent repeat; no empty dead end. | M | L | R-1 |
| R-9 | Deterministic order per day | The order of new cards uses a seed of the date, so a reload of the feed does not reshuffle it. | Predictable behaviour; a card does not "disappear" on reload. | C | L | R-3 |

### 2.3 Interaction with a card

| ID | Feature | Description | Value | Pri | Cx | Dependencies |
|---|---|---|---|---|---|---|
| I-1 | Feedback signals | Per card: like, "I knew this", "too hard", "not interested", "wrong or outdated". Each signal has a defined effect on ranking and learning state. | The user steers the feed; the signals are the data of R-4, R-6, L-1. | M | M | R-2 |
| I-2 | Save | The user saves a card or a resource to a collection. | The feed is transient; saved content is not. | M | L | C-1 |
| I-3 | Collections | Saved items go to named collections; a default "Saved" collection exists. | Organisation of saved content per goal. | S | L | I-2 |
| I-4 | Read later queue | A resource link saved for later has a state: queued, opened, done, dropped. | A reading backlog with an end, not a pile. | S | L | C-7, I-2 |
| I-5 | Personal note on a card | The user adds a short note to a card. | Active processing improves retention. The template already has notes (NOTE-*). | C | L | C-1 |
| I-6 | Quiz answer | A quiz card takes an answer and shows correct or wrong, with the explanation. The result goes to L-1. | Active recall, the strongest retention method. | M | M | C-2 |
| I-7 | Share | The user sends the text and the source link of a card to another Android app. | Content reaches colleagues; no new data. | C | L | C-1 |
| I-8 | Undo of a signal | A signal can be undone for a short time. | A wrong swipe does not corrupt ranking. The template already has an undo toast pattern. | S | L | I-1 |

### 2.4 Learning and retention

| ID | Feature | Description | Value | Pri | Cx | Dependencies |
|---|---|---|---|---|---|---|
| L-1 | Card learning state | Each seen card has a state: new, learning, known, mastered, suspended. Signals and quiz results move it. | The base of review and mastery. | M | M | I-1, I-6 |
| L-2 | Spaced review | A card in learning or known gets a next due date from a spaced-repetition rule (for example SM-2 or a simple Leitner box). Due cards enter the feed through R-3. | The feed turns into memory, not only exposure. | M | M | L-1 |
| L-3 | Recall prompt | A review card shows first its question or title; the body shows on request. The user grades the recall. | Review that tests memory, not re-reading. | S | M | L-2 |
| L-4 | Topic mastery | A score per topic from the states of its cards and the quiz results. | The user sees what is known and what is weak. | S | M | L-1, C-3 |
| L-5 | Learning goals | The user picks 1–3 goal topics ("learn Kubernetes basics"). The feed raises their weight, and the goal has a progress value from L-4. | Direction for a passive format. | S | M | L-4, R-4 |
| L-6 | Learning paths | A goal can follow an ordered path of series and topics, with prerequisites. | A structured route for a large subject. | C | H | C-5, C-6, L-5 |
| L-7 | Missed review backlog | After a long absence, due reviews are spread over the next days with a daily cap, not shown all at once. | No wall of reviews after a holiday. | S | L | L-2 |

### 2.5 Session control (healthy doomscroll)

| ID | Feature | Description | Value | Pri | Cx | Dependencies |
|---|---|---|---|---|---|---|
| H-1 | Session budget | The user sets an optional budget per session (time or cards). At the limit the feed shows a stop point with the summary of the session. | The product keeps its learning promise and does not turn into a time sink. | S | L | R-2 |
| H-2 | Session summary | At a stop point or on request: cards seen, new topics, reviews done, quiz score. | A sense of progress; closure of the session. | S | L | R-2, L-1 |
| H-3 | Daily target | An optional daily target (for example 20 cards or 5 reviews) with a completion state per day. | A habit with an end, in place of an endless loop. | C | L | R-2 |
| H-4 | Streak | Count of consecutive days with the daily target met; one "freeze" day per week does not break it. | Motivation. Risk: it can push the time-sink behaviour that H-1 limits. | C | L | H-3 |

### 2.6 Data operations

| ID | Feature | Description | Value | Pri | Cx | Dependencies |
|---|---|---|---|---|---|---|
| D-1 | User state document | One versioned document holds seen records, signals, learning states, collections, goals and preferences. Card content is not in it. | Export, import, migration and Delete all data work on one document. | M | M | C-1 |
| D-2 | Export and import of user state | The existing export and import (F7) carry D-1. Import validates and migrates an older version. | A device change or a reset loses no progress. | M | L | D-1 |
| D-3 | Import merge rule | An import into a device with state merges per card: the most recent review wins; collections join; seen records join. The user picks merge or replace. | A second device or an old backup does not erase new progress. | S | M | D-2 |
| D-4 | Orphan handling | A user record whose card is not in any installed pack is kept, hidden and counted, and comes back when the pack returns. | A pack removal or a failed update does not erase progress. | S | L | C-8, D-1 |
| D-5 | Pack update migration | A new pack version keeps the user state of unchanged cards; a changed card keeps its state with a "changed" flag; a retired card follows C-9. | Content can change with no loss of learning state. | M | M | C-8, D-1 |
| D-6 | History | A list of seen cards, newest first, with a search over title and topic. | The user finds "that card about indexes from yesterday". | S | L | R-2 |
| D-7 | Reset per topic | The user resets the learning state of one topic, or of all seen records, without Delete all data. | A fresh start on a topic; no full data loss. | C | L | L-1 |
| D-8 | Export of saved content | Export of a collection as Markdown (title, body, link per item). | Saved content goes to the user's own notes tool. | C | L | I-3 |
| D-9 | Storage limit | Seen records older than N months compact into per-card counters; the app checks the storage quota and reports when it is near the limit. | The state does not grow with no bound on a phone. | S | M | D-1 |

### 2.7 Automation

| ID | Feature | Description | Value | Pri | Cx | Dependencies |
|---|---|---|---|---|---|---|
| A-1 | Pack update when online | At start with a connection, the app checks the pack versions and downloads new ones in the background. | Fresh content without a manual step, inside the offline model. | S | M | C-8 |
| A-2 | Offline pre-fetch of resources | A resource saved for later (I-4) gets a readable copy stored for offline use, where the source permits it. | "Read later" also works on the train. | C | H | I-4 |
| A-3 | Link check | When online, the app checks saved resource URLs at a low rate and flags dead links. | Saved resources stay usable. | C | M | C-7, I-2 |
| A-4 | Review reminder | A local notification at a user-chosen time when due reviews exist. | Spaced repetition works only with regular visits. | C | M | L-2 |
| A-5 | Automatic suspension | A card with "not interested" two times, or with three wrong quiz answers in a row, is suspended and reported. | No loop on a card that does not work for the user. | S | L | L-1 |

### 2.8 Insights

| ID | Feature | Description | Value | Pri | Cx | Dependencies |
|---|---|---|---|---|---|---|
| N-1 | Activity statistics | Cards per day, time per day, reviews per day, for 7 and 30 days. | The user sees the habit. | S | L | R-2 |
| N-2 | Topic coverage | Per topic: cards seen of total, mastery (L-4), last activity. | The map of known and unknown areas. | S | M | L-4 |
| N-3 | Retention rate | Share of reviews graded correct, per topic and over time. | The real measure of learning, not of time spent. | S | M | L-3 |
| N-4 | Weak-spot detection | Topics with low retention or with many "too hard" signals; the app proposes a Focus session on them. | A direct next step from the data. | C | M | N-3, R-7 |
| N-5 | Blind-spot suggestion | Topics with no activity that are near the followed topics in the taxonomy. | Discovery with intent. | C | M | C-3, R-4 |
| N-6 | Review forecast | Number of reviews due per day for the next 7 days. | The user plans review load. | C | L | L-2 |

### 2.9 Integrations

All integrations are optional additions to the bundled packs (A4). Each needs a connection; each
result is cached for offline use.

| ID | Feature | Description | Value | Pri | Cx | Dependencies |
|---|---|---|---|---|---|---|
| X-1 | RSS/Atom sources | The user adds feed URLs (engineering blogs). New entries become resource cards with the topic from a keyword map. | Fresh content beyond the curated packs. Risk: CORS limits on a static app with no server. | C | H | C-7, A-1 |
| X-2 | Public developer APIs | Read-only sources with open CORS, for example Hacker News (Firebase API) or dev.to: top entries become resource cards. | A live news stream in the feed. | F | M | X-1 rules |
| X-3 | Reference docs links | A concept card links to the matching MDN, language docs or RFC page. | One tap to the authoritative source. | S | L | C-7 |
| X-4 | Account sync | The existing PocketBase account (F6) stores D-1 so that a second device gets the same progress. | Multi-device. Changes rule ACC "nothing syncs". | F | H | D-1, D-3 |
| X-5 | Community packs | Import of a pack file or a pack URL that someone else publishes in the C-8 format. | Content grows without the author writing it. | F | M | C-8, D-2 |

---

## 3. Missing capabilities

The description names a feed and content. It does not name these, and the app is incomplete without
them:

1. **A source of content.** The description does not say where cards come from, who writes them, or
   how they update. C-8 (packs) and A-1 answer this; it is the largest open question (§7).
2. **A learning model.** "Learning resources" implies learning, but a feed only gives exposure.
   L-1 and L-2 make exposure into retention.
3. **A notion of "next".** A feed needs a ranking rule. With no rule, the app is a shuffled list.
   R-3 is the minimum.
4. **A stop rule.** "Doomscroll" names a harmful pattern. H-1 and H-2 keep the pattern and remove
   the harm.
5. **Capture for later.** Learning resources are often too long for a scroll session. I-2 and I-4
   connect the short format to the long one.
6. **Content correctness.** Technical facts age (APIs change, versions end). C-9 and the "wrong or
   outdated" signal handle it.
7. **State survival.** Progress that a pack update, a reinstall or a device change erases is not
   progress. D-1, D-2 and D-5 protect it.

---

## 4. MVP scope

The MVP is a first version that a user opens daily and that teaches something. It needs no
connection after install and no external source.

| ID | Feature |
|---|---|
| C-1 | Card |
| C-2 | Card kinds (concept, code snippet, pitfall, quiz, resource link; others later) |
| C-3 | Topic taxonomy (one level is enough at first) |
| C-4 | Difficulty level |
| C-8 | Content packs (bundled, one pack per topic) |
| R-1 | Infinite feed |
| R-2 | Seen tracking |
| R-3 | Ranking mix (new, due, exploration) |
| R-8 | Pool exhaustion |
| I-1 | Feedback signals |
| I-2 | Save (one default collection) |
| I-6 | Quiz answer |
| L-1 | Card learning state |
| L-2 | Spaced review |
| D-1 | User state document |
| D-2 | Export and import of user state |
| D-5 | Pack update migration |

Out of the MVP on purpose: integrations, statistics screens, goals, streaks.

---

## 5. Feature roadmap

### Phase 1 — essential capabilities

The MVP of §4, plus the features that make it reliable in daily use:

- I-8 Undo of a signal
- C-9 Card retirement
- D-4 Orphan handling
- L-7 Missed review backlog
- H-1 Session budget, H-2 Session summary

### Phase 2 — functional expansion

- Content structure: C-5 Prerequisite links, C-6 Card series, C-7 Resource metadata
- Feed: R-4 Topic interest weights, R-5 Variety rules, R-6 Difficulty adaptation, R-7 Feed modes
- Saved content: I-3 Collections, I-4 Read later queue, D-6 History
- Learning: L-3 Recall prompt, L-4 Topic mastery, L-5 Learning goals, A-5 Automatic suspension
- Data: D-3 Import merge rule, D-9 Storage limit
- Updates: A-1 Pack update when online
- Insights: N-1 Activity statistics, N-2 Topic coverage, N-3 Retention rate
- Integrations: X-3 Reference docs links

### Phase 3 — advanced capabilities and differentiation

- L-6 Learning paths
- N-4 Weak-spot detection, N-5 Blind-spot suggestion, N-6 Review forecast
- A-2 Offline pre-fetch, A-3 Link check, A-4 Review reminder
- X-1 RSS/Atom sources, X-2 Public developer APIs, X-5 Community packs
- X-4 Account sync
- Small items: I-5, I-7, D-7, D-8, H-3, H-4, R-9

---

## 6. Prioritization — top 10

Ranked by user value, then by how many other features depend on it, then by low complexity.

| Rank | ID | Feature | Reason |
|---|---|---|---|
| 1 | C-1 + C-2 | Card and card kinds | Every feature depends on the unit and its kinds. |
| 2 | C-8 | Content packs | The only content source that fits offline and no server; it decides the update path. |
| 3 | R-1 + R-2 | Infinite feed with seen tracking | The core promise; the data of all ranking and statistics. |
| 4 | L-1 + L-2 | Learning state and spaced review | The difference between this app and a news feed. |
| 5 | R-3 | Ranking mix | Connects the feed (R-1) to learning (L-2); a simple fixed rule is enough. |
| 6 | I-1 | Feedback signals | Low cost, high leverage: input for R-4, R-6, L-1, C-9. |
| 7 | I-6 | Quiz answer | Active recall; strong retention for a medium cost. |
| 8 | D-1 + D-5 | User state document and pack update migration | Without them, every content update risks the user's progress. |
| 9 | I-2 + I-4 | Save and read later queue | Connects short cards to long learning resources (F2). |
| 10 | H-1 + H-2 | Session budget and summary | Low cost; turns "doomscroll" into a product position, not a risk. |

---

## 7. Critical assessment

### Unnecessary complexity

- **Learned ranking (a model of the user).** A fixed weighted rule (R-3, R-4) gives most of the value.
  A trained model needs data volume that a single-user offline app does not have.
- **L-6 Learning paths before C-6 series prove useful.** A path is a graph of series; build the graph
  only if users finish series.
- **X-1 RSS/Atom.** Many feeds do not send CORS headers. A static app with no server can read only a
  part of them. The existing `pwa-server` could proxy, but that adds a server dependency to an
  offline app.
- **A-2 Offline pre-fetch.** Article extraction, copyright limits and storage size make it costly
  for a moderate gain.
- **H-4 Streak.** It works against H-1. Add it only with the freeze rule, or not at all.

### Overlap and duplication

- **I-5 Personal note vs the template Notes module (NOTE-*).** The template domain is a notes list.
  Reuse its rules (text limits, undo) for card notes, or remove the demo module. Do not keep two
  note systems.
- **"I knew this" (I-1) vs recall grade (L-3).** Both say "known". Define one effect: "I knew this" on
  a new card is a first recall grade of "easy".
- **"Not interested" (I-1) vs topic mute (R-4) vs suspension (A-5).** Three ways to hide content.
  Define the scope of each: one card, one topic, automatic.
- **R-7 Review mode vs L-3 recall prompt.** Review mode is the feed filter; the recall prompt is the
  card behaviour inside any mode. Keep them separate but do not build a second review screen.
- **X-4 Account sync vs D-2 export/import.** Manual export covers the device-change case. Sync is
  worth its cost only for daily use on two devices.

### Assumptions to validate

1. **A4 — who writes the content.** The author alone, an LLM-assisted pipeline with human review, or
   external sources. This decides the scale of the pool and the time between updates. It is the main
   decision of the product.
2. **A2 — card length.** Test a target of under one minute per card against real reading.
3. **A5 — retention over entertainment.** If the user wants only light reading, L-2 and I-6 are
   friction. A Discover-only mode (R-7) is the fallback.
4. **A6 — content language.** UI in `es` and `en` (F5) suggests the question: does content also need
   Spanish? Two languages double the content work.
5. **Pool size.** At 50 cards per day, a pool of 500 cards lasts 10 days. R-8 and L-2 extend it, but
   the update rate of packs must match daily use.
6. **Spaced-repetition rule.** SM-2 vs Leitner boxes. Leitner is simpler and easier to explain; SM-2
   adapts better. Validate with the retention rate (N-3).

### Worth further exploration

- **Code-reading cards.** A snippet with the question "what does this print?" or "what is the bug?".
  A developer-specific form of active recall that general flashcard apps do not have.
- **Version-aware facts.** A card states the version range it applies to (for example "Node ≥ 22").
  C-9 can then retire cards when a version ends, by rule and not by hand.
- **Interview-prep mode.** A Focus mode over data structures, algorithms and system design, with a
  timed quiz. A clear goal for the same content.
- **Comparison cards from the taxonomy.** Two sibling topics (`REST` and `GraphQL`) produce a
  comparison card prompt. A cheap way to grow content from the structure that exists.
- **"Explain it back".** The user writes a one-line summary of a card; the summary appears at the
  next review in place of the body. Uses the note rules that exist.
