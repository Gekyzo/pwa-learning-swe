# Changelog

User-visible changes, newest first.

## Unreleased

- The Feed side column (FEED-18): `feed-layout` (4 : 2 grid from 840px, sticky side), `feed-panels`, `feed-panel`, `due-bars` and `topic-ledger` in `styles.css`; `@extends progress` variant `data`; `@extends main` makes `main` a size container, so the sticky side column is at most as high as the scrolling area and scrolls on its own; tokens `--bars-height`, `--ledger-col`. `sessionDone` in `src/feed.js`; `renderSide` of `src/ui/feed.js` fills Hoy, Vuelven a repaso, the states and Por tema, and moves one `#feed-panels` node into the list after the third card below 840px. Keys `side.*`.
- `greetingOf` in `src/feed.js`; `subline` of `src/ui/feed.js` replaces `dueText` and key `feed.due` (greeting, `feed.dueToday`, `feed.thenNew`, `feed.nothingDue`, `feed.newOnly`, `feed.allDone`, `feed.topics`) (FEED-8).
- `cardNode` tags a card by its reason: `pill data` with `card.review` for `due`, `pill` with new key `card.new` for `new` and `explore`, none for `again`; `@extends pill` variant `data` in `styles.css` (FEED-9, DSV-3).
- Noche tokens in `styles.css`: neutral ground and surfaces, `--data` hue, `--faint`, `--radius-card`, `--feed-max`, `--side-gap`, `--panel-pad`; `--primary` is the ink pill and `--done` the ink. Versions of `app-header` and `nav-bar`; cards and settings groups lose their borders; `theme-color` metas follow the ground.

## 0.3.0 - 2026-10-31

- `textParts` reads `**text**` as bold (`strong: true`), keys in it too; `src/ui/whatsnew.js` wraps those parts in `<strong>` (VER-22).
- The walkthrough has four pages (ONB-2): `welcome`, the new `review` and `keep`, and `offline`. Its texts name the grades, **Save**, Saved and **More** of 0.2.0; new key `onboarding.icon.more`.
- The topics that are off are a device preference under `pwa-learning-swe.topics` (FEED-14): `hiddenTopics` and `switchTopic` in `src/feed.js`, an `off` option on `nextCard`, `nextCards`, `seenAgain` and `dueCount`. The walkthrough ends with a `topics` page of chips (ONB-4), and Settings has a Topics group of switches (FEED-15); both call `chooseTopic` of `src/ui/feed.js`.

## 0.2.0 - 2026-10-31

- The feed replaces the notes demo. Cards live in six JSON packs of `content/` (42 cards), validated by `src/cards.js` (CARD-1 to CARD-6) and precached in `SHELL`. `src/learning.js` keeps one record per seen card in `pwa-learning-swe.feed` with Leitner boxes of 1, 3, 7, 16 and 35 days (LRN-1 to LRN-8). `src/feed.js` orders the feed: a quarter due cards, then new cards from a topic weighted by its likes, then exploration (FEED-1 to FEED-5). Views `src/ui/feed.js`, `src/ui/card.js` and `src/ui/saved.js` (FEED-6 to FEED-13); `saved` is the one module of Settings.
- Removed with the demo: `src/notes.js`, `src/ui/notes.js` and the optional modules that only the notes used, `swipe`, `drag` (`src/reorder.js`) and `src/ui/motion.js`; the `notes.*` keys, the `note` and `trash` icons. The old `pwa-learning-swe.notes` key is no longer read; the cache name stays `v1`, as no module reads the new key in an old format (SW-10).

## 0.1.1 - 2026-10-30

- First release, from pwa-template 0.1.3: offline shell, install, update toast, What's new, Google or offline account, English and Spanish, light and dark themes. The notes demo stands in for the feed. The release notes start with this version; the template's 0.1.2 and 0.1.3 entries, which this app never shipped, go.
- New art in `icons/source.png`, a stack of slate code cards with an amber graduation cap made with ChatGPT from the prompts of `pwa-icon-prompts-family.md`; `npm run icons` wrote the PNG icons and the logo again (VER-15). The RGB 1254 px image became the 512 px RGBA source: cropped square so the art takes 0.777 of the side, as in pwa-nexus, and lifted by 255/253 so its background is pure white.
- **Delete all data** in Settings › Backup, as in pwa-template (SET-2): `resetAll` in `src/storage.js` removes each `localStorage` key of the app, `<slug>.*`, and no key of another app of the origin; the page loads again as a new install. With a session the question says that it also logs out (`signedIn` of `src/ui/account.js`). Keys `settings.reset`, `reset.confirm`, `reset.confirmLocal`, `error.resetFailed`.
