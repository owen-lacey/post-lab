# post-lab v1 implementation plan

Status: M1–M8 done; revised 2026-11-02 for D15 (one board per host repo, in `.post-lab/`). Implements `docs/requirements.md` (R1–R33, decisions D1–D15); read that first. This plan does not reopen those decisions. Where it fixes a detail they leave open (field names, API routes, milestone order), it says so under "Plan-level details".

Versions below were checked against the npm registry on 2026-10-29.

## Plan-level details

| Topic | Detail |
|---|---|
| Item IDs | 8 characters from `[0-9a-z]`, generated with nanoid `customAlphabet`. The ID is the file stem. Agents creating items pick any ID matching `^[0-9a-z]{8}$`. |
| Palette | 8 named colours: `gray`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`. Each maps to Tailwind theme tokens, not hex values in components (R33). |
| Draw order | Optional integer `z` on positioned items (default 0); ties are broken by ID. Frames always render below their children. |
| Frames | Frames do not nest: `frame` is not allowed on a frame. On drag stop, an item whose centre lies inside a frame becomes its child (positions converted to relative); dragged out, it becomes top level again. Deleting a frame in the UI deletes its children and their connectors too. |
| Positions | Stored as integers to keep diffs small. Connectors have no position or size. |
| Key order | Item files are written with frontmatter keys in schema order, so UI saves produce minimal diffs. |
| Invalid files | Zod schemas are strict (unknown keys are errors). An invalid item file is not rendered; it appears in a board-level Problems panel with the file path and the zod message. |
| Writes | All file writes go through write-file-atomic (ISC). |
| Port | Default 4870, overridable with `--port`. If the port is busy, post-lab exits with an error. |
| Host root | The directory `npx post-lab` is run from. If `.post-lab/` is missing there, post-lab asks `No board found in this directory, start a new one? (Y/n)` (empty answer means yes); yes creates `.post-lab/items/`, no exits without creating anything (D15). |
| Cross-item checks | Also reported as Problems, and the item is not rendered: `frame` naming a missing or non-frame item, connector `from`/`to` naming a missing item, a filename that is not `<id>.md`, a non-`.md` file in `items/`, an image `src` outside `assets/`. `strokes.json` is optional; an invalid one is a Problem. |
| Link previews | When a link item has no `preview` (on start, after a save, or when its file changes), the server fetches Open Graph data (open-graph-scraper) once and writes it into the item as it is by then, telling the UI; a page with none gets `preview: {}`. A failed fetch writes nothing and is retried on the next launch. Known providers (YouTube, Vimeo, video files, etc.) play inline with react-player. |
| Served files | Besides the `allow-scripts`-only iframe sandbox for `.html` outputs (D12), the server sends `Content-Security-Policy: sandbox allow-scripts` with every file from `/api/files/*`, so an `.html` or `.svg` opened directly runs in an opaque origin and cannot pass the Origin check. |
| Cell runs | One run per cell at a time; a second run request while one is in progress returns 409. Child processes are killed when post-lab exits. stdin is closed; stdout is saved verbatim (trailing newline kept). The run response is `{ ok, exitCode?, stderr }`; `exitCode` is absent when the command could not start (e.g. a missing `cwd`), and `stderr` then says why. |
| Output listing | `GET /api/board` includes `outputs`: per valid cell, the top-level files of `outputs/<cell-id>/` sorted by code point, dotfiles and subfolders left out (subfolders are still served, so an `.html` can load its own assets). Each file has a `version` (mtime), added to its URL so a re-run is never served from cache. New outputs reach the UI as `outputs` events (M4). |
| Board store | The server keeps the board in memory. chokidar watches `.post-lab/` (not `README.md` or `assets/`); after any event, debounced by 50 ms, the whole board is re-read from disk and diffed against the store, and each difference goes out as an SSE event. Re-reads, saves and deletes run one at a time. A save puts the item into the store (in the form a re-read produces) before writing, so the watcher finds nothing to echo back. macOS FSEvents drops changes made just after a watch starts, so on start-up the store rewrites `.post-lab/.watch-check` until the watcher reports it, then deletes it, before reading the board. |
| Saves | `PUT /api/items/:id` takes the item's frontmatter fields plus `body` as JSON (ID in the URL; 400 with the zod message if invalid) and writes the file; `DELETE` removes it (404 if missing). The UI applies each edit at once, sends requests one at a time in order, and reloads the board if one fails. |
| UI sync | The UI opens `/api/events` and fetches `/api/board` on every (re)connect; events that arrive during the fetch are replayed after it. |
| Renderer details | `.jpeg` renders as an image alongside D12's `.jpg`. Markdown uses GitHub flavour (remark-gfm) and Tailwind Typography; relative links and `data.url`s in `.vl.json` specs resolve against the cell's output folder. Vega, markdown and table renderers are lazy-loaded chunks. |

### Out of scope for v1

Not required by `docs/requirements.md`, so not built: board export (D4), rendered markdown in notes (D3), multi-user collaboration, cancelling a running cell, nested frames, free-floating arrows.

## Item file format

Common frontmatter for positioned items: `type`, `x`, `y`, `w`, `h`, optional `z`, optional `frame`, and style tokens where the type has them: `color` (palette), `size` (`s`/`m`/`l`), `align` (`left`/`center`/`right`).

| `type` | Extra fields | Body |
|---|---|---|
| `note` | `color`, `size`, `align` | text (raw, D3) |
| `text` | `color`, `size`, `align` | text |
| `shape` | `shape` (`rectangle`/`ellipse`/`diamond`), `color`, `size`, `align` | label |
| `frame` | `color` | title |
| `image` | `src` (path relative to the board, normally `assets/<file>`) | caption, optional |
| `link` | `url`, optional `preview` (`title`, `description`, `image`) | note, optional |
| `cell` | `command` (shell string), optional `cwd` (relative to host root); `h` is its least height, as it grows to fit its outputs and nothing in it scrolls | description, optional |
| `connector` | `from`, `to` (item IDs); no position or size | label, optional |

Example, `.post-lab/items/k3f9a0qz.md`:

```markdown
---
type: cell
x: 120
y: 340
w: 480
h: 360
command: uv run analysis/churn.py
---
Monthly churn by cohort.
```

`strokes.json`: `{ "strokes": [{ "id": "<id>", "color": "<palette>", "size": "s|m|l", "points": [[x, y, pressure], ...] }] }`. Strokes are top level (never in a frame) with absolute positions.

Parsing: post-lab splits the file at the `---` fences itself and parses the frontmatter with `yaml` (YAML 1.2 core schema, so `no` and dates stay strings). An empty body is written as nothing after the closing fence, so files round-trip byte for byte.

## Package layout (this repo)

```
package.json          # name: post-lab, bin: { "post-lab": "dist/cli.js" }, type: module, engines.node
pnpm-workspace.yaml   # allowBuilds (esbuild)
tsdown.config.ts      # src/cli.ts -> dist/cli.js
vite.config.ts        # root: src/ui, outDir: dist/ui, dev proxy /api -> Hono
vitest.config.ts      # projects: node (server, shared), jsdom (ui)
eslint.config.js      # complexity: 10; components/ui/** excluded from react-refresh and no-inline-style
components.json       # shadcn
src/
  cli.ts              # args, start server, open browser
  shared/             # zod schemas, item file parse/serialize, types (used by server and ui)
  server/             # Hono app, security, board store, watcher, SSE, cells, guide
  ui/                 # React app: board list, canvas, nodes, renderers, toolbar
examples/demo/        # fixture host repo for development and tests
```

`engines.node` is `^24.15.0 || >=26.0.0`: chokidar 6 needs `>=22.22`, write-file-atomic 8 needs `^22.22.2 || ^24.15.0 || >=26`, and Node 24 is the current LTS line.

## HTTP API

All routes are under `/api`. Every request must carry post-lab's own Host, and every state-changing request its own Origin (D9). GET routes have no side effects.

| Route | Purpose |
|---|---|
| `GET /api/info` | Host repo name |
| `GET /api/events` | SSE stream: `item`, `item-removed`, `strokes`, `outputs`, `problems` events |
| `GET /api/board` | Items, strokes, problems and (from M3) output listings |
| `PUT /api/items/:id`, `DELETE …` | Save or delete an item file |
| `PUT /api/strokes` | Save `strokes.json` |
| `POST /api/assets?id=<item-id>` | Upload a pasted or dropped image (raw body, at most 25 MB; PNG, JPEG, GIF, WebP or SVG by `Content-Type`) as `assets/<item-id>.<ext>`; returns its `src` |
| `GET /api/files/*` | Serve files under `.post-lab/assets/` and `.post-lab/outputs/` only |
| `POST /api/cells/:id/run` | Run a cell; responds when the run finishes with exit code and stderr |
| `POST /api/cells/:id/outputs/:name/open` | Open a listed output file in the user's editor (launch-editor: a running editor it recognises, else `LAUNCH_EDITOR`/`VISUAL`/`EDITOR`); 404 for anything not in the cell's output listing |

## Dependencies

| Purpose | Package (version, licence) |
|---|---|
| Canvas | `@xyflow/react` 12.12.0 (MIT), `perfect-freehand` 1.2.3 (MIT) |
| UI | `react` 19.3.1 (MIT), Tailwind, shadcn/ui, `lucide-react` |
| Renderers | `@tanstack/react-table` 9.3.1 (MIT), `vega-embed` 7.3.0 + `vega-lite` 6.5.0 (BSD-3-Clause), `react-markdown` 10.1.0 (MIT), `react-player` 3.4.0 (MIT) |
| Server | `hono` 4.13.14 (MIT), `@hono/node-server` 2.1.5 (MIT), `chokidar` 6.0.0 (MIT), `execa` 10.2.1 (MIT), `write-file-atomic` 8.0.0 (ISC), `open-graph-scraper` 6.12.0 (MIT), `open` 11.0.4 (MIT), `launch-editor` 2.14.2 (MIT) |
| Shared | `zod` 4.6.7 (MIT), `yaml`, `nanoid` 6.0.2 (MIT) |
| Build/dev | `vite` 8.3.5, `tsdown` 0.23.3, `vitest` 5.0.5, `tsx` 4.23.15, `typescript-eslint` 8.72.1, Prettier (all MIT) |
| TypeScript | 6.0.x (Apache-2.0), not 7.0.2: `typescript-eslint` 8.72.1 peers `typescript >=4.8.4 <6.1.0` |

## Milestones

Each milestone ends with lint, typecheck, tests and build passing, and with its acceptance checks done by hand against `examples/demo`.

### M1. Scaffold and secure server

- pnpm, TypeScript 6, ESLint (`complexity` 10) + typescript-eslint, Prettier, Vitest.
- Vite + React + Tailwind + shadcn UI shell. shadcn `init` (Vite, Radix) installs `cn`, `radix-ui` and the Geist font; `sonner` pulls in `next-themes`.
- Hono server serving the built UI and `/api`. `src/cli.ts` with `--port`, `--no-open` and browser open.
- Security middleware: bind 127.0.0.1, Host check on every request, Origin check on state-changing requests.
- `pnpm dev`: server via tsx watch against `examples/demo`, plus the Vite dev server (which opens the browser) proxying `/api`.

Accept:
- `pnpm dev` and the built CLI open the UI.
- A wrong Host, or a POST with a foreign, `null` or missing Origin, gets 403 (Vitest).

### M2. Item format, read-only canvas and agent guide

- Zod schemas for every item type and `strokes.json`; parse/serialize with byte-for-byte round trips.
- Board loads from `.post-lab/` on each `GET /api/board` (the cached store arrives with the watcher in M4); Problems list for invalid files and broken cross-item references.
- CLI start-up prompt when `.post-lab/` is missing (D15).
- React Flow canvas rendering every item type read-only: notes, text, shapes, frames (sub flows), connectors (edges), images (via `/api/files/*`), links (card without fetched preview yet), cells (command and description, no outputs yet). A board with no items is a blank canvas.
- Agent guide (D11): `.post-lab/README.md` rewritten on every launch, with the field reference generated from the zod schemas via `z.toJSONSchema()`.

Accept:
- A board written by hand in `examples/demo` renders with correct positions, frames, connectors and tokens.
- An invalid file appears in the Problems panel and the rest of the board still renders.
- Round-trip tests pass for every item type, including an empty body.
- An agent given only `.post-lab/README.md` can add a valid note and connector.
- In a directory without `.post-lab/`, answering no creates nothing; answering yes creates `.post-lab/` and opens a blank canvas.

### M3. Cells

- Run endpoint: empty `outputs/<cell-id>/`, set `$POST_LAB_OUT`, run `command` with execa in `cwd`, save non-empty stdout as `stdout.txt`, return exit code and stderr.
- Cell node: Run button, running state, error panel with stderr and exit code.
- Renderers per D12, files sorted by name: images, CSV/JSON tables (TanStack Table with pagination), `.vl.json` charts, sandboxed `.html`, `.md`, `stdout.txt`, file links for anything else, error for JSON that isn't an array of objects.
- `examples/demo` scripts producing each output type, including a Python one run with `uv run` and a Plotly HTML chart.

Accept:
- Each demo cell runs from the UI and shows its outputs; reloading shows them again without re-running (R17).
- A failing script shows stderr and exit code.
- An `.html` output cannot call `/api` (its requests carry `Origin: null` and are rejected).
- Editing a cell file never starts a run.

### M4. Live sync and editing

- chokidar watcher → board store → SSE events. Re-read from disk on every event rather than trusting the event type. Echo suppression by updating the store before writing and comparing content hashes.
- UI applies incoming events; last write wins (D8).
- Editing: create items from a toolbar (note, text, shape, frame, cell, link); move, resize (NodeResizer), edit text inline, delete; connect items by dragging between handles (creates a connector file); frame reparenting on drag stop; style token picker (colour, size, align) for the selection.
- Every edit is saved with `PUT`/`DELETE` and written atomically.

Accept:
- Editing an item file in a text editor updates the open UI within a second.
- Moving one item rewrites only that item's file, and only its position lines change.
- Moving a frame rewrites only the frame's file.
- Deleting an item file in the editor removes it from the UI.

### M5. Moodboard

- Paste or drop an image: upload to `assets/<item-id>.<ext>` and create an image item sized to the image.
- Link items: Open Graph preview fetched once and written to `preview`; react-player for providers it supports, preview card for everything else.

Accept:
- A pasted image is saved as a file under `assets/` (not embedded) and shows on reload.
- A YouTube link plays inline; another URL shows a preview card, and its preview is in the item file.

### M6. Freehand drawing

- Draw tool: pointer input → perfect-freehand → SVG path, each stroke a React Flow node at its bounding box.
- Strokes saved to `strokes.json` (`PUT /api/strokes`); select, move (drag) and delete strokes; colour and size tokens.
- Strokes are drawn above every item; only the ink catches the pointer, so items under the empty part of a stroke's box stay clickable.

Accept:
- Strokes drawn in the UI persist across reload and update live when `strokes.json` changes on disk.
- Drawing does not change any item file.

### M7. Undo and redo

Added 2026-11-03 at the user's request (it was out of scope for v1).

- Undo history in the UI, per browser tab and in memory only (R18: nothing is persisted outside the host repo). It is cleared on reload.
- Every canvas edit is one `edit({ saved, deleted, strokes })` call (`src/ui/use-editor.ts`), which records a step (`src/ui/history.ts`): for each item touched, its state before (absent for a created item) and after (absent for a deleted one), and `strokes.json` before and after if the drawing changed. One user action is one step: a multi-item drag, a style change across the selection, drawing a stroke, or deleting a frame with its children, their connectors and any selected strokes. Dropping several images makes one step per image.
- Writes go out with frames first and connectors last (deletes the other way round), so restoring a frame and its children never names a missing item.
- Cmd+Z undoes and Shift+Cmd+Z redoes (Ctrl on other systems). While a text editor is open, the keys go to the text box instead.
- Undo writes each item's state before through the usual `PUT`/`DELETE`; redo writes its state after. A new edit clears the redo steps. The history keeps the last 100 steps.
- Last write wins (D8) applies to files, not to undo: undo leaves an item alone if it has changed since the step (on disk, by an agent or in another tab), applies the rest of the step, and says in a notice which files it skipped (by path). Redo does the same. Changes are compared as the files post-lab would write, leaving out a link's `preview`, which the server writes in after a link is saved. Only the applied part of a step moves to the other stack.

Accept:
- Create, move, resize, inline text edit, style change, connect and delete each undo and redo in one step, and a file post-lab wrote returns byte for byte to its earlier content.
- Undoing the deletion of a frame brings back the frame, its children and their connectors.
- Undoing an edit to an item that has since changed on disk leaves that file as it is and shows a notice naming the item.
- Cmd+Z in an open text editor undoes typing, not a board edit.

### M8. Packaging

- `pnpm build`: Vite builds `dist/ui`, tsdown builds `dist/cli.js`; `files` limits the package to `dist`.
- `prepack` runs `pnpm build`, so a packed tarball always holds a fresh `dist`. Only the server's imports are `dependencies`; UI packages are devDependencies because Vite bundles them into `dist/ui`.
- Smoke test: `pnpm pack`, then `npx --package=<path to tarball> post-lab` in a fresh temp host repo with no package.json (`npx <tarball>` tries to run the file itself).
- Publishing to npm happens only when the user asks.

Accept:
- The packed tarball starts with `npx` in a repo without a package.json and, after `y` is answered at the prompt, creates `.post-lab/README.md` and `.post-lab/items/`.
- Installing it as a devDependency and running `npx post-lab` uses the pinned local copy.
