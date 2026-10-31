# Layout and navigation

Rules of `src/sections.js`, `src/modules.js`, `src/onboarding.js`, the views `nav`, `dust` and
`onboarding` of `src/ui/`, and the layout of Settings.

## Size classes

The size classes, the navigation element, the `pane` layout and the safe areas are the rules
LAY-1 to LAY-4 of the design system (04-design-system). The Feed is one column below 840px and a
4 : 2 grid from 840px: the cards, and the side column of FEED-18. Saved is one centred column of
cards in each class; this app has no `pane` layout (LAY-3).

## Navigation

- **NAV-1** The sections are `feed`, `saved` and `settings`, in the order of `SECTIONS`. The navigation
  shows one item for each section that is on (MOD-1). The current one has
  `aria-current="page"`, and its title is the title of the header.
- **NAV-2** A horizontal slide of at least 60 px that starts in the header or the content, out of
  a field and of the code of a card, goes to the next section (slide left) or the previous one
  (slide right). It stops at the first and the last section. The content comes in from its side.

## Modules

- **MOD-1** `MODULES` lists the parts that Settings turns off: `saved`, which shows the Saved
  section. Its switch, **Guardadas en la barra**, is the last row of **Preferencias**.
  With a module off, its sections leave the navigation, and a view of one of them goes
  to the first section that is on.
- **MOD-2** The modules that are off are a preference of the device under `pwa-learning-swe.modules`,
  not part of the doc. No module off removes the key.
- **MOD-3** The switch of Saved animates the item of its section: it breaks into dust and its
  place closes, or its place opens and the dust settles (`src/ui/dust.js`). With reduced motion
  the item goes or comes at once.

## Settings

- **SET-1** Settings is a column of groups, each a `settings-group`: a `list-group-head` with an
  optional muted line, above a `list-group` of settings rows. The order is **Temas** (FEED-15, with the
  line `settings.topicsNote`: topics on of all, and the cards of the topics on), **Preferencias**
  (**Language**, **Card language** (I18N-7), **Hand**, **Theme**, then the switch of Saved, MOD-1; line `settings.preferencesNote`),
  **Cuenta y copia** (the account rows, ACC-8, then **Export** and **Import**), **Aplicación**
  (**Install** only when INS-2 shows it, **Show the introduction**, **How review works**, **What's new**,
  then the version lines, VER-4) and **Borrar** (SET-2; line `settings.eraseNote`). A row of Preferences
  shows its current value and a chevron, and a tap on it opens the native picker of its select. A
  row that opens something ends with a chevron. From 840px the head and its line stand in a column beside
  the rows (2 : 4); below, above them.
- **SET-2** **Delete all data** is the only row of **Borrar**, the last group, in the colour of danger, with no
  chevron. It asks `reset.confirm`, or `reset.confirmLocal` with a session, which also says that
  the session closes. A yes removes each `localStorage` key of the app, `<slug>.*` (`resetAll`),
  and no key of another app of the origin, then loads the page again: the app starts as a new
  install, with the walkthrough (ONB-1), and a device that had a session opens Sign in (ACC-1). It
  has no Undo. When the removal fails, `error.resetFailed` shows and nothing else changes. The
  caches of the worker stay.

## Walkthrough

- **ONB-1** The walkthrough shows at the start of a new install only: no `pwa-learning-swe.onboarded`
  flag and no stored doc. A storage that cannot be read counts as seen.
- **ONB-2** It is one page: the logo, the title **What do you want to review?**, a text, the topic tiles
  (ONB-4), a sample card, then **Start** with the count of cards and **See how review works**
  (ONB-5). The sample is the first card that is not retired of the first topic that is on, inert,
  beside the tiles from 840px and under them below. **Start** and Escape close it and keep every
  topic it has on. It has no pages, no drawings, no **Skip**, no slide and no arrow keys.
- **ONB-3** A close stores the flag. **Show the introduction** in Settings › Aplicación opens it again.
- **ONB-4** The tiles choose the topics (FEED-14): one tile for each pack, in pack order, with a
  check mark, the title of the pack (in English) and its count of cards that are not retired. A
  tile is pressed when its topic is on. A tap switches the topic at once; the tile of the last
  topic that is on is disabled. **Start** reads the sum of the counts of the topics that are on.
  The tiles take 2 columns below 840px and 3 from 840px. Below 840px the bar of **Start** and
  **See how review works** is sticky at the bottom of the screen. With the packs not loaded yet,
  the page has no tile and no sample, and **Start** reads `onboarding.startPlain` (Empezar, Start) with no count.
- **ONB-5** **See how review works** on the walkthrough and **How review works** in Settings › Aplicación
  open one sheet over the screen: a head with its title and **Close**, then how a seen
  card comes back (1, 3, 7, 16 and 35 days, LRN-3) and what **Remembered**, **Forgot**, **I knew
  this** and a quiz answer do (LRN-5). **Close**, the veil and Escape close it; Escape closes it
  before the walkthrough below it.
