# Design system

The shared tokens, base rules, components, layouts and icons rules come from `pwa-design-system`.
Its rules DS-1 to DS-8 are in its `docs/spec/01-design-system.md`, and LAY-1 to LAY-4 in its
`docs/spec/02-layout.md`. `vendor/design-system/SOURCE.json` names the version and the commit that
this app uses. `tests/design.test.js` runs each rule of `vendor/design-system/rules.js` over the
files of the app, with no skip. `designs/index.html` shows each part, shared and own.

This document holds the rules of the app only.

## The copy

- **DSV-1** `vendor/design-system/` holds `design-system.css`, `catalog.js`, `rules.js`,
  `sheet.js`, the font `geist.woff2` and `SOURCE.json`: the version, the commit and the sha256 of
  each file, and no other file. Only
  `npm run ds` writes it, from `../pwa-design-system` with no uncommitted change of those files. A
  file that differs from its hash fails `tests/vendor.test.js`. The tests read the copy only, so
  they pass with no `../pwa-design-system`.
- **DSV-2** `index.html` and `designs/index.html` link `vendor/design-system/design-system.css`
  before `styles.css`, and `SHELL` of `sw.js` has both, `sheet.js` and `geist.woff2` (SW-2). The
  page loads `sheet.js` through the alias `#ds/sheet` (ENG-6). A layer of the two sheets is one
  layer: a rule of `styles.css` comes after the shared rules of its layer.
- **DSV-3** `styles.css` starts with the same layer statement and holds the parts of the app only:
  its tokens, the `body` rule and the font of the controls, the screen parts, and the components of the app.
  A version of a shared component starts with the block `/* @extends <name> */`, in the same
  layer, so that it wins; the block documents the parts, variants and states that the app adds.
  A version holds only the rules that differ from the shared ones, so that a change of the shared
  sheet reaches the app. No other rule of `components` or `layouts` repeats a selector of the
  shared sheet. The six versions of a shared component are:
  - `main`: a size container, so that the side column of the Feed is at most as high as the
    scrolling area (FEED-18).
  - `app-header` and `nav-bar`: the Noche look of the shell (the ground behind them, a rule on the
    inner edge, no fill on the current item).
  - `pill`: the variant `data`, for the Review tag.
  - `progress`: the variant `data`, the data hue on the nested fill, for the progress of **Hoy**
    (FEED-18).
  - `list-group` in `settings`: no border, the card radius; the select of a row of Preferences lies
    over the row (SET-1).
- **DSV-4** A change of a shared part is made in `pwa-design-system`, then `npm run ds` here.
  Nothing edits `vendor/` by hand, and `npm run init` copies it as it is (ENG-17).

## Parts of the app

The parts of `styles.css`, by layer. The shared parts are in the design system.

| Layer | Parts |
|---|---|
| tokens | the Noche roles: ground, surface, nested by lightness only; `--primary` is the ink pill; `--data` is the one data hue, for data only; `--done-soft` is a neutral fill, so the New tag has no green |
| base | `main` (a version of the shared part) |
| components | `app-header`, `nav-bar`, `pill`, `progress` (versions of the shared parts) |
| screens | feed: `feed`, `feed-layout`, `feed-panels`, `feed-panel`, `due-bars`, `topic-ledger`, `feed-card` · settings: `settings` (version of `list-group`), `about`, `version-status` · nav: `dust` · onboarding: `onboarding`, `onboarding-art` |
