# post-lab v1 implementation plan

Status: plan only, no code. Stack and storage layout come from `CLAUDE.md` and are not reopened here.
Versions below were checked against the npm registry on 2026-10-27. Excalidraw behaviour was checked against the published `@excalidraw/excalidraw@0.18.1` type definitions and bundle.

## Decisions made while planning

| Topic | Decision |
|---|---|
| Freehand and plain shapes | New item type `drawing` (freedraw, rectangle, ellipse, diamond, line, unbound arrow). Every canvas element maps to a file. |
| Note and text rendering | Native Excalidraw text. The markdown body is shown as typed, not rendered. In-canvas editing, wrapping and arrow binding all work. |
| Link embeds | The server unfurls OpenGraph metadata into the item file. Known embed providers (YouTube, Vimeo, Figma, etc.) render as a live iframe. Every other URL renders as a preview card. |
| Node | `engines.node: "^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0"`. This is the intersection of chokidar 6 (`>=22.22`) and write-file-atomic 8 (`^22.22.2 \|\| ^24.15.0 \|\| >=26`). |
| TypeScript | Pinned to **6.0.3**, not 7.0.2. `typescript-eslint@8.72.1` peers `typescript >=4.8.4 <6.1.0`. |
| WebSocket | `@hono/node-server@2.1.5` has built-in `upgradeWebSocket` + `ws`. `@hono/node-ws@1.3.1` is not used: it peers `@hono/node-server ^1.19.11`. |
| Item IDs | `id` = file stem, regex `^[A-Za-z0-9_-]{1,64}$`. UI-created items keep Excalidraw's generated element id. Agents can use readable slugs (`churn-chart`). Renaming ids mid-edit would break Excalidraw text editing, so ids are never rewritten. |
| Cell runs | Manual only: Run from the UI. Editing a cell file never triggers a run. |
| Package shape | Single npm package, not a workspace. `src/shared` is imported by both server and web. |
| Item hyperlink | A single optional `link` field per item, mapped to Excalidraw's `element.link`. This replaces `links` in `CLAUDE.md`. Item-to-item relations are modelled by `connector` items. |
| Agent pointer | post-lab adds a marked pointer block to the host repo's root `AGENTS.md` that points to `post-lab/AGENTS.md` (M7). |

---

## Package layout (tool code, this repo)

```
package.json                 # name: post-lab, bin: { "post-lab": "dist/cli.js" }, type: module
pnpm-lock.yaml
tsconfig.json                # references: tsconfig.node.json, tsconfig.web.json
tsconfig.node.json           # src/cli, src/server, src/shared
tsconfig.web.json            # src/web, src/shared
tsdown.config.ts             # builds src/cli/index.ts -> dist/cli.js (ESM, shebang)
vite.config.ts               # root: src/web, outDir: dist/web, dev proxy /api + /ws -> Hono
vitest.config.ts             # projects: "node" (server/shared), "web" (jsdom)
playwright.config.ts         # e2e against a fixture host repo
eslint.config.js
.prettierrc.json
components.json              # shadcn
src/
  cli/index.ts
  server/...
  shared/...
  web/...
test/fixtures/host-repo/     # fake host repo with post-lab/boards/... and scripts/
e2e/
```

Host-repo data layout stays exactly as in `CLAUDE.md` (`post-lab/boards/<slug>/...`). Outside `post-lab/`, the tool writes only the pointer block in the host repo's root `AGENTS.md` (M7).

---

## Library versions

Server runtime libraries are `dependencies`. Frontend libraries are bundled into `dist/web` by Vite, so they are `devDependencies`.

**Runtime (`dependencies`)**

| Package | Version | Use |
|---|---|---|
| hono | 4.13.14 | HTTP routes, `hono/ws` types |
| @hono/node-server | 2.1.5 | `serve`, `upgradeWebSocket`, `serve-static` |
| ws | 8.22.0 | `WebSocketServer({ noServer: true })` passed to `serve` |
| chokidar | 6.0.0 | file watching |
| execa | 10.2.1 | cell runs (`execa`, `parseCommandString`, `cancelSignal`) |
| gray-matter | 4.0.3 | frontmatter split/stringify |
| yaml | 2.9.1 | YAML engine passed to gray-matter (see M2 risks) |
| zod | 4.6.7 | schemas, WS protocol |
| write-file-atomic | 8.0.0 | atomic writes (temp + rename) |
| open | 11.0.4 | open browser |
| get-port | 7.2.0 | pick a free port |
| open-graph-scraper | 6.12.0 | link unfurl |
| nanoid | 6.0.2 | ids for items created by server actions (new cell, new board token) |

**Frontend (`devDependencies`, bundled)**

| Package | Version |
|---|---|
| react / react-dom | 19.3.1 |
| @excalidraw/excalidraw | 0.18.1 (peers react `^17.0.2 \|\| ^18.2.0 \|\| ^19.0.0`) |
| @tanstack/react-table | 9.3.1 (v9 API: `useTable` with `_features`; do not use `useLegacyTable`) |
| papaparse | 5.7.0 |
| vega / vega-lite / vega-embed | 6.4.0 / 6.5.0 / 7.3.0 |
| react-markdown / remark-gfm | 10.1.0 / 4.0.1 |
| lucide-react | 1.62.0 |
| tailwindcss / @tailwindcss/vite | 4.3.3 / 4.3.3 |
| shadcn (CLI, via `pnpm dlx`) | 4.23.0 |
| clsx / tailwind-merge / class-variance-authority / tw-animate-css | 2.1.1 / 3.7.0 / 0.7.1 / 1.4.0 (installed by `shadcn init`) |

Radix packages are added per shadcn component at `shadcn add` time; the lockfile records their versions.

**Tooling (`devDependencies`)**

| Package | Version |
|---|---|
| typescript | 6.0.3 |
| vite / @vitejs/plugin-react | 8.3.5 / 6.1.2 |
| vitest / @vitest/coverage-v8 | 5.0.5 / 5.0.5 |
| jsdom | 30.1.3 |
| @testing-library/react | 16.3.3 |
| @playwright/test | 1.64.1 |
| eslint / @eslint/js | 10.13.0 / 10.0.1 |
| typescript-eslint | 8.72.1 |
| eslint-plugin-react-hooks / eslint-plugin-react-refresh | 7.1.1 / 0.5.7 |
| eslint-config-prettier | 10.1.8 |
| globals | 17.13.0 |
| prettier | 3.9.10 |
| tsdown | 0.23.2 |
| tsx | 4.23.15 |
| concurrently | 10.0.6 |
| @types/node | 22.20.5 (matches the lowest supported Node major) |
| @types/react / @types/react-dom | 19.3.0 / 19.3.0 |
| @types/ws / @types/papaparse / @types/write-file-atomic | 8.18.2 / 5.5.2 / 4.0.3 |

---

## Milestone 1: Project setup

### Files and modules

- `package.json`
  - `bin`, `files: ["dist"]`, `engines`, `packageManager: pnpm@<installed>`.
  - Scripts: `dev`, `build`, `lint`, `format`, `format:check`, `typecheck`, `test`, `test:e2e`.
  - `dev` = `concurrently "tsx watch src/cli/index.ts --dev --no-open" "vite"`.
  - `build` = `vite build && tsdown`.
- `tsconfig*.json`: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `moduleResolution: bundler` (web) and `nodenext` (node).
- `eslint.config.js`: flat config with `@eslint/js` recommended, `typescript-eslint` `strictTypeChecked`, react-hooks, react-refresh, `eslint-config-prettier`. Also:
  - `complexity: ["error", 10]`
  - `max-depth: ["error", 3]`
  - `@typescript-eslint/no-explicit-any: "error"`
  - `no-restricted-syntax` banning inline `style={{...}}` in `src/web/**`, so styling goes through Tailwind/shadcn. Excalidraw embeddable sizing is done by Excalidraw itself, so no exception is needed.
- `src/cli/index.ts`
  - Parses `--port`, `--no-open`, `--dev` with `node:util` `parseArgs`.
  - Resolves the host root with `git rev-parse --show-toplevel` (execa). Exits with an error if not inside a git repo.
  - Starts the server and prints the URL.
- `src/server/app.ts`: `createApp(ctx: ServerContext): Hono`. Wires the routes and the auth middleware.
- `src/server/start.ts`: `startServer(opts): Promise<RunningServer>`. Runs `serve({ fetch, port, hostname: "127.0.0.1", websocket: { server: wss } })`.
- `src/server/auth.ts`: session token middleware (see risks).
- `src/server/static.ts`: in production, `serveStatic` from `@hono/node-server/serve-static` serves `dist/web`, resolved from `import.meta.url`.
- `src/web/main.tsx`, `src/web/App.tsx`, `src/web/index.css`: Tailwind v4 `@import "tailwindcss"`, shadcn theme tokens, Excalidraw CSS import.
- `src/web/components/ui/*`: shadcn `button`, `dialog`, `input`, `badge`, `tooltip`, `sonner` (toasts), `scroll-area`, `tabs`.
- `src/web/lib/utils.ts`: `cn()`.
- Build step: copy `node_modules/@excalidraw/excalidraw/dist/prod/fonts` to `dist/web/excalidraw-assets/fonts`. `index.html` sets `window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/"` so fonts load from the local server, not a CDN.
- `.github/workflows/ci.yml`: lint, typecheck, test, build.

### Key types

```ts
interface CliOptions { port?: number; open: boolean; dev: boolean }
interface ServerContext { hostRoot: string; boardsRoot: string; token: string }
interface RunningServer { url: string; close(): Promise<void> }
```

### Acceptance criteria and tests

- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass on a clean clone.
- A function with complexity 11 fails lint (one-off check while setting up, not a kept test).
- `pnpm pack`, then `npx <tarball>` inside `test/fixtures/host-repo`, starts the server on 127.0.0.1, opens the browser, and serves the built UI with a blank Excalidraw canvas.
- Vitest: `startServer` binds 127.0.0.1. `GET /api/health` returns 200 with the token and 401 without it.
- Vitest: running the CLI outside a git repo exits non-zero with a clear message.

### Risks and open questions

- **Local RCE surface.** The server can write cell commands and run them. Any web page could POST to `localhost:<port>`. Mitigation:
  - Bind to 127.0.0.1.
  - Generate a random session token at startup. The CLI opens `/?token=…`; the server sets an `HttpOnly; SameSite=Strict` cookie.
  - Every `/api` request and the WS upgrade require the cookie and a matching `Origin`/`Host` (`127.0.0.1:<port>` or `localhost:<port>`), which blocks DNS rebinding.
  - A server restart invalidates open tabs; the user reopens from the printed URL.
- Tailwind preflight can restyle Excalidraw's own UI. Import Excalidraw CSS after Tailwind and confirm visually in M4.
- TypeScript is held at 6.0.3 until typescript-eslint supports 7.x.

---

## Milestone 2: File format

Tests are written first: fixtures and failing tests for every schema and the round trip, then the implementation.

### Files and modules

```
src/shared/schema/
  common.ts          # ItemId, Geometry, StyleTokens, base fields
  board.ts           # BoardSchema
  items.ts           # one schema per type + ItemSchema discriminated union on `type`
src/shared/format/
  yamlEngine.ts      # gray-matter engine backed by `yaml` (YAML 1.2, no Date coercion)
  parseItem.ts       # (id, raw string) -> Result<Item, FormatError>
  serializeItem.ts   # Item -> string (canonical key order, integers, body verbatim)
  parseBoard.ts / serializeBoard.ts
src/server/storage/
  paths.ts           # boardDir, itemPath, assetsDir, outputsDir; rejects path traversal
  readBoard.ts       # load board.yaml + every items/*.md
  writeItem.ts       # write-file-atomic
  deleteItem.ts
test/fixtures/boards/valid/..., invalid/...
```

### On-disk format

`board.yaml`:

```yaml
title: Churn deep-dive
description: Storyboard for the Q3 churn post   # optional
```

Viewport, zoom and selection are per-user UI state and are not persisted.

`items/<id>.md`: YAML frontmatter plus a markdown body. Common frontmatter fields:

| Field | Type | Notes |
|---|---|---|
| `type` | enum | `note \| text \| image \| link \| frame \| connector \| cell \| drawing` |
| `x`, `y` | integer | Top-left in scene coords. Not used on `connector`. |
| `w`, `h` | integer > 0 | Not used on `connector`. Optional on `text` (auto-size). |
| `z` | number, default 0 | Stacking order; ties broken by id. |
| `frame` | ItemId, optional | Parent frame. |
| `style` | object, optional | Semantic tokens only, never hex (see below). |
| `link` | string, optional | Hyperlink (URL or `#<item-id>`). Maps to Excalidraw `element.link`. |

`style` tokens:
- `color`: `yellow | blue | green | pink | purple | gray | none`
- `stroke`: `solid | dashed | dotted`
- `size`: `s | m | l | xl` (font size)
- `align`: `left | center | right`

Tokens map to colours through one theme module (`src/web/canvas/theme.ts`), which reads shadcn CSS variables. The files never contain colour values.

Per-type fields (body = markdown body):

| Type | Extra frontmatter | Body |
|---|---|---|
| `note` | none (`style.color` defaults to `yellow`) | Sticky text |
| `text` | none | Text |
| `image` | `src: assets/<file>` (relative to board dir), `alt?` | unused, must be empty |
| `link` | `url`, `preview?: { title?, description?, image?, siteName? }` (written by server unfurl) | Optional caption (not rendered on canvas in v1) |
| `frame` | `name` | unused |
| `connector` | `from: ItemId`, `to: ItemId`, `arrow?: end \| both \| none` (default `end`), `points?: [number, number][]` (interior bend points) | Label (bound text on arrow) |
| `cell` | `command`, `cwd` (relative to host root, default `.`), `title?` | Optional description |
| `drawing` | `kind: freedraw \| rectangle \| ellipse \| diamond \| line \| arrow`, `points?: [number, number][]` (relative to x,y; required for freedraw/line/arrow) | Label (bound text; shapes only) |

Example:

```markdown
---
type: cell
x: 400
y: 120
w: 640
h: 420
title: Churn by cohort
command: uv run analysis/churn.py
cwd: .
---
Monthly churn, split by signup cohort.
```

### Key types

```ts
type ItemId = z.infer<typeof ItemIdSchema>;      // /^[A-Za-z0-9_-]{1,64}$/
type Item = z.infer<typeof ItemSchema>;          // discriminated union on `type`
type ItemOf<T extends Item["type"]> = Extract<Item, { type: T }>;
interface ItemFile { id: ItemId; item: Item; hash: string }   // sha256 of raw file bytes
interface Board { slug: string; meta: BoardMeta; items: Map<ItemId, ItemFile>; invalid: FormatError[] }
interface FormatError { path: string; message: string; issues?: z.core.$ZodIssue[] }
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

- Schemas are `.strict()`: unknown frontmatter keys are a validation error, so they are never silently dropped on the next UI write.
- Cross-item references (`frame`, `from`, `to`) are checked at board level by `validateBoard(board)`. A dangling reference puts that item in `invalid`.

### Acceptance criteria and tests

- **Round trip**: `parse(serialize(item)) == item` for every type. Property test with generated items.
- **Canonical output**: `serialize(parse(fixture)) === fixture` byte-for-byte for every canonical fixture (stable key order, integer coords, body kept verbatim, trailing newline).
- **YAML 1.2**: `title: no` stays a string and `date: 2026-10-27` stays a string.
- Each invalid fixture fails with a readable message naming the file and field:
  - unknown key, wrong type, missing `command`, bad id, `image.src` outside `assets/`, freedraw without `points`
  - case-insensitive id collision (`Note1.md` and `note1.md`)
  - dangling `from`/`to`/`frame`
- `paths.ts` rejects `..`, absolute paths and symlink escapes for slugs, ids and asset paths.
- `readBoard` on the fixture board returns all valid items plus the invalid list, without throwing.

### Risks and open questions

- gray-matter 4.0.3 was last published in 2021 and bundles js-yaml 3 (YAML 1.1 coercions). Mitigation: pass a custom `engines.yaml` backed by `yaml@2.9.1` for both parse and stringify. gray-matter still does the delimiter handling.
- Integer rounding of `x/y/w/h` means sub-pixel positions from the UI snap by up to 0.5px on reload. That is accepted for small diffs.
- Freedraw strokes can have hundreds of points. Round to 1 decimal and simplify (drop points closer than 1px) to keep files small. Files are still larger than other items.

---

## Milestone 3: Two-way sync

### Files and modules

```
src/shared/protocol.ts       # zod schemas for every WS message (both directions)
src/server/sync/
  boardStore.ts              # in-memory Board per slug, loaded lazily on first subscribe
  watcher.ts                 # chokidar on <hostRoot>/post-lab/boards
  hub.ts                     # WS client registry, per-board subscriptions, broadcast
  writeQueue.ts              # per-item serial promise chain
  handlers.ts                # item:put / item:delete / board:create handling
src/server/routes/
  boards.ts                  # GET /api/boards, POST /api/boards
  ws.ts                      # GET /ws (upgradeWebSocket)
src/web/sync/
  socket.ts                  # reconnecting WS client (exponential backoff, resubscribe)
  boardClient.ts             # holds items + baseHash per item; exposes useSyncExternalStore API
  diff.ts                    # items-before vs items-after -> puts/deletes
```

### Protocol

```ts
// client -> server
| { t: "subscribe"; board: string }
| { t: "item:put"; board: string; id: ItemId; item: Item; baseHash: string | null }  // null = create
| { t: "item:delete"; board: string; id: ItemId; baseHash: string }
// server -> client
| { t: "board:snapshot"; board: string; meta: BoardMeta; items: ItemFile[]; invalid: FormatError[] }
| { t: "item:upsert"; board: string; file: ItemFile }
| { t: "item:removed"; board: string; id: ItemId }
| { t: "item:invalid"; board: string; error: FormatError }
| { t: "item:ack"; board: string; id: ItemId; hash: string | null }
| { t: "item:conflict"; board: string; id: ItemId; current: ItemFile | null }
| { t: "outputs:changed"; board: string; cellId: ItemId }        // used by M5
| { t: "cell:status" | "cell:log"; ... }                         // used by M5
```

### Echo-loop prevention

1. **Server.** `boardStore` keeps `knownHash` per item path. When the server writes a file, it records the new hash before the rename. When chokidar later reports `change` for that path, the server reads the file and compares hashes. Equal means it is its own echo and is dropped. Content addressing (not timestamps or "ignore next event" flags) also absorbs editors that touch files without changing them.
2. **Client.** `boardClient` keeps `lastSynced: Map<ItemId, string>`, the canonical serialized item. Remote upserts are applied with `api.updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER })`, and `lastSynced` is updated in the same tick. The next `onChange` diff then sees no change for that item and sends nothing. `NEVER` also keeps remote edits out of the local undo stack.
3. **Outgoing writes.** `onChange` fires on every pointer move. The client debounces 300 ms after the last change, maps scene to items (M4), and sends `item:put` only for items whose canonical form differs from `lastSynced`.

### Conflict policy (human in UI + AI editing files)

- **Granularity is one item per file.** Edits to different items never conflict.
- **Optimistic concurrency.** Every `item:put` and `item:delete` carries `baseHash`, the hash the client last saw. The server's per-item write queue re-reads the file from disk (not the cache) and compares:
  - Match: atomic write, ack with the new hash, broadcast `item:upsert` to other clients.
  - Mismatch: `item:conflict` with the current disk version. The client replaces its element with the disk version and shows a toast: "‹item› changed on disk; your edit was discarded."
- **Disk wins.** The files are the source of truth, and an AI agent's edit is a deliberate file write, so it wins.
- **Active text editing.** If a remote upsert arrives for the item whose text is being edited (`appState.editingTextElement`), it is held until editing ends, then applied. The local edit's put will hit the conflict path above, so the outcome is the same and typing is never interrupted.
- **Create collisions.** `baseHash: null` with an existing file is a conflict.
- **Invalid files.** A file that fails validation is removed from the canvas and listed in an "Invalid files" panel (shadcn sheet) with the zod issues. UI writes to that id are refused until the file is valid again.

### Watcher details

- Watch `<hostRoot>/post-lab/boards` with:
  - `ignoreInitial: true`
  - `awaitWriteFinish: { stabilityThreshold: 75, pollInterval: 25 }`
  - an `ignored` predicate that keeps only `board.yaml`, `items/*.md`, `assets/**` and `outputs/**`
- chokidar 4+ removed glob support, so filtering is by path predicate.
- Events route to parse-and-broadcast (items), board meta reload (`board.yaml`), `outputs:changed` debounced 200 ms per cell (outputs), and asset change notices (assets).
- New board directories appearing on disk are announced to the board list.

### Acceptance criteria and tests

- Vitest, server, using a temp copy of the fixture repo and a real chokidar watcher:
  - External edit to `items/a.md` produces exactly one `item:upsert` to subscribers.
  - Server-initiated write produces zero broadcasts back to the writer and one to other clients.
  - `put` with a stale `baseHash` returns `item:conflict` with disk content, and the file is unchanged.
  - 50 rapid puts to one item are serialized. The final file equals the last put. No temp files remain.
  - Invalid edit produces `item:invalid`. Fixing it produces `item:upsert`.
  - Deleting a file produces `item:removed`.
- Vitest, web: `diff.ts` emits puts only for changed items. Applying a remote upsert followed by `onChange` emits nothing.
- Playwright: edit a fixture file with `fs.writeFile` while the board is open; the canvas updates within 1 s. Drag a note; the file's `x`/`y` change within 1 s and no other file changes.

### Risks and open questions

- Moving a frame moves its children, which writes one file per child. That is correct but noisy in `git diff`, and accepted.
- `git checkout` or `git pull` can change many files at once. Each one becomes an upsert, and conflicts resolve to disk. Batch broadcasts per 50 ms tick.
- Editors that save by delete+create (some vim configs) show as `unlink`+`add`. `awaitWriteFinish` plus re-reading on `add` covers this. Add a test for it.

---

## Milestone 4: Basic canvas

### Excalidraw API check (0.18.1)

| API | Finding | Impact |
|---|---|---|
| `updateScene({ elements, appState, captureUpdate })` | `captureUpdate` takes `CaptureUpdateAction.IMMEDIATELY \| NEVER \| EVENTUALLY` (exported). | Remote updates use `NEVER`. |
| `onChange(elements, appState, files)` | Fires on every change, including pointer moves. | Debounced diff (M3). |
| `restoreElements(elements, localElements, { refreshDimensions, repairBindings })` | Fills defaults for partial elements and repairs bindings. | Converter emits partial elements; `restoreElements` completes them. |
| `convertToExcalidrawElements(skeletons, { regenerateIds })` | Skeleton API supports labels and start/end binding, but embeddable/iframe skeletons must be full elements. | Not used. One path (`restoreElements`) for all types is simpler. |
| Frames | `type: "frame"`, `name`. Children set `frameId`. Excalidraw expects frame children ordered before their frame. | Converter orders each frame's children immediately before the frame. |
| Bound text | `text.containerId` -> container. Allowed containers: **rectangle, diamond, ellipse, arrow only.** | Notes are rectangle + bound text. Connector labels are bound text on the arrow. **Cells, images, links and frames cannot carry bound text.** |
| Arrow bindings | `startBinding`/`endBinding: { elementId, focus, gap }`. Elbow arrows use `FixedPointBinding` with `fixedPoint`. The bound element must list the arrow in `boundElements`. Bindable: rectangle, diamond, ellipse, text, image, embeddable, frame. | Connectors can target any item type. The converter writes both sides of the binding. |
| `customData` | Arbitrary, kept on the element. | `customData.postLab = { type, itemId }` tags every element. |
| Fonts | `FONT_FAMILY`: Virgil, Helvetica, Cascadia, Excalifont, Nunito, Lilita One, Comic Shanns, Liberation Sans. | Use **Nunito** for text and **Comic Shanns** for monospace. No custom web fonts. |
| `aiEnabled` prop | Exists. | Set `false` to remove magic frame and text-to-diagram tools. |
| `UIOptions.tools` | Only toggles `image`. | Excalidraw's own toolbar cannot be trimmed further through props. |

**Requirements Excalidraw cannot meet cleanly**

1. **Style properties outside the token set.** Excalidraw's properties panel lets users set sloppiness, arbitrary colours, stroke width and fonts. Only `style` tokens are persisted, so anything else reverts on reload.
   - Mitigation: snap colours to the nearest token on write.
   - Hide the sloppiness, font-family, stroke-width and edge controls with CSS overrides scoped to `.excalidraw`. This is the only styling of Excalidraw internals.
   - Not yet verified: whether 0.18.1 lets the colour picker be limited to the token palette through props. Spike this in M4. If it can't be limited, snapping on write is the only control.
2. **Rendered markdown on canvas.** Not possible with native text (decided: raw markdown shown).
3. **Embeddable interaction.** Embeddables are `pointer-events: none` until the user clicks to activate them (Excalidraw shows a "click to interact" hint). M5 handles this.
4. **Images are held as data URLs in memory** (`BinaryFiles`). Large moodboards cost memory. Excalidraw has no streaming or URL-backed image source.
5. **Arrow geometry on load.** Excalidraw re-routes bound arrows when a bound element moves, not when the scene loads. The converter computes endpoints itself: the centre-to-centre line clipped to each bounding box, minus `gap`.

### Files and modules

```
src/web/canvas/
  theme.ts             # token -> colour / font size, from CSS variables; dark-mode aware
  toElements.ts        # Item[] + current scene -> partial elements -> restoreElements(...)
  toElements/<type>.ts # one small mapper per item type (keeps complexity < 10)
  fromElements.ts      # scene elements -> Map<ItemId, Item>
  fromElements/<type>.ts
  geometry.ts          # connector endpoints, frame-first ordering, z <-> scene order
  zOrder.ts            # midpoint z for moved elements
  BoardCanvas.tsx      # <Excalidraw> host: initialData, onChange, excalidrawAPI, renderEmbeddable, validateEmbeddable
  Toolbar.tsx          # shadcn toolbar: Add note, Add cell, Invalid files, theme toggle
src/web/routes/
  BoardList.tsx        # "/" list + create board
  BoardView.tsx        # "/b/:slug"
```

Routing is two views, matched on `location.pathname`. No router library.

### Mapping rules

| Item | Excalidraw element(s) | Element id |
|---|---|---|
| note | `rectangle` (solid fill, rounded) + bound `text` | `id`; text reuses the existing bound-text id from the current scene, otherwise `${id}-label` |
| text | `text` (`autoResize` true when `w` absent) | `id` |
| image | `image` with `fileId = sha1(src)`; file bytes fetched from `/api/boards/:slug/assets/...` and passed to `api.addFiles` | `id` |
| link | `embeddable` with `link = url` | `id` |
| frame | `frame` with `name`; children get `frameId` | `id` |
| connector | `arrow` with `startBinding`/`endBinding` + optional bound `text`; `from`/`to` elements get `boundElements += { id, type: "arrow" }` | `id` |
| cell | `embeddable` with `link = "https://post-lab.invalid/cell/<id>"` (never persisted) | `id` |
| drawing | `freedraw` / `rectangle` / `ellipse` / `diamond` / `line` / unbound `arrow` (+ bound text for shapes) | `id` |

Reverse direction (`fromElements`):
- `customData.postLab.type` decides the item type when present.
- Untagged elements (newly drawn in the UI) are classified by type:
  - `rectangle` from the Note tool is tagged at insert time.
  - `arrow` bound at both ends -> `connector`; otherwise `drawing`.
  - `embeddable` -> `link`.
  - Everything else -> `drawing`, `text`, `image` or `frame`.
- The mapper is an exhaustive `switch` with a `never` check. An unmappable element type is a thrown error surfaced as a toast, not ignored.

Style: every element gets `roughness: 0`, `fontFamily: FONT_FAMILY.Nunito`, and `strokeWidth`/`fillStyle` from theme. The initial `appState` sets `currentItemRoughness: 0` and `currentItemFontFamily: FONT_FAMILY.Nunito`. `theme` follows the shadcn theme toggle.

z-order: items are sorted by `(z, id)`. When the scene order changes, only elements whose Excalidraw `index` changed get a new `z`: the midpoint of their neighbours' `z` (or neighbour ± 1 at the ends). One reorder rewrites one file.

### Key types

```ts
type PostLabTag = { type: Item["type"]; itemId: ItemId };
type ElementsFor = (item: Item, ctx: ToElementsContext) => Partial<ExcalidrawElement>[];
interface ToElementsContext { theme: CanvasTheme; existing: ReadonlyMap<string, ExcalidrawElement>; itemsById: ReadonlyMap<ItemId, Item> }
type ItemFor = (el: ExcalidrawElement, scene: SceneIndex) => Item | null;  // null only for secondary elements (bound text)
```

### Acceptance criteria and tests

- Vitest (jsdom) round trip: `fromElements(toElements(items)) == items` for every fixture board, including frames with children, connectors with labels, and all drawing kinds.
- Stable ids: re-applying an unchanged item yields elements with identical ids (including bound text ids).
- Connector endpoints sit on the bounding-box edges (geometry unit tests for left/right/top/bottom and overlapping boxes).
- Frame ordering: each child's scene index is lower than its frame's.
- Playwright on the fixture board:
  - every item renders
  - a sticky made with "Add note" creates `items/<id>.md`
  - an arrow drawn between two notes creates a `connector` file with correct `from`/`to`
  - moving a note re-routes the arrow and writes only the note file
  - deleting an element deletes its file
- Visual check: no hand-drawn strokes or handwriting font anywhere.

### Risks and open questions

- Excalidraw 0.18.1 is the latest stable release. The `next` tag points at an older 0.18.0 snapshot. Pin exactly; upgrades are a deliberate task.
- The CSS overrides that hide properties-panel controls depend on Excalidraw's internal class names. Cover them with a Playwright assertion so an upgrade fails loudly.
- Elbow arrows (`FixedPointBinding`) add a second binding shape. v1 connectors are straight or curved only; the elbow arrow type is hidden with the CSS overrides above.

---

## Milestone 5: Code cells

### Files and modules

```
src/server/cells/
  runner.ts            # runCell(board, id) -> RunHandle; one active run per cell
  outputs.ts           # list outputs, classify by extension, path guards
src/server/routes/
  cells.ts             # POST /api/boards/:slug/cells/:id/run, POST .../cancel
  outputs.ts           # GET  /api/boards/:slug/outputs/:id (list), GET .../outputs/:id/* (files)
src/shared/renderers.ts      # extension -> RendererKind (shared so server lists kinds)
src/web/cells/
  CellEmbed.tsx        # renderEmbeddable target: header, run state, outputs
  CellToolbar.tsx      # floating shadcn toolbar over the selected cell (Run / Cancel / Edit)
  NewCellDialog.tsx    # title, command, cwd -> server creates items/<id>.md
  useCellOutputs.ts    # fetch list; refetch on outputs:changed
  renderers/
    ImageOutput.tsx    # .png .svg  (<img>)
    TableOutput.tsx    # .csv (papaparse) .json (array of objects) -> TanStack useTable + pagination
    VegaOutput.tsx     # .vl.json -> vega-embed (actions off, theme from shadcn mode)
    HtmlOutput.tsx     # .html -> <iframe sandbox="allow-scripts" src=...>
    MarkdownOutput.tsx # .md -> react-markdown + remark-gfm, relative URLs rewritten to outputs route
    TextOutput.tsx     # stdout / stderr
```

### Run contract

- **Resolve.** `cwd = resolve(hostRoot, item.cwd)`. It must stay inside `hostRoot`. `outDir = <board>/outputs/<id>/`.
- **Prepare.** Delete everything in `outDir`, then recreate it with `outDir/.post-lab/`. A failed run therefore shows its partial output plus the error. The previous committed output is in git if needed.
- **Execute.**

  ```ts
  execa({
    cwd,
    env: { POST_LAB_OUT: outDir },
    shell: true,
    cancelSignal,
    reject: false,
    stdout: ["pipe", { file: <outDir>/.post-lab/stdout.txt }],
    stderr: ["pipe", ...],
  })`${command}`
  ```

  `shell: true` because `command` is a user-authored shell string (e.g. `uv run x.py`). Lines stream to clients as `cell:log`.
- **Record.** Write `outDir/.post-lab/run.json`: `{ command, cwd, exitCode, startedAt, durationMs, cancelled }`. It is committed with the outputs, so boards show status without re-running.
- **Status.** Clients receive `cell:status: running | succeeded | failed | cancelled`.
- **Render.** Renderers read only top-level files in `outDir`, sorted by filename (scripts control order with `01-…`, `02-…`). Extension match is longest-suffix first, so `.vl.json` wins over `.json`. Unknown extensions are listed with a "no renderer for .xyz" notice and a download link.

### Embeddable wiring

- `validateEmbeddable`: function returning `true` for any `http(s)` URL. This covers link items (any URL) and the internal cell link.
- `renderEmbeddable(element)`:
  - `customData.postLab.type === "cell"` -> `<CellEmbed id=…/>`
  - `link` -> `<LinkEmbed/>` (M6)
  - Excalidraw requires a non-empty, validated `link` before it calls `renderEmbeddable` at all. That is why cells get the internal `https://post-lab.invalid/cell/<id>` link (`.invalid` is a reserved TLD, so it can never resolve).
- **Activation.** Embeddables ignore pointer events until activated. Primary actions therefore live in `CellToolbar`: a floating shadcn toolbar shown when exactly one cell is selected, positioned with `sceneCoordsToViewportCoords`. Run works with a single click on a selected cell. Scrolling a table or interacting with a chart needs the activation click.

### Key types

```ts
type RendererKind = "image" | "table" | "vega" | "html" | "markdown" | "unsupported";
interface OutputFile { name: string; size: number; mtimeMs: number; kind: RendererKind }
interface RunRecord { command: string; cwd: string; exitCode: number | null; startedAt: string; durationMs: number; cancelled: boolean }
type CellStatus = "idle" | "running" | "succeeded" | "failed" | "cancelled";
interface RunHandle { cellId: ItemId; cancel(): void; done: Promise<RunRecord> }
```

### Acceptance criteria and tests

- Vitest (server), using fixture scripts in `test/fixtures/host-repo/scripts/` written in Node, so tests need only Node:
  - `$POST_LAB_OUT` is set and absolute.
  - Files written there appear in the outputs list with the right `kind`.
  - stdout/stderr are captured to `.post-lab/`.
  - Non-zero exit gives status `failed` and `run.json.exitCode` matches.
  - Cancel kills the process and records `cancelled: true`.
  - A second run while running is rejected with 409.
  - `cwd: ../outside` is rejected.
  - Output path traversal (`/outputs/x/../../items/a.md`) is rejected.
- Vitest (web): `renderers.ts` classification table. Each renderer renders a fixture file: CSV with quoted commas, JSON array, Vega-Lite bar chart, markdown with a relative image.
- Playwright: add a cell via the dialog, Run, and see the PNG and table render in the embeddable. The output files exist on disk under `outputs/<id>/`.
- The HTML output iframe has no `allow-same-origin`. A test script that tries `parent.document` fails.

### Risks and open questions

- **The internal cell link must survive Excalidraw's link normalisation** (`normalizeLink`) and never open a hyperlink popup. Spike this first in M5. If it is not stable, report back before choosing another approach.
- Cells are embeddables, so they **cannot carry bound text**. The title lives inside the React component. Arrows can still bind to cells.
- Embeddables are rendered as DOM overlays (CSS-transformed divs), not on the canvas. Excalidraw's PNG/SVG export does not include cell outputs. Out of scope for v1; note it in the agent guide.
- Large outputs: tables paginate at 50 rows. Images over ~10 MB get a size warning but still render.
- Vega/Plotly HTML that loads scripts from a CDN needs network access. That is expected; nothing is proxied.
- Commands run with the user's full privileges. Anyone who can edit board files can run code once a human clicks Run. The agent guide (M7) states this, and the Run button shows the exact command before the first run in a session.

---

## Milestone 6: Moodboard

### Files and modules

```
src/server/routes/assets.ts      # POST /api/boards/:slug/assets (multipart), GET .../assets/*
src/server/unfurl.ts             # open-graph-scraper; writes `preview` into the link item
src/web/canvas/imageFiles.ts     # load asset -> dataURL -> api.addFiles; generateIdForFile
src/web/moodboard/
  LinkEmbed.tsx                  # iframe (known provider) or <LinkCard/>
  LinkCard.tsx                   # shadcn card: image, title, site, description; opens in new tab
  providers.ts                   # known-embeddable URL patterns
  AddLinkDialog.tsx
```

### Images

- **Drop, paste or image tool.**
  1. Excalidraw calls `generateIdForFile(file)`, which returns `sha1(bytes)`.
  2. The client uploads the file to `POST /assets`.
  3. The server writes `assets/<slugified-name>-<shortHash>.<ext>` (content-addressed suffix, so names never collide) and returns the path.
  4. The client sends the `image` item with `src`.
- **Upload limits.** Images only, decided by MIME sniffing on the server: png, jpeg, gif, webp, svg. Max 20 MB.
- **Load.** For each image item, fetch `src`, convert to a data URL, then `api.addFiles([{ id: fileId, dataURL, mimeType, created }])`.
- **Assets added by hand** to `assets/` are not on the canvas until an item references them. The agent guide says so.
- **Deleting an image item** does not delete its asset; other items may reference it. Orphaned assets are listed in the board's "Invalid files" sheet as a separate "Unused assets" section.

### Link embeds

- **Create.** Paste a URL onto the canvas (Excalidraw's own paste-to-embed path, which goes through `validateEmbeddable`) or use "Add link".
- **Unfurl.** On creation, or whenever `url` changes, the server runs open-graph-scraper (timeout 5 s) and writes `preview: { title, description, image, siteName }` into the item file. The file then shows something offline, and the preview is versioned. Unfurl failure writes no `preview`, and the card shows the URL and hostname.
- **Preview images** are hot-linked by URL, not downloaded into `assets/`. This keeps assets limited to things the user chose.
- **Render.**
  - If `providers.ts` matches, `renderEmbeddable` returns `null` and Excalidraw's built-in iframe path handles provider URL rewriting (YouTube watch to embed, etc.).
  - Otherwise it returns `<LinkCard>`.
  - `providers.ts` mirrors Excalidraw's provider list (YouTube, Vimeo, Figma, GitHub Gist, X/Twitter, Reddit, Giphy, Val Town, Excalidraw). `getEmbedLink` exists in Excalidraw but is not exported from the package entry.

### Key types

```ts
interface LinkPreview { title?: string; description?: string; image?: string; siteName?: string }
interface AssetUploadResult { src: `assets/${string}`; fileId: string }
```

### Acceptance criteria and tests

- Vitest (server):
  - upload writes a content-addressed file
  - same bytes uploaded twice -> same path
  - non-image rejected
  - traversal in names rejected
- Unfurl writes `preview`, tested against a local Hono fixture page with OG tags (no live network in tests).
- Vitest (web): `providers.ts` matches/rejects a URL table.
- Playwright:
  - dropping a PNG creates `assets/…png` and `items/<id>.md` with `type: image`
  - after reload the image renders from disk
  - pasting a YouTube URL gives a live iframe
  - pasting a fixture OG page URL gives a preview card with the title

### Risks and open questions

- The provider list is copied from Excalidraw and can drift on upgrade. A Playwright test with one YouTube URL catches regressions. Offline CI should use a stubbed URL pattern instead.
- Hot-linked preview images can disappear upstream. The card then shows text only, which is acceptable for a labs tool.
- Large image counts increase browser memory (data URLs, see M4).

---

## Milestone 7: Agent guide

### Files and modules

```
src/server/agentGuide/
  template.md          # guide source, with placeholders for generated sections
  generate.ts          # renders schema tables from the zod schemas (z.toJSONSchema) + examples
  ensureGuide.ts       # writes <hostRoot>/post-lab/AGENTS.md on startup if content differs
  ensurePointer.ts     # adds the pointer block to <hostRoot>/AGENTS.md (see Behaviour)
```

### Content (short, about 150 lines)

1. **Layout**: what lives where under `post-lab/boards/<slug>/`.
2. **Rules**:
   - one file per item
   - file name = id
   - ids match `^[A-Za-z0-9_-]{1,64}$`
   - unknown keys are rejected
   - coordinates are integers in scene pixels
   - `z` controls stacking
3. **Item type table**: generated from the zod schemas, so it cannot drift from the code.
4. **One minimal example per type.**
5. **Recipes**:
   - add a sticky next to an item
   - connect two items
   - put items in a frame
   - add a cell for a script
   - add an image (copy into `assets/` and create an `image` item)
6. **Cells**: the `$POST_LAB_OUT` contract and the extension-to-renderer table. Agents edit cells but do not run them; a human clicks Run. Outputs are committed.
7. **Validation**: invalid files appear in the UI's "Invalid files" panel with the error.

### Behaviour

- The guide is generated, and the server overwrites it on startup when its content differs. Its header says "Generated by post-lab – do not edit".
- **Root pointer.** When `post-lab/AGENTS.md` is first created, `ensurePointer` also updates the host repo's root `AGENTS.md`:
  - It adds a block between `<!-- post-lab:start -->` and `<!-- post-lab:end -->` markers. The block says: "Boards for this repo live in `post-lab/boards/`. Read `post-lab/AGENTS.md` before reading or editing them."
  - If root `AGENTS.md` doesn't exist, it creates the file with just that block. If the file exists without the block, it appends the block. Nothing outside the markers is touched.
  - It runs only when the guide is first created. If the user deletes the block, later starts never re-add it.
  - The CLI prints one line saying it added the pointer.
- `CLAUDE.md` is never edited.

### Acceptance criteria and tests

- Vitest: generated guide snapshot. Every item type in `ItemSchema` appears in the generated table; a test fails if a type is added without an example.
- Vitest: every example in the guide parses with `parseItem` (examples are executable).
- Vitest (`ensurePointer`, temp dir):
  - no root `AGENTS.md`: the file is created with only the block
  - existing file without the block: the block is appended and the rest is byte-identical
  - existing file with the block: no change
  - guide already exists and the block was deleted: no change
- Manual acceptance: give a fresh agent only `post-lab/AGENTS.md` and ask it to add a frame with three stickies, a connector and a cell. All files validate and render on first try.

### Risks and open questions

- Host repos that use only `CLAUDE.md` won't load the root `AGENTS.md` pointer automatically. The user can add `@AGENTS.md` to their `CLAUDE.md` by hand; post-lab doesn't edit `CLAUDE.md`.

---

## Cross-cutting order of work

1. M1 → M2 → M3 run strictly in sequence; each depends on the previous.
2. M4 can start its pure mappers (`toElements`/`fromElements` tests) in parallel with M3. Wiring to the live socket waits for M3.
3. M5 starts with the internal-cell-link spike before any renderer work.
4. M6 and M7 are independent of each other after M5.
