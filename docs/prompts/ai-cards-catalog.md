# Catalog: new AI card packs

A plan for the next AI cards. It does not contain the cards: each row is one card, to be
written later with `docs/prompts/ai-cards.prompt.md` (kinds, levels, limits, diagram rules).

No row repeats an idea of the 90 cards in `content/llm.json`, `content/embeddings.json` and
`content/rag.json`. Where a row is near an existing card, the gist names the difference.

## 1. Gap analysis

The three AI packs teach how a model, a vector index and a retriever work. They do not teach
how to put them into a product. The gaps:

- **The web-app architecture.** No card on the server proxy, the API key in the bundle, rate
  limits, retries, timeouts or a cost cap per user.
- **Streaming to a browser.** No card on server-sent events, `fetch` streams, cancel, proxy
  buffering or partial JSON. This is the first thing a web developer builds.
- **Agents.** `llm-tool-use` and `llm-tool-definition` cover one tool call. Nothing covers the
  loop, step limits, context engineering, compaction or sub-agents.
- **MCP.** Not covered at all. It is now the common way to give a model tools.
- **Evals and observability.** `llm-judge*` and `rag-evaluate-stages` cover grading. Nothing
  covers the eval set, regression runs, variance, traces, pass@k or online feedback.
- **AI in the browser.** Not covered. It fits an offline PWA: WebGPU, WASM, Web Workers,
  model size, weight caching, storage eviction.
- **Reasoning and multimodal models.** Thinking tokens and image tokens change cost and
  latency. Small additions to `llm`, not a pack.
- **Fine-tuning.** `llm-adapt-order` says "fine-tune last". One LoRA card completes it.
- **Advanced retrieval.** Parent-child chunks, contextual chunks, HyDE, Matryoshka and binary
  embeddings. Additions to `rag` and `embeddings`, not a pack.
- **Privacy and guardrails.** They fit inside `ai-web` (logs with PII) and `evals`
  (run-time guardrails). They do not earn a pack of their own.

## 2. Pack proposals

Ranked by value for "AI integration with web apps".

| Rank | id | Title (en) | Title (es) | Needs |
|---|---|---|---|---|
| 1 | `ai-web` | LLMs in a web app | LLMs en una aplicación web | `llm`, `http` |
| 2 | `agents` | Agents, tools and MCP | Agentes, herramientas y MCP | `llm` |
| 3 | `evals` | Evals and observability | Evals y observabilidad | `llm` |
| 4 | `browser-ai` | AI in the browser | IA en el navegador | `embeddings` |

- **`ai-web`**: the path from a button to a model and back. Server proxy, streaming, cancel,
  rate limits, retries, timeouts, cost caps, caching and safe rendering. It turns the `llm`
  theory into a working feature.
- **`agents`**: the tool loop and its limits, context engineering, memory, compaction,
  sub-agents and MCP. It continues `llm-tool-use` from one call to many.
- **`evals`**: how to know a prompt change made things better. Eval sets, graders, variance,
  regression runs, traces and user feedback. It continues `llm-judge` and
  `rag-evaluate-stages` from one score to a process.
- **`browser-ai`**: models that run on the device. WebGPU, WASM, workers, model size, weight
  caching and offline semantic search. It reuses `embeddings` on the client.

## 3. Card catalog

Each pack: 10 concept, 5 snippet, 6 pitfall, 6 quiz, 3 resource. Levels 9 or 8 intro,
14 or 13 intermediate, 7 or 8 advanced, in that order. 10 to 12 diagrams.

### 3.1 `ai-web` — LLMs in a web app

| id | kind | level | title | gist | diagram |
|---|---|---|---|---|---|
| `ai-web-proxy` | concept | intro | The API key stays on the server: the browser calls your endpoint, not the model | Any key in shipped JS is readable in DevTools. Your route adds auth, limits and logs between the page and the model API. | yes |
| `ai-web-streaming` | concept | intro | Stream the answer so the user reads while the model writes | Two numbers: time to first token and tokens per second. A first token at 0.5 s feels fast even when the whole answer takes 10 s. | yes |
| `ai-web-sse` | concept | intro | Server-sent events carry a token stream over one plain HTTP response | `Content-Type: text/event-stream`, `data:` lines, a blank line ends an event, one direction only. `EventSource` sends GET only. | yes |
| `ai-web-fetch-stream` | snippet | intro | Read a streamed response with fetch and a reader | `js`: `res.body.getReader()`, `TextDecoder` with `{ stream: true }`, append each chunk as text. | no |
| `ai-web-abort` | snippet | intro | A stop button is an AbortController | `js`: pass `signal` to `fetch`, call `abort()` on click, catch `AbortError` as a normal end. | no |
| `ai-web-render-untrusted` | pitfall | intro | Model output is untrusted text: never put it into innerHTML | A prompt injection can make the model write `<img onerror>`. Symptom: XSS. Fix: `textContent`, or a Markdown renderer that emits no raw HTML. | no |
| `ai-web-quiz-key` | quiz | intro | Where can the model API key live in a single-page app? | Right: on the server, behind your route. Wrong: a build-time env var, `localStorage`, an obfuscated string. All three ship to the browser. | no |
| `ai-web-quiz-sse` | quiz | intro | Which line ends one server-sent event? | Right: a blank line. Wrong: `event: end`, `data: [DONE]` (a convention of some APIs, not of SSE), closing the connection. | no |
| `ai-web-res-mdn-sse` | resource | intro | MDN: Server-sent events | docs, https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events, ~20 min. | no |
| `ai-web-429` | concept | intermediate | A 429 means slow down: wait the time the server names, then retry | Limits count requests and tokens per minute. Read `Retry-After` when present. | no |
| `ai-web-timeouts` | concept | intermediate | Set two timeouts: one for the first token, one for the whole answer | A first-token timeout of ~10 s catches a stuck queue. A total timeout caps a runaway answer. One timeout cannot do both. | yes |
| `ai-web-token-budget` | concept | intermediate | Cap output tokens per request and tokens per user per day | Cost is input plus output tokens, and output tokens usually cost more. Two caps stop one user or one prompt from spending the month. | yes |
| `ai-web-partial-json` | concept | intermediate | Streamed JSON is invalid until the last brace arrives | `JSON.parse` fails on every chunk but the last. Wait for the end, or use a tolerant parser that closes open brackets for display only. | yes |
| `ai-web-sse-parse` | snippet | intermediate | Parse server-sent events by hand when you must POST | `js`: buffer the text, split on `\n\n`, keep the last partial event, read the `data:` lines. Needed because `EventSource` sends GET only. | no |
| `ai-web-backoff` | snippet | intermediate | Retry with exponential backoff and full jitter | `js`: `delay = random(0, base * 2 ** attempt)`, max 3 tries, only on 429 and 5xx, honour `Retry-After`. | no |
| `ai-web-sse-route` | snippet | intermediate | A Node route that relays the model stream as SSE | `js`: set `text/event-stream` and `Cache-Control: no-cache`, `for await` the upstream chunks, `res.write('data: …\n\n')`. | no |
| `ai-web-abort-upstream` | pitfall | intermediate | The user pressed stop, and the server still pays for the whole answer | The browser closes its connection; the server keeps reading the model. Fix: on request `close`, abort the upstream call. | yes |
| `ai-web-retry-storm` | pitfall | intermediate | Retries without jitter turn one outage into a stampede | 1000 clients retry at the same 1 s, 2 s, 4 s and hit the API in waves. Fix: random jitter and a retry cap. | yes |
| `ai-web-proxy-buffering` | pitfall | intermediate | A buffering proxy turns a stream into one late block | nginx buffering or gzip holds the chunks. Symptom: all text appears at the end. Fix: `X-Accel-Buffering: no`, no compression on the stream. | yes |
| `ai-web-quiz-cors` | quiz | intermediate | Your AI endpoint allows only your origin in CORS. Can a script on another server still call it? | Right: yes, CORS is a browser rule and `curl` ignores it. Wrong: "no, the origin check blocks it". Protect the route with auth and rate limits. | no |
| `ai-web-quiz-retry` | quiz | intermediate | Which responses should an LLM client retry? | Right: 429 and 503. Wrong: 400, 401, 422. The same request gets the same error, so a retry only costs time. | no |
| `ai-web-quiz-ttft` | quiz | intermediate | The chat feels slow: the first token arrives at 5.5 s, the last at 6 s. What do you look at first? | Right: what runs before the model starts (prompt size, retrieval, a queue). Wrong: output length; the output takes only 0.5 s. | yes |
| `ai-web-res-mdn-streams` | resource | intermediate | MDN: Streams API | docs, https://developer.mozilla.org/en-US/docs/Web/API/Streams_API, ~30 min. | no |
| `ai-web-response-cache` | concept | advanced | Cache an answer by a hash of the model, the prompt and the parameters | An exact-match cache is safe and cheap. Put the model id in the key, or a model change serves old answers. | no |
| `ai-web-stream-tool-calls` | concept | advanced | A streamed tool call arrives in fragments: join them before you parse | The arguments come as partial JSON strings, keyed by the tool call index. Parse only when that call is complete. | yes |
| `ai-web-fallback` | concept | advanced | A fallback model keeps the feature up when the main provider fails | A circuit breaker opens after N failures and routes to a second model. Run your evals on the fallback prompts too. | yes |
| `ai-web-semantic-cache` | pitfall | advanced | A semantic cache answers a different question that only looked close | "Cancel my order" and "Can I cancel my order?" are near in vector space. Fix: a high threshold, one cache per user, FAQ-like routes only. | yes |
| `ai-web-pii-logs` | pitfall | advanced | Log every prompt, and you log every secret your users typed | Prompts carry emails, tokens and health data. Fix: redact before you write, short retention, restricted access. | no |
| `ai-web-quiz-abort-cost` | quiz | advanced | A user stops after 50 tokens of an 800-token answer. With no upstream cancel, how many output tokens do you pay for? | Right: about 800. Wrong: 50. The client close does not reach the model call. Ties to `ai-web-abort-upstream`. | no |
| `ai-web-res-rfc6585` | resource | advanced | RFC 6585: Additional HTTP Status Codes (429 Too Many Requests) | docs, https://www.rfc-editor.org/rfc/rfc6585, ~15 min. | no |

### 3.2 `agents` — Agents, tools and MCP

| id | kind | level | title | gist | diagram |
|---|---|---|---|---|---|
| `agents-loop` | concept | intro | An agent is a loop: the model calls tools until it decides it is done | Model → tool call → your code runs it → result back → repeat, until a final answer. `llm-tool-use` is one turn of this loop. | yes |
| `agents-workflow-vs-agent` | concept | intro | Use a fixed workflow when you know the steps, an agent when you do not | A workflow is code that calls the model at set points: cheaper and predictable. An agent picks the steps: flexible and harder to test. | yes |
| `agents-mcp` | concept | intro | MCP lets one tool server work with any client that speaks it | Model Context Protocol: a host, a client per server, servers that offer tools, resources and prompts over JSON-RPC. N clients × M tools becomes N + M. | yes |
| `agents-loop-code` | snippet | intro | The agent loop in fifteen lines | `js`: `while` the reply asks for tools, run each one, append the results as messages, call the model again. | no |
| `agents-max-steps` | snippet | intro | Every loop gets a step limit and a token budget | `js`: a `for` loop to `MAX_STEPS`, add the tokens of each reply, stop with a clear error when either limit is hit. | no |
| `agents-infinite-loop` | pitfall | intro | An agent with no step limit can loop until the budget is gone | The same failing call, retried with small changes, 200 times. Fix: a step limit, a token budget, a check for repeated calls. | no |
| `agents-quiz-workflow` | quiz | intro | A task always runs the same three steps in the same order. What do you build? | Right: a workflow in code. Wrong: an agent with three tools. It costs more and can skip or reorder steps. | no |
| `agents-quiz-mcp` | quiz | intro | What does MCP standardise? | Right: how a client finds and calls tools and reads resources of a server. Wrong: the model's weights, the prompt format, the vector index. | no |
| `agents-res-mcp` | resource | intro | Model Context Protocol: specification and docs | docs, https://modelcontextprotocol.io, ~45 min. | no |
| `agents-context-engineering` | concept | intermediate | Context engineering decides what the model sees on each turn | System prompt, tool definitions, retrieved text, history and notes compete for one window. Choose each turn; do not just append. | yes |
| `agents-tool-design` | concept | intermediate | Design a tool for the model: few tools, clear names, errors it can act on | `search_orders(customer_id)` beats a generic `sql(query)`. An error says what to change: "date must be YYYY-MM-DD". | no |
| `agents-mcp-transports` | concept | intermediate | An MCP server talks over stdio on your machine or over HTTP across the network | stdio: the host starts the server as a child process. HTTP: a remote server, which needs auth. | yes |
| `agents-memory` | concept | intermediate | Agent memory is a file or a store the agent reads back, not the weights | The model forgets between sessions (`llm-stateless`). Memory is notes written by a tool and loaded into the next context. | yes |
| `agents-human-gate` | concept | intermediate | Ask a person before an action you cannot undo | Reads run free; deletes, payments and sent emails wait for approval. The gate is in your code, not in the prompt. | yes |
| `agents-tool-error` | snippet | intermediate | Return a tool error to the model; do not throw it | `js`: `catch` the error and send `{ is_error: true, content: message }` as the tool result. The model can retry or change course. | no |
| `agents-mcp-server` | snippet | intermediate | A minimal MCP server with one tool | `js`: the official TypeScript SDK, one tool with an input schema and a handler, a stdio transport. | no |
| `agents-too-many-tools` | pitfall | intermediate | Fifty tools in the prompt make the model pick the wrong one | Every definition costs tokens and adds a near-duplicate choice. Fix: fewer tools, or load the relevant set per task. | no |
| `agents-huge-tool-result` | pitfall | intermediate | One tool result of 50 000 tokens fills the window in a single call | A full file, a whole web page, a large query result. Fix: paginate, truncate with a note, return a summary and a handle. | yes |
| `agents-success-claim` | pitfall | intermediate | An agent that says "done" has not proved it: check the result in code | The model reports success it did not reach. Fix: a verification step that runs the tests or reads the record back. | no |
| `agents-quiz-steps` | quiz | intermediate | Each step of an agent succeeds 95% of the time. About how often does a 10-step task succeed? | Right: about 60% (0.95¹⁰ ≈ 0.60). Wrong: 95%. Errors compound, so short loops and checks per step matter. | no |
| `agents-quiz-tool-error` | quiz | intermediate | A tool call times out. What does the loop send back to the model? | Right: a tool result that says it timed out. Wrong: nothing, or a crash. The model can retry or choose another path. | no |
| `agents-res-react` | resource | intermediate | Paper: ReAct: Synergizing Reasoning and Acting in Language Models | article, https://arxiv.org/abs/2210.03629, ~40 min. | no |
| `agents-compaction` | concept | advanced | Compact the history before the window fills: summarise old turns, keep the decisions | Replace old tool results with a summary. Keep decisions, open tasks and file paths. Drop raw output. | yes |
| `agents-subagents` | concept | advanced | A sub-agent spends its own context and returns only the result | The parent sends a task and gets back a short report. The search noise never enters the parent's window. | yes |
| `agents-parallel-tools` | snippet | advanced | Run independent tool calls in parallel, and answer each by its id | `js`: `Promise.all` over the calls, map each result to its `tool_use_id`, keep the order. | no |
| `agents-lethal-trifecta` | pitfall | advanced | Private data, untrusted input and a way to send data out: never give one agent all three | An injected page tells the agent to send your files to a URL. `llm-quiz-injection-defence` asks the question; this card names the pattern. | yes |
| `agents-mcp-trust` | pitfall | advanced | An MCP server runs with your permissions: install it like a dependency | A tool description can carry an injection; an update can change behaviour. Fix: known sources, pinned versions, least privilege. | no |
| `agents-quiz-context` | quiz | advanced | After 80 turns an agent is slow and forgets early decisions. What helps most? | Right: compact the history and keep a notes file of decisions. Wrong: a larger window. It costs more, and the middle is still read badly. | no |
| `agents-quiz-trifecta` | quiz | advanced | You assume a prompt injection will happen. Which capability do you remove to stop data leaks? | Right: the ability to send data out (outbound requests, email). Wrong: the system prompt warning. It does not bind the model. | no |
| `agents-res-swe-bench` | resource | advanced | Paper: SWE-bench: Can Language Models Resolve Real-World GitHub Issues? | article, https://arxiv.org/abs/2310.06770, ~45 min. | no |

### 3.3 `evals` — Evals and observability

| id | kind | level | title | gist | diagram |
|---|---|---|---|---|---|
| `evals-why` | concept | intro | An eval is a test suite for behaviour you cannot assert exactly | Fixed inputs, a grader per case, a pass rate. It replaces "it looked fine in the playground". | no |
| `evals-golden-set` | concept | intro | Start with 30 real inputs and the outcome you expect for each | Take them from logs and support tickets, not from imagination. Grow the set with every bug. | no |
| `evals-graders` | concept | intro | Grade with code first, a model second, a person last | Code: exact, free, instant. LLM judge: open-ended text (`llm-judge`). A person: calibrates the other two. | yes |
| `evals-regression` | concept | intro | Run the eval on every prompt change, like a unit test | A prompt is code. A pass rate drop blocks the change, the same way a failing test blocks a merge. | yes |
| `evals-code-grader` | snippet | intro | A code grader checks shape before meaning | `js`: parse the JSON, check required fields and types, reject a forbidden phrase. Return pass or fail and a reason. | no |
| `evals-vibes` | pitfall | intro | Ten good chats in the playground are not an eval | You test the inputs you thought of, once each. Fix: a fixed set, several runs, a score you compare over time. | no |
| `evals-easy-cases` | pitfall | intro | An eval set of easy cases always passes | A 100% score tells you nothing. Fix: add the hard, ambiguous and adversarial cases that failed in production. | no |
| `evals-quiz-grader` | quiz | intro | The output must be valid JSON with an ISO date field. Which grader do you use? | Right: a code check. Wrong: an LLM judge. It is slower, costs money and can be wrong on a rule code checks exactly. | no |
| `evals-res-promptfoo` | resource | intro | Repo: promptfoo, test and evaluate LLM prompts | repo, https://github.com/promptfoo/promptfoo, ~30 min. | no |
| `evals-variance` | concept | intermediate | Run each case several times: one run of a sampled model is an anecdote | The same case passes 7 of 10 runs. Report the pass rate per case, not one pass or fail. | yes |
| `evals-trace` | concept | intermediate | A trace records every step of one request: prompts, tool calls, tokens and time | One trace per request, one span per step. It shows which step was slow, costly or wrong. | yes |
| `evals-offline-online` | concept | intermediate | Offline evals gate a release; online metrics catch what the set missed | Offline: fixed set, before deploy. Online: thumbs, retries, abandon rate, after deploy. You need both. | yes |
| `evals-user-feedback` | concept | intermediate | A thumbs-down is a label: route it into the eval set | Each negative rating with its trace becomes a candidate case. Review it, fix it, keep it as a regression test. | yes |
| `evals-runner` | snippet | intermediate | An eval runner in twenty lines | `js`: for each case, run N times, grade each output, print the pass rate per case and overall. | no |
| `evals-trace-sql` | snippet | intermediate | Find the slow and costly routes in your traces | `sql`: p95 latency and average tokens per route, last 7 days, `percentile_cont(0.95)`. | no |
| `evals-cost-sql` | snippet | intermediate | Cost per feature is tokens times a rate table | `sql`: join the token log to a `rates` table by model, sum per feature per day. No price in the code. | no |
| `evals-overfit-set` | pitfall | intermediate | A prompt tuned on the eval set scores well on the eval set only | A week of tweaks fits those 50 cases. Fix: keep a holdout set you never tune on. | yes |
| `evals-model-drift` | pitfall | intermediate | The provider updated the model, and your scores moved | An alias such as "latest" points to a new model. Fix: pin a dated model id, and run the evals before you move. | no |
| `evals-quiz-runs` | quiz | intermediate | A case passes 7 of 10 runs. What does that tell you? | Right: it fails about 30% of the time for users. Wrong: "it passes" or "it is broken". It is flaky; report the rate. | no |
| `evals-quiz-holdout` | quiz | intermediate | You tuned a prompt for a week on 50 cases and reached 96%. What do you do before you ship? | Right: run it on a holdout set it never saw. Wrong: add more instructions. The 96% may be overfit. | no |
| `evals-quiz-trace` | quiz | intermediate | One request took 14 s. Which data shows the slow step? | Right: the trace, with a span per step and its time. Wrong: the average latency, the error log, the token count. | no |
| `evals-res-otel-genai` | resource | intermediate | OpenTelemetry: semantic conventions for generative AI | docs, https://opentelemetry.io/docs/specs/semconv/gen-ai/, ~30 min. | no |
| `evals-pass-at-k` | concept | advanced | pass@k asks if any of k tries succeeds; pass^k asks if all of them do | With p = 0.8: pass@3 ≈ 0.99, pass^3 ≈ 0.51. A user who retries sees pass@k; a user who trusts one try sees pass^k. | yes |
| `evals-guardrails` | concept | advanced | A guardrail checks the input or the output at run time, outside the model | A classifier or a rule blocks, redacts or rewrites. It is code you test, not an instruction the model may skip. | yes |
| `evals-ab-compare` | snippet | advanced | Compare two prompts on the same cases: wins, losses and ties | `js`: run A and B per case, grade both, count wins, losses and ties, print the cases that changed. | no |
| `evals-mean-hides` | pitfall | advanced | An average score hides the category that broke | Overall 91% → 92%, but refunds 90% → 60%. Fix: tag cases by category and report each one. | yes |
| `evals-contamination` | pitfall | advanced | A public benchmark may be in the model's training data | A high score can be memory, not skill. Fix: your own cases from your own data, kept private. | no |
| `evals-quiz-pass-at-k` | quiz | advanced | Each try succeeds with p = 0.5, and tries are independent. What is pass@3? | Right: 0.875 (1 − 0.5³). Wrong: 1.5 or 0.5. Show the complement. | no |
| `evals-quiz-sample-size` | quiz | advanced | Prompt A passes 41 of 50 cases, prompt B passes 44 of 50. Is B better? | Right: not shown yet. 3 cases is inside the noise of 50 (and of reruns). Wrong: "yes, +6 points". Look at the changed cases. | no |
| `evals-res-helm` | resource | advanced | Paper: Holistic Evaluation of Language Models (HELM) | article, https://arxiv.org/abs/2211.09110, ~60 min. | no |

### 3.4 `browser-ai` — AI in the browser

| id | kind | level | title | gist | diagram |
|---|---|---|---|---|---|
| `browser-ai-why` | concept | intro | A model in the browser works offline and keeps the data on the device | No server cost per call, no network after the download. The price is a large download and a weaker model. | yes |
| `browser-ai-small-models` | concept | intro | A browser runs small models: millions of parameters, not hundreds of billions | Download size and device memory set the limit. A 100 MB model is reasonable; 4 GB is not, on a phone. | no |
| `browser-ai-model-size` | concept | intro | Model size in bytes is parameters times bytes per weight | 500 M parameters: 2 GB in fp32, 1 GB in fp16, 250 MB in 4 bits. | yes |
| `browser-ai-tasks` | concept | intro | Embeddings, classification and short summaries fit a browser; long reasoning does not | Small models do narrow tasks well. Open-ended chat and multi-step reasoning need a large model on a server. | yes |
| `browser-ai-detect-webgpu` | snippet | intro | Check for WebGPU before you load a model | `js`: `navigator.gpu` exists, `requestAdapter()` returns an adapter, otherwise fall back to WASM. | no |
| `browser-ai-first-load` | pitfall | intro | The first visit downloads the whole model: show the size and ask first | A silent 300 MB download on mobile data. Fix: show size and progress, start on a user action, prefer Wi-Fi. | no |
| `browser-ai-quiz-size` | quiz | intro | A model has 1 billion parameters stored in fp16. About how large is the download? | Right: about 2 GB (2 bytes per weight). Wrong: 1 GB (that is 8 bits), 4 GB (that is fp32). | no |
| `browser-ai-quiz-offline` | quiz | intro | The model is cached. Which feature still works with no network? | Right: on-device semantic search over local notes. Wrong: answers about today's news, a call to a hosted model. | no |
| `browser-ai-res-transformers-js` | resource | intro | Repo: Transformers.js, run models in the browser | repo, https://github.com/huggingface/transformers.js, ~30 min. | no |
| `browser-ai-webgpu` | concept | intermediate | WebGPU gives a page the GPU for compute; WASM is the CPU fallback | WebGPU runs matrix work as compute shaders, often many times faster. WASM runs everywhere, slower. | yes |
| `browser-ai-worker` | concept | intermediate | Run inference in a Web Worker so the page stays responsive | Inference blocks the thread that runs it. In a worker the UI keeps scrolling; results come back by `postMessage`. | yes |
| `browser-ai-cache-weights` | concept | intermediate | Download the weights once and keep them in the Cache API or OPFS | Store by URL and version. Next visit: read from disk, no network. | yes |
| `browser-ai-onnx` | concept | intermediate | ONNX is the portable model format a web runtime loads | Train in PyTorch, export to ONNX, quantise, run with ONNX Runtime Web on WebGPU or WASM. | yes |
| `browser-ai-embed-pipeline` | snippet | intermediate | Embed text in the browser with Transformers.js | `js`: `pipeline('feature-extraction', model)`, call with `{ pooling: 'mean', normalize: true }`. Links to `embeddings-normalise`. | no |
| `browser-ai-worker-msg` | snippet | intermediate | A worker protocol with progress, result and error messages | `js`: `postMessage({ type, id, … })` both ways, a `Map` of pending promises by id. | no |
| `browser-ai-storage-estimate` | snippet | intermediate | Ask for persistent storage before you cache a model | `js`: `navigator.storage.estimate()` for free space, `navigator.storage.persist()` to resist eviction. | no |
| `browser-ai-mobile-memory` | pitfall | intermediate | A model that runs on a laptop can crash a tab on a phone | The tab is killed with no error you can catch. Fix: a smaller or more quantised model on low-memory devices. | no |
| `browser-ai-eviction` | pitfall | intermediate | The browser can delete cached weights unless storage is persistent | Under storage pressure, best-effort data goes first. Symptom: a full re-download. Fix: `persist()`, and check the cache at start. | no |
| `browser-ai-shader-warmup` | pitfall | intermediate | The first WebGPU run is slow because shaders compile on first use | The first call takes seconds, the next ones milliseconds. Fix: a warm-up run on a short input after load. | no |
| `browser-ai-quiz-worker` | quiz | intermediate | Inference takes 400 ms and the page stutters while it runs. What fixes the stutter? | Right: move inference to a Web Worker. Wrong: a faster model. It shortens the freeze but keeps it on the main thread. | no |
| `browser-ai-quiz-int4` | quiz | intermediate | You quantise a 2 GB fp16 model to 4 bits per weight. About what size is it now? | Right: about 500 MB (16 → 4 bits). Wrong: 1 GB (that is 8 bits). Model weights, not the vectors of `embeddings-quiz-int8`. | no |
| `browser-ai-quiz-no-webgpu` | quiz | intermediate | `navigator.gpu` is undefined on a user's phone. What do you do? | Right: fall back to WASM, or to a server model when the user allows it. Wrong: show an error and stop the feature. | yes |
| `browser-ai-res-mdn-webgpu` | resource | intermediate | MDN: WebGPU API | docs, https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API, ~30 min. | no |
| `browser-ai-hybrid` | concept | advanced | Route easy requests to the device and hard ones to the server | A small local model classifies or embeds; a large hosted model answers what the small one cannot. | yes |
| `browser-ai-built-in` | concept | advanced | Some browsers ship a built-in model: detect the API, never assume it | These APIs are new and differ between browsers. Check that the API exists, check its availability, show the download state. | no |
| `browser-ai-local-search` | snippet | advanced | Offline semantic search over a Float32Array | `js`: vectors in one flat `Float32Array`, dot product per row (vectors normalised), keep the top k. Fine up to tens of thousands of rows. | no |
| `browser-ai-sw-precache` | pitfall | advanced | A service worker that precaches the model blocks install on a 300 MB download | Install waits for every precached file. Fix: precache the app shell only; cache the model at run time in its own cache. | yes |
| `browser-ai-quantised-quality` | pitfall | advanced | A 4-bit model is smaller and worse: measure it on your task | Quantisation loses quality unevenly between tasks. Fix: run your eval set on each quantised version. | no |
| `browser-ai-quiz-privacy` | quiz | advanced | Which claim about an on-device model is true? | Right: the input stays on the device unless your code sends it. Wrong: "the model file is secret". Anyone can download it. | no |
| `browser-ai-res-onnx-web` | resource | advanced | ONNX Runtime Web: tutorials | docs, https://onnxruntime.ai/docs/tutorials/web/, ~45 min. | no |

## 4. Extensions to existing packs

Each fills a gap the gap analysis names. Append them to the pack, in level order.

### 4.1 `llm`

| id | kind | level | title | gist | diagram |
|---|---|---|---|---|---|
| `llm-base-vs-instruct` | concept | intro | A base model continues text; an instruction-tuned model follows requests | Pretraining teaches the next token. Instruction tuning and preference training teach the assistant behaviour. | yes |
| `llm-reasoning-tokens` | concept | intermediate | A reasoning model writes hidden tokens before it answers, and you pay for them | Thinking tokens count as output: more cost and latency, better results on multi-step problems. | yes |
| `llm-image-tokens` | concept | intermediate | An image costs tokens too, and its size sets the count | The image is cut into patches and each patch becomes tokens. Resize before you send. | no |
| `llm-lora` | concept | advanced | LoRA fine-tunes a small add-on, not the whole model | Two small matrices per layer, trained on your data. Megabytes in place of gigabytes. Follows `llm-adapt-order`. | yes |
| `llm-paper-cot` | resource | intermediate | Paper: Chain-of-Thought Prompting Elicits Reasoning in Large Language Models | article, https://arxiv.org/abs/2201.11903, ~40 min. | no |

### 4.2 `embeddings`

| id | kind | level | title | gist | diagram |
|---|---|---|---|---|---|
| `embeddings-sparse-dense` | concept | intermediate | A sparse vector scores words; a dense vector scores meaning | Sparse: one dimension per term, most zeros (BM25-like). Dense: few hundred dimensions, all filled. | yes |
| `embeddings-query-prefix` | pitfall | intermediate | Some models expect one prefix for queries and another for documents | Missing prefixes lower recall with no error. Fix: read the model card and apply the prefixes at both ends. | no |
| `embeddings-matryoshka` | concept | advanced | A Matryoshka embedding keeps most of its quality when you cut its tail | Trained so the first 256 of 1024 dimensions still work. Short vectors for search, full ones to rescore. | yes |
| `embeddings-binary` | concept | advanced | Binary quantisation keeps one bit per dimension: search with bits, rescore with floats | 32× smaller, Hamming distance. Take the top 100 by bits, rerank them with the full vectors. | yes |

### 4.3 `rag`

| id | kind | level | title | gist | diagram |
|---|---|---|---|---|---|
| `rag-pdf-extraction` | pitfall | intermediate | PDF text extraction scrambles tables and columns | Two columns become interleaved lines. Fix: a layout-aware parser, and a check of the text of a sample. | no |
| `rag-parent-child` | concept | intermediate | Search small chunks, then send their parent section to the model | Small chunks match precisely; the parent gives the model enough context to answer. | yes |
| `rag-contextual-chunks` | concept | advanced | Add a line of context to each chunk before you embed it | "From the 2025 refund policy, section 3:" makes a bare chunk findable. Generate the line once at index time. | yes |
| `rag-hyde` | concept | advanced | HyDE embeds a draft answer to find the real one | The model writes a guess; the guess looks more like the documents than the question does. Search with its vector. | yes |

## 5. The Learn AI path

Two new packs and the `ai` path that runs through them and the six AI packs above. The path
model is in `docs/superpowers/plans/2026-11-27-ai-guide-path.md`: a step is a pack id (all its
cards, in pack order) or a card id (that one card).

| id | Title (en) | Title (es) | Needs |
|---|---|---|---|
| `ai-foundations` | AI foundations | Fundamentos de IA | none |
| `ai-roadmap` | AI roadmap | Hoja de ruta de IA | none |

- **`ai-foundations`**: how a model learns, from a loss and a gradient to a transformer, and
  what pretraining and post-training add. It ends where `llm-tokens` begins.
- **`ai-roadmap`**: the guide itself. A start card, one bridge card and one checkpoint quiz per
  stage, milestone projects and resources. Its cards are meant to be read in path order, not
  in pack order.

### 5.1 `ai-foundations` — AI foundations

13 concept, 3 snippet, 6 pitfall, 5 quiz, 3 resource: the plan lists 13 ideas that need a
concept card. Levels 9 intro, 13 intermediate, 8 advanced. 12 diagrams.

| id | kind | level | title | gist | diagram |
|---|---|---|---|---|---|
| `ai-foundations-ai-ml-dl` | concept | intro | Deep learning is a kind of machine learning, and machine learning is a kind of AI | Three nested sets. AI: any program that acts smart, rules included. ML: rules learned from data. Deep learning: ML with many-layer networks. | yes |
| `ai-foundations-learning-types` | concept | intro | Three ways to learn: from answers, from structure, from reward | Supervised: examples with the right answer. Unsupervised: no answers, find groups. Reinforcement: actions, then a reward signal. | yes |
| `ai-foundations-features-labels` | concept | intro | Features are what the model sees; the label is what it must predict | One row per example: area, rooms and street are features, price is the label. A model without labels cannot learn a supervised task. | yes |
| `ai-foundations-loss` | concept | intro | A loss function turns "how wrong" into one number to make smaller | Squared error for a number, cross-entropy for a class. Training is a search for the weights with the lowest average loss. | yes |
| `ai-foundations-overfitting` | pitfall | intro | A model that learns the training set by heart fails on new data | Symptom: training loss falls, validation loss rises. Fix: more data, a smaller model, regularisation, stop early. | yes |
| `ai-foundations-data-leakage` | pitfall | intro | Test data that leaks into training makes a bad model look excellent | Duplicates across sets, a feature computed from the label, normalising before the split. Fix: split first, then fit anything. | no |
| `ai-foundations-imbalanced` | pitfall | intro | 99 % accuracy means nothing when 99 % of the examples are one class | A model that always says "not fraud" scores 99 %. Fix: precision, recall and a confusion matrix per class. | no |
| `ai-foundations-quiz-split` | quiz | intro | You have a training, a validation and a test set. Which one picks the learning rate? | Right: validation. Wrong: training (it rewards memorising), test (then it no longer measures new data), all three. | no |
| `ai-foundations-res-3b1b` | resource | intro | 3Blue1Brown: Neural networks | video, https://www.3blue1brown.com/topics/neural-networks, ~2 h. | no |
| `ai-foundations-gradient-descent` | concept | intermediate | Gradient descent walks downhill on the loss, one small step at a time | The gradient points uphill; step against it. The learning rate sets the step size. | yes |
| `ai-foundations-gradient-descent-js` | snippet | intermediate | Fit a line with gradient descent in ten lines of JavaScript | `js`: `y = w * x + b`, mean squared error, the two partial derivatives, `w -= lr * dw` in a loop. | no |
| `ai-foundations-learning-rate` | pitfall | intermediate | A learning rate too high makes the loss jump or explode | Each step overshoots the valley. Symptom: loss oscillates or becomes `NaN`. Fix: divide it by 10; too low only makes training slow. | yes |
| `ai-foundations-neuron-layers` | concept | intermediate | A neuron is a weighted sum plus an activation; a layer is many of them side by side | Inputs × weights + bias, then a nonlinear function. Layers feed each other; "deep" means many layers. | yes |
| `ai-foundations-quiz-activation` | quiz | intermediate | Why does a network need a nonlinear activation between its layers? | Right: without one, many linear layers collapse into one linear map. Wrong: to speed up training, to keep the outputs positive, to save memory. | no |
| `ai-foundations-backprop` | concept | intermediate | Backpropagation sends the error back through the layers to get every gradient | The chain rule, applied from the loss to the first layer. One backward pass gives the gradient of every weight. | yes |
| `ai-foundations-softmax` | snippet | intermediate | Softmax turns raw scores into probabilities that sum to 1 | `js`: subtract the max for stability, `Math.exp`, divide by the sum. The function behind `llm-temperature`, here without the temperature. | no |
| `ai-foundations-representations` | concept | intermediate | The hidden layers learn their own features, and those features are the representation | Early layers find simple patterns, later ones combine them. Differs from `embeddings-what-is`: how a network learns vectors, not how to store and search them. | no |
| `ai-foundations-rnn-attention` | concept | intermediate | An RNN squeezes the whole past into one vector; attention looks back at every token | The fixed vector forgets the start of a long text, and the steps cannot run in parallel. Attention keeps every position and weighs them. | yes |
| `ai-foundations-self-attention` | concept | intermediate | In self-attention, each token mixes in the tokens of the same text it finds relevant | Query, key and value per token. Scores are query · key, softmax gives the weights, the output is the weighted sum of values. | yes |
| `ai-foundations-attention-js` | snippet | intermediate | Dot-product attention for one query, in plain JavaScript | `js`: `scores = keys.map(k => dot(q, k) / Math.sqrt(d))`, softmax, then the weighted sum of `values`. | no |
| `ai-foundations-quiz-positional` | quiz | intermediate | You shuffle the words of a sentence. Without positional encoding, what does self-attention see? | Right: the same set of tokens, so the same outputs in a new order. Wrong: a different meaning, an error, random noise. Order comes only from the position signal. | no |
| `ai-foundations-res-karpathy` | resource | intermediate | Andrej Karpathy: Neural Networks: Zero to Hero | video, https://karpathy.ai/zero-to-hero.html, ~15 h. | no |
| `ai-foundations-transformer-block` | concept | advanced | A transformer is one block stacked many times: attention, then a small network | Each block: self-attention, a feed-forward layer, residual connections and normalisation. Depth is the number of blocks. | yes |
| `ai-foundations-pretraining` | concept | advanced | Pretraining predicts the next token of a huge text, and the text itself is the label | No human labels: every position is a training example. The text is first cut into tokens; `llm-tokens` begins there. | no |
| `ai-foundations-post-training` | concept | advanced | Instruction tuning shows good answers; preference tuning ranks two of them | Instruction data: prompt and ideal reply. RLHF: people pick the better of two replies, a reward model learns it. Differs from `llm-base-vs-instruct`: how the data looks, not the behaviour. | no |
| `ai-foundations-knows-facts` | pitfall | advanced | A model stores the statistics of text, not a table of facts | It has no lookup and no date for what it read. A rare fact is a weak pattern. Differs from `llm-hallucination`: why it happens, not how it looks. Fix: give it the source. | no |
| `ai-foundations-bigger-better` | pitfall | advanced | Scaling laws predict a lower loss, not a better result on your task | Loss falls smoothly with more parameters, data and compute. A smaller tuned model can win on one task, faster and cheaper. Fix: measure on your eval set. | no |
| `ai-foundations-quiz-gpu-memory` | quiz | advanced | A 7 billion parameter model in 16-bit floats. How much GPU memory do its weights take? | Right: about 14 GB (2 bytes × 7 B). Wrong: 7 GB, 28 GB, 3.5 GB. The cache of the context and the activations come on top. | no |
| `ai-foundations-quiz-inference-cost` | quiz | advanced | You train a model once and serve it to millions of users. Which cost usually grows without limit? | Right: inference, paid on every request. Wrong: training, the dataset, storage of the weights. Training is large but paid once. | no |
| `ai-foundations-res-alammar` | resource | advanced | Jay Alammar: The Illustrated Transformer | article, https://jalammar.github.io/illustrated-transformer/, ~40 min. | no |

### 5.2 `ai-roadmap` — AI roadmap

Built for the path, so it breaks the usual kind mix: 15 concept, 1 snippet, 3 pitfall,
8 quiz, 3 resource. One bridge card (`ai-roadmap-<stage>`), one checkpoint quiz
(`ai-roadmap-quiz-<stage>`) and at most one milestone (`ai-roadmap-build-<stage>`) per stage.
Levels follow the stage: foundations, `llm` and `embeddings` intro; `rag`, `ai-web` and
`agents` intermediate; `evals` and `browser-ai` advanced. 10 intro, 13 intermediate,
7 advanced. 11 diagrams: the start card and the bridges show the eight stages with the
current one in blue. A bridge says why the stage comes now and what you can build after it.
Each card names its place in the steps in the last column.

| id | kind | level | title | gist | diagram | place |
|---|---|---|---|---|---|---|
| `ai-roadmap-start` | concept | intro | The guide gives you the cards in order: eight stages, each one a pack | Bridge, pack, checkpoint quiz, milestone, then the next stage. Switch it off in Settings to go back to the random feed. | yes | step 1 |
| `ai-roadmap-foundations` | concept | intro | Stage 1, foundations: learn how a model learns before you use one | Loss, gradients, layers and attention explain every later limit. After it: train a tiny model and read a model card. | yes | before `ai-foundations` |
| `ai-roadmap-quiz-foundations` | quiz | intro | Training loss falls, validation loss rises after epoch 5. What do you do? | Right: stop at epoch 5 or regularise. Wrong: train longer, raise the learning rate, test on the training set. Checks `ai-foundations-overfitting`. | no | after `ai-foundations` |
| `ai-roadmap-build-foundations` | concept | intro | Milestone: train one neuron in JavaScript and plot its loss | Two inputs, one weight each, gradient descent, a falling loss curve. No library. Uses `ai-foundations-gradient-descent-js`. | no | after `ai-roadmap-quiz-foundations` |
| `ai-roadmap-res-hf-course` | resource | intro | Hugging Face: LLM Course | course, https://huggingface.co/learn/llm-course, ~20 h. | no | last steps, 1 of 3 |
| `ai-roadmap-llm` | concept | intro | Stage 2, LLMs: what a model call costs and what it cannot know | Tokens, context, sampling and prompts. After it: call a model API and read its usage. | yes | before `llm` |
| `ai-roadmap-quiz-llm` | quiz | intro | You send a second message without the first. What does the model remember of the first? | Right: nothing; you send the history on every call. Wrong: the last turn, a summary, everything for 24 h. Checks `llm-stateless`. | no | after `llm` |
| `ai-roadmap-build-llm` | snippet | intro | Milestone: call a model from a Node script and print the stop reason and token counts | `js`: `fetch` to the API, key from `process.env`, log the reply, `stop_reason` and the input and output tokens. | no | after `ai-roadmap-quiz-llm` |
| `ai-roadmap-embeddings` | concept | intro | Stage 3, embeddings: search by meaning, not by words | Vectors, distances and indexes. After it: find similar notes or tickets. No milestone: the `rag` one uses it. | yes | before `embeddings` |
| `ai-roadmap-quiz-embeddings` | quiz | intro | You switch to a new embedding model. What happens to the stored vectors? | Right: embed them all again. Wrong: keep them, convert them, re-embed only new rows. Checks `embeddings-model-change`. | no | after `embeddings` |
| `ai-roadmap-tutorial-hell` | pitfall | intermediate | Ten tutorials and no project: reading feels like progress, building is progress | Symptom: you follow each step and cannot start alone. Fix: do each milestone before the next stage. | no | after `ai-roadmap-build-foundations` |
| `ai-roadmap-rag` | concept | intermediate | Stage 4, RAG: give the model the facts it does not have | Chunk, embed, retrieve, answer with sources. After it: Q&A over your own documents. | yes | before `rag` |
| `ai-roadmap-quiz-rag` | quiz | intermediate | A RAG answer is wrong and the right chunk is not in the top-k. What do you fix first? | Right: retrieval (chunks, query, index). Wrong: the prompt, the model, the temperature. Checks `rag-evaluate-stages`. | no | after `rag` |
| `ai-roadmap-build-rag` | concept | intermediate | Milestone: Q&A over your own notes, with a citation on every answer | Chunk the notes, embed them, search the top 5, answer with source links. Covers `embeddings` and `rag`. | yes | after `ai-roadmap-quiz-rag` |
| `ai-roadmap-ai-web` | concept | intermediate | Stage 5, LLMs in a web app: from a script to a feature people use | Proxy, streaming, cancel, limits, safe rendering. After it: ship a chat page. | yes | before `ai-web` |
| `ai-roadmap-quiz-ai-web` | quiz | intermediate | Which two changes stop one user from spending your monthly model budget? | Right: an output token cap per request and a token budget per user. Wrong: CORS, a longer timeout, a semantic cache. Checks `ai-web-token-budget`. | no | after `ai-web` |
| `ai-roadmap-build-ai-web` | concept | intermediate | Milestone: a streamed chat page behind your own route, with a stop button | Key on the server, SSE, abort up to the model call, a daily token cap, `textContent` for output. | no | after `ai-roadmap-quiz-ai-web` |
| `ai-roadmap-framework-first` | pitfall | intermediate | A framework first hides the one API call you must understand | Symptom: an error inside five layers you never read. Fix: build the milestone with plain `fetch`, then pick a framework. | no | after `ai-roadmap-build-ai-web` |
| `ai-roadmap-agents` | concept | intermediate | Stage 6, agents: let the model choose the next tool call | The loop, step limits, context and MCP. After it: an assistant that acts, not only answers. | yes | before `agents` |
| `ai-roadmap-quiz-agents` | quiz | intermediate | Your agent calls the same tool 40 times and never answers. What was missing? | Right: a step limit. Wrong: a bigger model, a higher temperature, a longer context. Checks `agents-loop`. | no | after `agents` |
| `ai-roadmap-build-agents` | concept | intermediate | Milestone: an agent with two tools and a step limit that answers questions about a repo | Tools: list files and read a file. Max 10 steps, a log of each call. | yes | after `ai-roadmap-quiz-agents` |
| `ai-roadmap-res-fastai` | resource | intermediate | fast.ai: Practical Deep Learning for Coders | course, https://course.fast.ai/, ~20 h. | no | last steps, 2 of 3 |
| `ai-roadmap-res-api-docs` | resource | intermediate | Anthropic API docs: Messages (or the reference of your provider) | docs, https://docs.anthropic.com/en/api/messages, ~30 min. | no | last steps, 3 of 3 |
| `ai-roadmap-skip-evals` | pitfall | advanced | Without an eval set, every prompt change is a guess | Symptom: a fix for one case breaks three others, and nobody sees it. Fix: the `evals` stage before more features. | no | after `ai-roadmap-build-agents` |
| `ai-roadmap-evals` | concept | advanced | Stage 7, evals: prove that a change made things better | Eval sets, graders, variance, traces. After it: change a prompt without fear. | yes | before `evals` |
| `ai-roadmap-quiz-evals` | quiz | advanced | A prompt change raises the eval score from 81 % to 83 % on one run. Is it better? | Right: unknown until you run it several times and see the variance. Wrong: yes, no, only with a bigger set. Checks the variance cards of `evals`. | no | after `evals` |
| `ai-roadmap-build-evals` | concept | advanced | Milestone: 30 eval cases in CI that block a prompt change with a lower score | Cases from real questions, a grader per case, a threshold, a run on every pull request. | no | after `ai-roadmap-quiz-evals` |
| `ai-roadmap-browser-ai` | concept | advanced | Stage 8, AI in the browser: run the model on the device | WebGPU, WASM, workers, model size, caching. After it: AI features that work offline and keep data local. | yes | before `browser-ai` |
| `ai-roadmap-quiz-browser-ai` | quiz | advanced | Where does a 300 MB model belong in an offline PWA? | Right: a runtime cache, filled after install. Wrong: the precache, `localStorage`, the app bundle. Checks `browser-ai-sw-precache`. | no | after `browser-ai` |
| `ai-roadmap-build-browser-ai` | concept | advanced | Milestone: offline semantic search in a PWA, with the model in a worker | Embed in a Web Worker, cache the weights, search with the network off. | no | after `ai-roadmap-quiz-browser-ai` |

### 5.3 The `ai` path

```json
{
  "id": "ai",
  "title": "Learn AI",
  "translations": { "es": { "title": "Aprender IA" } },
  "steps": [
    "ai-roadmap-start",
    "ai-roadmap-foundations", "ai-foundations", "ai-roadmap-quiz-foundations", "ai-roadmap-build-foundations",
    "ai-roadmap-tutorial-hell",
    "ai-roadmap-llm", "llm", "ai-roadmap-quiz-llm", "ai-roadmap-build-llm",
    "ai-roadmap-embeddings", "embeddings", "ai-roadmap-quiz-embeddings",
    "ai-roadmap-rag", "rag", "ai-roadmap-quiz-rag", "ai-roadmap-build-rag",
    "ai-roadmap-ai-web", "ai-web", "ai-roadmap-quiz-ai-web", "ai-roadmap-build-ai-web",
    "ai-roadmap-framework-first",
    "ai-roadmap-agents", "agents", "ai-roadmap-quiz-agents", "ai-roadmap-build-agents",
    "ai-roadmap-skip-evals",
    "ai-roadmap-evals", "evals", "ai-roadmap-quiz-evals", "ai-roadmap-build-evals",
    "ai-roadmap-browser-ai", "browser-ai", "ai-roadmap-quiz-browser-ai", "ai-roadmap-build-browser-ai",
    "ai-roadmap-res-hf-course", "ai-roadmap-res-fastai", "ai-roadmap-res-api-docs"
  ]
}
```

Every `ai-roadmap` card is a step of its own, so the pack id is not a step. Flattened, the path
has 283 cards today (30 + 30 + 103 in `llm`, `embeddings`, `rag` + 120 in the four packs of section 3), each once.

## Totals

| Part | Cards |
|---|---|
| `ai-web` | 30 |
| `agents` | 30 |
| `evals` | 30 |
| `browser-ai` | 30 |
| `llm` extensions | 5 |
| `embeddings` extensions | 4 |
| `rag` extensions | 4 |
| `ai-foundations` | 30 |
| `ai-roadmap` | 30 |
| **All** | **193** |
