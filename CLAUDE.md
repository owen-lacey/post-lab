# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Being specified in `docs/requirements.md` (requirements R1–R33, decisions D1 onwards). All solution choices are decided (D6–D15). `docs/plan.md` is the implementation plan (milestones M1–M7). M1 (scaffold and secure server), M2 (item format, read-only canvas, agent guide), M3 (cells and output renderers) and M4 (live sync and editing) are done.

## Commands

Node 24.15+ is required; if the shell resolves an older Node, prefix PATH with `~/.nvm/versions/node/v24.15.0/bin`.

- `pnpm dev`: API server (tsx watch, against `examples/demo`) on 4871 plus Vite on 5173, which opens the browser.
- `pnpm build`: tsdown builds `dist/cli.js`, then Vite builds `dist/ui`.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format` / `pnpm format:check` (Prettier skips markdown).
- Run the built tool: `node dist/cli.js [--port <n>] [--no-open]` from a host repo root.

## Stack

- **Canvas**: React Flow (`@xyflow/react`); freehand drawing via perfect-freehand. Items are custom React nodes; frames are sub flows; connectors are edges (D6).
- **UI chrome**: Tailwind + shadcn/ui + Lucide (R33).
- **Item files**: markdown with YAML frontmatter, split by post-lab and parsed with `yaml` (not gray-matter) (D7).
- **Server and sync**: local Node server (Hono); chokidar watches `.post-lab/`; changes pushed to the UI over SSE; UI saves via HTTP PUT; last write wins, disk is the truth (D8).
- **Cells**: frontmatter `command` (shell string) + optional `cwd`; run only on a click in the UI; output dir emptied and exposed as `$POST_LAB_OUT`; run via execa; stdout saved as `stdout.txt` (D9).
- **Security**: local, single-user only. Bind 127.0.0.1; Host check on every request; Origin check on state-changing requests; GET routes have no side effects; no sign-in (D9).
- **Distribution**: npm package with a `post-lab` bin, run via `npx post-lab` from the host repo root (optionally pinned as a devDependency). Vite + React + TypeScript frontend built at publish time and served by Hono (D10).
- **Agent guide**: post-lab rewrites `.post-lab/README.md` on every launch (D11).
- **Output renderers**: by extension — images native; `.csv`/`.json` tables via TanStack Table; `.vl.json` via vega-embed; `.html` in an `allow-scripts`-only sandboxed iframe; `.md` via react-markdown; `stdout.txt` as text; anything else as a file link (D12).
- **Validation**: zod 4; the guide's field reference is generated with `z.toJSONSchema()` (D13).
- **Tooling**: pnpm, Vitest, ESLint (`complexity` max 10) + typescript-eslint, Prettier (D14).

## Board storage (in the host repo)

One board per host repo (D15). If `.post-lab/` is missing, the CLI asks before creating it.

```
.post-lab/
  README.md                 # agent/human guide to the format, rewritten on every launch
  items/<id>.md             # one content item: frontmatter (type, position, size, tokens, frame, cell settings) + text body
  strokes.json              # all freehand strokes (opaque); optional
  assets/<file>             # images, referenced by an image item's `src`
  outputs/<cell-id>/        # cell outputs, committed to git
```

- Item types: note/sticky, text, shape, image, link embed, frame, connector, cell. IDs are short random strings.
- Items inside a frame store `frame: <id>` and positions relative to it. Connectors are item files with `from`/`to`.
- AI agents work on boards only by editing files; no CLI or MCP layer.

## What post-lab is

A labs tool for storyboarding and data analysis for blog posts. It is installed into a host repo (e.g. a blog post's repo) and used from there.

- **Canvas**: Miro-like spatial board for storyboarding.
- **Notebook feel**: like a Python notebook — canvas items can run code and show data/analysis output from the host repo.
- **Not just code**: text boxes, stickies, and moodboards (images, link embeds) are first-class, independent of code cells.
- **Repo-bound**: every board is tied to the codebase it is installed in.

## Hard requirements

- **All data lives in the host repo.** No external database, cloud storage, or user-level/global state. Everything post-lab persists is a file in the host repo, so it is versioned with git alongside the code it describes.
- **AI-native storage.** The on-disk format must be cheap and fast for an AI agent to read and write directly (plain text, small files, diff-friendly, no need to load a whole board to change one item).
- **Hand-editable.** The same files must be comfortably editable by a human in a text editor, and edits made by hand or by AI must be picked up by the UI.
- **Installable.** post-lab is a tool that is added to an existing repo; keep the tool's own code separate from the board data it writes into the host repo.
