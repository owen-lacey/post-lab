# post-lab v1 implementation plan

Status: plan, no code yet (2026-10-29). Implements `docs/requirements.md` (R1–R33, decisions D1–D14); read that first. This plan does not reopen those decisions. Where it fixes a detail they leave open (field names, API routes, milestone order), it says so under "Plan-level details".

Versions below were checked against the npm registry on 2026-10-29.

## Plan-level details

| Topic | Detail |
|---|---|
| Item IDs | 8 characters from `[0-9a-z]`, generated with nanoid `customAlphabet`. The ID is the file stem. Agents creating items pick any ID matching `^[0-9a-z]{8}$`. |
| Palette | 8 named colours: `gray`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`. Each maps to Tailwind theme tokens, not hex values in components (R33). |
| Draw order | Optional integer `z` on positioned items (default 0); ties are broken by ID. Frames always render below their children. |
| Frames | Frames do not nest: `frame` is not allowed on a frame. On drag stop, an item whose centre lies inside a frame becomes its child (positions converted to relative); dragged out, it becomes top level again. |
| Positions | Stored as integers to keep diffs small. Connectors have no position or size. |
| Key order | Item files are written with frontmatter keys in schema order, so UI saves produce minimal diffs. |
| Invalid files | Zod schemas are strict (unknown keys are errors). An invalid item file is not rendered; it appears in a board-level Problems panel with the file path and the zod message. |
| Writes | All file writes go through write-file-atomic (ISC). |
| Port | Default 4870, overridable with `--port`. If the port is busy, post-lab exits with an error. |
| Host root | The directory `npx post-lab` is run from. post-lab creates `post-lab/boards/` there if missing. |
| Link previews | When a link item has no `preview`, the server fetches Open Graph data (open-graph-scraper) once and writes it into the item's frontmatter, so it is committed and never refetched. Known providers (YouTube, Vimeo, etc.) play inline with react-player. |
| HTML outputs | Besides the `allow-scripts`-only iframe sandbox (D12), the server sends `Content-Security-Policy: sandbox allow-scripts` with every `.html` output, so it stays sandboxed even if opened directly. |
| Cell runs | One run per cell at a time; a second run request while one is in progress returns 409. Child processes are killed when post-lab exits. |

### Out of scope for v1

Not required by `docs/requirements.md`, so not built: undo/redo, board export (D4), rendered markdown in notes (D3), multi-user collaboration, cancelling a running cell, nested frames, free-floating arrows.

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
| `cell` | `command` (shell string), optional `cwd` (relative to host root) | description, optional |
| `connector` | `from`, `to` (item IDs); no position or size | label, optional |

Example, `post-lab/boards/churn-post/items/k3f9a0qz.md`:

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
  cli.ts              # args, start server, open browser with launch token
  shared/             # zod schemas, item file parse/serialize, types (used by server and ui)
  server/             # Hono app, security, board store, watcher, SSE, cells, guide
  ui/                 # React app: board list, canvas, nodes, renderers, toolbar
examples/demo/        # fixture host repo for development and tests
```

`engines.node` is `^24.15.0 || >=26.0.0`: chokidar 6 needs `>=22.22`, write-file-atomic 8 needs `^22.22.2 || ^24.15.0 || >=26`, and Node 24 is the current LTS line.

## HTTP API

All routes are under `/api` and require the session cookie (D9).

| Route | Purpose |
|---|---|
| `GET /api/session?token=` | Swap the launch token for the cookie, then redirect to `/` |
| `GET /api/events` | SSE stream: `item`, `item-removed`, `strokes`, `outputs`, `problems`, `boards` events |
| `GET /api/boards`, `POST /api/boards` | List boards; create one by slug |
| `GET /api/boards/:slug` | Items, strokes, problems and output listings for one board |
| `PUT /api/boards/:slug/items/:id`, `DELETE …` | Save or delete an item file |
| `PUT /api/boards/:slug/strokes` | Save `strokes.json` |
| `POST /api/boards/:slug/assets` | Upload a pasted or dropped image; returns its `src` |
| `GET /api/boards/:slug/files/*` | Serve assets and outputs |
| `POST /api/boards/:slug/cells/:id/run` | Run a cell; responds when the run finishes with exit code and stderr |

## Dependencies

| Purpose | Package (version, licence) |
|---|---|
| Canvas | `@xyflow/react` 12.12.0 (MIT), `perfect-freehand` 1.2.3 (MIT) |
| UI | `react` 19.3.1 (MIT), Tailwind, shadcn/ui, `lucide-react` |
| Renderers | `@tanstack/react-table` 9.3.1 (MIT), `vega-embed` 7.3.0 + `vega-lite` 6.5.0 (BSD-3-Clause), `react-markdown` 10.1.0 (MIT), `react-player` 3.4.0 (MIT) |
| Server | `hono` 4.13.14 (MIT), `@hono/node-server` 2.1.5 (MIT), `chokidar` 6.0.0 (MIT), `execa` 10.2.1 (MIT), `write-file-atomic` 8.0.0 (ISC), `open-graph-scraper` 6.12.0 (MIT), `open` 11.0.4 (MIT) |
| Shared | `zod` 4.6.7 (MIT), `yaml`, `nanoid` 6.0.2 (MIT) |
| Build/dev | `vite` 8.3.5, `tsdown` 0.23.3, `vitest` 5.0.5, `tsx` 4.23.15, `typescript-eslint` 8.72.1, Prettier (all MIT) |
| TypeScript | 6.0.x (Apache-2.0), not 7.0.2: `typescript-eslint` 8.72.1 peers `typescript >=4.8.4 <6.1.0` |

## Milestones

Each milestone ends with lint, typecheck, tests and build passing, and with its acceptance checks done by hand against `examples/demo`.

### M1. Scaffold and secure server

- pnpm, TypeScript 6, ESLint (`complexity` 10) + typescript-eslint, Prettier, Vitest.
- Vite + React + Tailwind + shadcn UI shell. shadcn `init` (Vite, Radix) installs `cn`, `radix-ui` and the Geist font; `sonner` pulls in `next-themes`.
- Hono server serving the built UI and `/api`. `src/cli.ts` with `--port`, launch token and browser open.
- Security middleware: bind 127.0.0.1, Host check on every request, Origin check on state-changing requests, token-for-cookie swap at `/api/session`, cookie name includes the port.
- `pnpm dev`: server via tsx against `examples/demo`, plus the Vite dev server proxying `/api`.

Accept:
- `pnpm dev` opens the UI already signed in.
- A request without the cookie gets 401; a wrong Host or a cross-origin POST gets 403 (Vitest).

### M2. Item format, read-only canvas and agent guide

- Zod schemas for every item type and `strokes.json`; parse/serialize with byte-for-byte round trips.
- Board store loads all boards from disk; Problems list for invalid files.
- Board list and create-board UI.
- React Flow canvas rendering every item type read-only: notes, text, shapes, frames (sub flows), connectors (edges), images (from `files/`), links (card without preview yet), cells (command and description, no outputs yet).
- Agent guide (D11): `post-lab/README.md` rewritten on every launch, with the field reference generated from the zod schemas via `z.toJSONSchema()`.

Accept:
- A board written by hand in `examples/demo` renders with correct positions, frames, connectors and tokens.
- An invalid file appears in the Problems panel and the rest of the board still renders.
- Round-trip tests pass for every item type, including an empty body.
- An agent given only `post-lab/README.md` can add a valid note and connector.

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
- Strokes saved to `strokes.json`; select and delete strokes; colour and size tokens.

Accept:
- Strokes drawn in the UI persist across reload and update live when `strokes.json` changes on disk.
- Drawing does not change any item file.

### M7. Packaging

- `pnpm build`: Vite builds `dist/ui`, tsdown builds `dist/cli.js`; `files` limits the package to `dist`.
- Smoke test: `pnpm pack`, then run the tarball with `npx` in a fresh temp host repo with no package.json.
- Publishing to npm happens only when the user asks.

Accept:
- The packed tarball starts with `npx` in a repo without a package.json and creates `post-lab/README.md` and `post-lab/boards/`.
- Installing it as a devDependency and running `npx post-lab` uses the pinned local copy.
