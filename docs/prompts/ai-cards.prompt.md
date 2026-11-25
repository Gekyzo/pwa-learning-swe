# Prompt: AI, embeddings and RAG card packs with SVG diagrams

You write learning cards for **pwa-learning-swe**, an offline Android PWA. It is a doomscroll feed of short cards about software engineering. A reader sees one card at a time on a phone, about 360 px wide. A seen card comes back for spaced review, so every card must stand alone and stay true when it comes back in a month.

Your task: write **three new packs** of cards, in English with a Spanish translation, and give the cards a **diagram** where a picture explains the idea better than words.

## 1. The packs

| Pack id | Title (en) | Title (es) | Scope |
|---|---|---|---|
| `llm` | Large language models | Modelos de lenguaje | Tokens, context window, sampling (temperature, top-p), system prompt, few-shot, structured output, tool use, hallucination, prompt injection, prompt caching, cost and latency, fine-tuning vs prompting vs RAG, evaluation with an LLM as judge. |
| `embeddings` | Embeddings and vector search | Embeddings y búsqueda vectorial | What an embedding is, cosine vs dot product vs L2, normalisation, dimensions and cost, same model for query and document, exact kNN vs ANN, HNSW, IVF, quantisation, recall vs latency, pgvector, metadata filters, embedding drift after a model change. |
| `rag` | Retrieval-augmented generation | Generación aumentada por recuperación | The pipeline, chunking (size, overlap, by structure), hybrid search (BM25 + vectors, RRF), reranking with a cross-encoder, query rewriting, top-k and context budget, citations, lost in the middle, retrieval metrics (recall@k, MRR), answer metrics (faithfulness), stale index and re-indexing, RAG vs long context, agentic retrieval. |

Write **30 cards per pack** (90 in all). Per pack:

- Kinds: about 10 `concept`, 5 `snippet`, 6 `pitfall`, 6 `quiz`, 3 `resource`. Each pack must have each kind at least once.
- Levels: about 30% `intro`, 45% `intermediate`, 25% `advanced`.
- Diagrams: **10 to 14 cards per pack** have one. Most concepts and pitfalls with a flow, a structure, a geometry or a before/after. Never a snippet or a resource. A quiz may have one when the question is about the picture.
- Order the cards inside a pack from `intro` to `advanced`; the feed shows the lowest level of a topic first.

## 2. The card format

Each pack is one JSON file, `content/<pack id>.json`:

```json
{
  "id": "rag",
  "version": 1,
  "title": "Retrieval-augmented generation",
  "translations": { "es": { "title": "Generación aumentada por recuperación" } },
  "cards": [ ... ]
}
```

A card (these rules are enforced by a validator; a card that breaks one is dropped):

| Field | Rule |
|---|---|
| `id` | Lowercase `[a-z][a-z0-9-]*`, starts with `<pack id>-`, unique across all packs. Example: `rag-hybrid-search`. |
| `kind` | `concept`, `snippet`, `pitfall`, `quiz` or `resource`. |
| `level` | `intro`, `intermediate` or `advanced`. |
| `title` | Not blank, **max 120 characters**. For a quiz it is the question. |
| `body` | Not blank, **max 600 visible characters (markup does not count), max 800 with markup**. Aim for 250–450. Formatted as in section 4. For a quiz it is the explanation, shown after the answer. |
| `code` | `snippet` only. Max 800 characters, kept exactly as written (use `\n`). Max ~12 lines, max ~60 columns: the card is narrow. |
| `syntax` | `snippet` only, optional: `js`, `sql` or `sh`. Python has no highlight: omit `syntax` for Python (it shows plain). Prefer `js` or `sql` (pgvector) when the idea fits. |
| `options`, `answer` | `quiz` only. 2 to 4 options, each max 120 characters; `answer` is the 0-based index of the right one. Vary the position of the right answer. |
| `url`, `media`, `minutes` | `resource` only. `url` is `https`. `media` is `article`, `docs`, `video`, `course`, `book` or `repo`. `minutes` is a whole number from 1 to 600. **Only URLs you are sure exist and are stable**: official docs, papers on arxiv.org, well-known repos. No blog posts you cannot verify. |
| `diagram` | Optional. `{ "svg": "<svg ...>...</svg>", "alt": "..." }`. Rules in section 5. |
| `translations` | Required: `{ "es": { "title", "body", "options"?, "diagram"? } }`. A quiz translates every option, same count, same order. A card with a diagram has `"diagram": { "alt": "..." }` in Spanish. Code, answer, URL and SVG stay the same in every language. |

## 3. The writing

English:

- Short sentences, max ~20 words. Active voice, present tense, imperative for advice.
- One idea per card. The title states the idea or the lesson, not the topic: "Cosine similarity ignores the length of the vectors", not "Cosine similarity".
- Concrete: a number, a size, a failure, a command. "A 512-token chunk with 64 tokens of overlap" beats "a suitable chunk size".
- No filler, no hype, no "In today's world", no "simply", no emojis.
- Be correct and timeless. No model version numbers or prices that go stale; say "a large model" or "an embedding model with 1536 dimensions". If a fact depends on a vendor, name the general mechanism instead.
- A `pitfall` names the trap, the symptom, and the fix.
- A `quiz` has one clearly right answer and plausible wrong ones. The body says why the right one is right and why the tempting wrong one is wrong.

Spanish (`translations.es`):

- Neutral Spanish from Spain, `tú`, same register as the English.
- Keep the field's jargon in English where Spanish developers use it: embedding, chunk, prompt, token, top-k, reranking, fine-tuning, LLM, index stays "índice". Write the rest in plain Spanish.
- Same limits: title max 120, body max 600 visible characters. Spanish is ~15% longer; check the count.

## 4. Body formatting

A body is a small subset of Markdown. The app shows paragraphs, line breaks, bold and italic. It never reads HTML.

| Write | Shows |
|---|---|
| A blank line (`\n\n` in JSON) | A new paragraph |
| One newline (`\n`) | A line break inside a paragraph |
| `**text**` | **Bold** |
| `*text*` | *Italic* |
| `\*` (`\\*` in JSON) | A literal `*` |

No nesting and no other markup: no headings, lists, links or code spans. A `*` with no closing pair in its line shows as text, but the check reports it as unclosed: escape it as `\*`.

Rules:

- 2 to 3 paragraphs, 4 at most. Each paragraph is one step of the idea: what it is, how it works, what to do or what goes wrong.
- **Bold**: 1 to 2 runs, 3 at most. The phrase a reader must keep if they read nothing else — the claim, the number, the fix. A phrase, not a sentence.
- *Italic*: at least 1 run. A term the card defines on first use, or the one word that carries a contrast ("only the *distances* do").
- A line break (`\n`) for a short sequence inside a paragraph, such as steps or a before/after.
- No markup inside identifiers, code or numbers with units.
- The same structure in the translation: same paragraph count, the same ideas in bold and italic.
- The 600-character limit counts the visible text.

Run `npm run check:bodies <pack>`; it must print `ok`.

## 5. The diagrams

The app builds the SVG **inline** in the card, inside `<figure class="feed-card-diagram">`, as `<svg class="diagram">`. A strict parser checks it first; a diagram that breaks one rule below is dropped. The app's CSS colours it, so it follows the light and the dark theme. You never write a colour.

### Canvas

- Root: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 H" role="img">`, with no other attribute. **Width is always 320.** H is between 120 and 280. No `width`, no `height`, no `class` on the root.
- The whole `svg` string is at most **6000 characters**. The reference card uses about 2600.
- One viewBox unit is about one CSS pixel on a phone. Keep 8 units of margin on each side.
- One diagram, one idea. At most ~10 boxes. Nothing decorative.
- Lay out top-to-bottom or as rows; never a wide left-to-right chain of more than 4 boxes (it does not fit 320).

### Allowed content (anything else is stripped by the sanitiser)

- Elements: `svg`, `g`, `defs`, `marker`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `text`, `tspan`.
- Attributes, by element: `rect` `x y width height rx ry`; `circle` `cx cy r`; `ellipse` `cx cy rx ry`; `line` `x1 y1 x2 y2`; `polyline`/`polygon` `points`; `path` `d`; `text` `x y dx dy`; `tspan` `x y dx dy`; `marker` `id viewBox refX refY markerWidth markerHeight orient`. Shapes and `g` also take `class` and `transform`; shapes take `marker-start` and `marker-end`. `defs` takes none. A `tspan` is only inside a `text`.
- Values: double quotes only, no `:`, `'`, `"`, `<` or `>` inside a value. Text uses only `&amp;` `&lt;` `&gt;` `&quot;` `&apos;` and numeric entities (`&#952;`); a bare `&` is an error. No comments, no CDATA, no doctype.
- **Never**: `style` attributes or `<style>`, `fill`/`stroke`/`font-*`/`text-anchor` attributes, `<script>`, `<foreignObject>`, `<image>`, `<use>`, `<a>`, `on*` handlers, `href`, external URLs, `<title>` (the alt text is in JSON).
- Every `id` starts with the card id, e.g. `rag-pipeline-head`: many cards share one page, so ids must be unique.

### Classes (the only styling)

| Class | Use | Looks like |
|---|---|---|
| `d-box` | A box, a node, a container | Card-coloured fill, grey 1 px border |
| `d-hi` | **The one** box or area the card is about | Soft blue fill, blue border |
| `d-dot` | A point (a vector, a data item) | Blue dot |
| `d-ink` | A solid shape in text colour (a small point, a bar) | Text colour fill |
| `d-text` | A label in a box | 13 px, text colour, centred |
| `d-on-hi` | Add to `d-text` inside a `d-hi` box | Blue text |
| `d-note` | A secondary label: on an arrow, an axis, a second line | 12 px, muted, centred |
| `d-label` | A section label above a row, in CAPITALS | 12 px, faint, spaced, left-aligned |
| `d-start` / `d-end` | Add to a text to align it left or right of its `x` | — |
| `d-line` | A plain connector, an axis, a grid line | Grey 1 px, no fill |
| `d-arrow` | A flow arrow | Muted 1.25 px, no fill |
| `d-data-line` | The one highlighted path or vector | Blue 1.5 px, no fill |
| `d-dash` | Add to a line class to dash it (optional, approximate) | 4-3 dash |
| `d-head` / `d-data-head` | The arrowhead shape inside a `marker` | Muted / blue fill |

Use blue (`d-hi`, `d-dot`, `d-data-line`) for **one** thing per diagram: the point of the card. Everything else is grey.

### Text

- Text is centred on its `x` and vertically centred on its `y` (the CSS sets this). Put a box label at the box centre.
- Labels are **technical terms, identifiers, symbols or numbers only**: `query`, `chunk`, `top-k`, `cos θ`, `0.82`, `BM25`, `HNSW`, `LLM`. Never a sentence, never a plain English word with a common Spanish translation ("answer", "slow", "wrong"): the same SVG is shown in Spanish. Pick `output`, `✓`, `✗`, `p95`, a number.
- Budget: a `d-text` character is about 8 units wide, a `d-note` character about 7. A 64-wide box holds 7 characters of `d-text`. Leave 6 units of padding.
- Min box height 28. Never let text touch or cross a line: offset a note 6 units off its arrow.

### Arrows

- Define one marker per diagram in `<defs>`:
  `<marker id="<card id>-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="d-head" d="M0 0L8 4L0 8z"/></marker>`
  (add a second one with `d-data-head` only if a `d-data-line` needs a head).
- **One `<path>` per arrow.** A marker draws only at the end of the whole path, so `d="M…H… M…H…"` loses its heads. Elbows are fine inside one path: `d="M40 120V168H86"`.
- End an arrow 2 units before the box it enters.

### Alt text

`alt` describes what the diagram shows, in 1 to 3 sentences, max 400 characters, for a screen reader. It does not repeat the body.

### Ideas that earn a diagram

Pipeline flows (RAG, indexing, reranking stages), vector geometry (cosine angle, nearest neighbours, a query among clusters), HNSW layers, chunk overlap on a strip of text, a context window filling up, lost-in-the-middle as a U-shaped curve, hybrid search merging two ranked lists, a tool-use loop, prompt injection through a retrieved document, temperature as a flatter or sharper distribution, recall@k on a ranked list.

## 6. The reference card

This card is approved. Match its tone, density and diagram style. It renders like this on a 360 px phone: two labelled rows of boxes, the index and the top-k in blue, elbow arrows into the prompt box.

```json
{
  "id": "rag-pipeline",
  "kind": "concept",
  "level": "intro",
  "title": "RAG looks the answer up before it writes it",
  "body": "*Retrieval-augmented generation* has two phases.\nOffline, split the documents into chunks, embed each chunk and store the vectors in an index.\nFor each query, embed the query, take the **k nearest chunks** and put them in the prompt next to the query.\n\nThe model **answers from that text, not only from its weights**: it can cite its sources and use data newer than its training.",
  "diagram": {
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 248\" role=\"img\"><defs><marker id=\"rag-pipeline-head\" viewBox=\"0 0 8 8\" refX=\"7\" refY=\"4\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path class=\"d-head\" d=\"M0 0L8 4L0 8z\"/></marker></defs><text class=\"d-label\" x=\"8\" y=\"12\">OFFLINE</text><rect class=\"d-box\" x=\"8\" y=\"20\" width=\"64\" height=\"28\" rx=\"6\"/><text class=\"d-text\" x=\"40\" y=\"34\">docs</text><rect class=\"d-box\" x=\"88\" y=\"20\" width=\"64\" height=\"28\" rx=\"6\"/><text class=\"d-text\" x=\"120\" y=\"34\">chunks</text><rect class=\"d-box\" x=\"168\" y=\"20\" width=\"64\" height=\"28\" rx=\"6\"/><text class=\"d-text\" x=\"200\" y=\"34\">embed</text><rect class=\"d-hi\" x=\"248\" y=\"20\" width=\"64\" height=\"28\" rx=\"6\"/><text class=\"d-text d-on-hi\" x=\"280\" y=\"34\">index</text><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M72 34H86\"/><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M152 34H166\"/><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M232 34H246\"/><text class=\"d-label\" x=\"8\" y=\"84\">ONLINE</text><rect class=\"d-box\" x=\"8\" y=\"92\" width=\"64\" height=\"28\" rx=\"6\"/><text class=\"d-text\" x=\"40\" y=\"106\">query</text><rect class=\"d-box\" x=\"88\" y=\"92\" width=\"64\" height=\"28\" rx=\"6\"/><text class=\"d-text\" x=\"120\" y=\"106\">embed</text><rect class=\"d-hi\" x=\"248\" y=\"92\" width=\"64\" height=\"28\" rx=\"6\"/><text class=\"d-text d-on-hi\" x=\"280\" y=\"106\">top-k</text><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M72 106H86\"/><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M152 106H246\"/><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M280 48V90\"/><text class=\"d-note\" x=\"200\" y=\"99\">vector</text><text class=\"d-note d-start\" x=\"287\" y=\"70\">search</text><rect class=\"d-box\" x=\"88\" y=\"148\" width=\"144\" height=\"40\" rx=\"6\"/><text class=\"d-text\" x=\"160\" y=\"161\">prompt</text><text class=\"d-note\" x=\"160\" y=\"177\">query + top-k chunks</text><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M40 120V168H86\"/><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M280 120V168H234\"/><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M120 188V210\"/><path class=\"d-arrow\" marker-end=\"url(#rag-pipeline-head)\" d=\"M152 226H166\"/><rect class=\"d-box\" x=\"88\" y=\"212\" width=\"64\" height=\"28\" rx=\"6\"/><text class=\"d-text\" x=\"120\" y=\"226\">LLM</text><rect class=\"d-box\" x=\"168\" y=\"212\" width=\"64\" height=\"28\" rx=\"6\"/><text class=\"d-text\" x=\"200\" y=\"226\">output</text></svg>",
    "alt": "Two rows. Offline: documents become chunks, each chunk is embedded, and the vectors go into an index. Online: the query is embedded, a vector search in the index returns the top-k chunks, and the query plus those chunks form the prompt of the LLM, which writes the output."
  },
  "translations": {
    "es": {
      "title": "RAG busca la respuesta antes de escribirla",
      "body": "La *generación aumentada por recuperación* tiene dos fases.\nOffline, divide los documentos en chunks, calcula el embedding de cada chunk y guarda los vectores en un índice.\nEn cada consulta, calcula el embedding de la consulta, toma los **k chunks más cercanos** y ponlos en el prompt junto a la consulta.\n\nEl modelo **responde a partir de ese texto y no solo de sus pesos**: puede citar sus fuentes y usar datos más nuevos que su entrenamiento.",
      "diagram": {
        "alt": "Dos filas. Offline: los documentos se dividen en chunks, se calcula el embedding de cada chunk y los vectores van a un índice. Online: se calcula el embedding de la consulta, una búsqueda vectorial en el índice devuelve los k chunks más cercanos, y la consulta más esos chunks forman el prompt del LLM, que escribe la salida."
      }
    }
  }
}
```

Use `rag-pipeline` as the first card of the `rag` pack, unchanged.

## 7. Check before you answer

For each card, check:

1. The id starts with the pack id and a hyphen, and is unique.
2. Title ≤ 120, body ≤ 600 visible characters (≤ 800 with markup), in English **and** in Spanish. Count them.
3. A quiz has 2–4 options, a valid `answer`, and the Spanish options in the same order.
4. A snippet's code is ≤ 800 characters and fits ~60 columns.
5. Each resource URL is real and `https`.
6. Each SVG: width 320, only the allowed elements, attributes and classes, ids prefixed with the card id, one path per arrow, no text overflowing a box, no label in plain English.
7. Each diagram card has `diagram.alt` in English and `translations.es.diagram.alt` in Spanish.
8. The JSON parses. Strings escape `"` as `\"`; the SVG is one line.
9. Each body, in English and in Spanish: 2–4 paragraphs, 1–3 bold runs of at most 60 characters, at least one italic run, no unclosed `*`, no markup inside code or numbers.
10. The Spanish body has the same paragraph count and the same ideas in bold and italic as the English one. `npm run check:bodies <pack>` prints `ok`.

## 8. Output

Give three JSON files, one per pack, each in its own code block headed by its path:
`content/llm.json`, `content/embeddings.json`, `content/rag.json`. 2-space indent, `version: 1`. Then one short list: the ids of the cards with a diagram, per pack. No other text.

If the answer is too long for one reply, give one pack per reply, in this order: `rag`, `embeddings`, `llm`, and stop after each one.
