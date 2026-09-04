# AGENTS.md

## Project

Vanilla JS/HTML/CSS Pac-Man clone, course project for learning Spec Driven Development. No `package.json`, npm, build, lint, or tests exist — do not invent or suggest toolchain commands.

## Run / verify

Open `src/index.html` directly in a browser (plain script tags, no modules, no fetch — no dev server required).

## Architecture

- No ES modules. Four scripts load via `<script>` tags in `src/index.html` in fixed order: `maze.js` → `game.js` → `render.js` → `main.js`. They share state only through globals (`MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`, `createGame`/`update`/`draw`). A new JS file needs its `<script>` tag added to `index.html`.
- `MAZE` (maze.js) is the pristine maze, never mutated. Each game copies it into `game.grid`; `render.js` draws from `game.grid` (eaten dots), never `MAZE`.
- Maze invariants: 28 cols × 31 rows; `#`=wall(1), `.`=dot(2), ` `=empty(0), `-`=pen door(3); row 14 is the wrap-around tunnel; the maze is symmetric about the axis between cols 13 and 14 — preserve symmetry when editing.

## Spec-driven workflow

New features follow: `/spec` (design only, saves `specs/NN-slug.md` as Draft) → user marks it Approved → `/spec-impl NN-slug` (implements step-by-step on branch `spec-NN-slug`). Config: `specs/.spec-config.yml` (`AutoCreateBranch`).

Note: `specs/` does not exist yet, and this directory is NOT a git repo — `/spec-impl` branch creation will fail until `git init` is run.

## Conventions

- Spanish for README, code comments, and UI strings. Replies match the user's prompt language.
- Code style: single quotes, spaces inside parens like `( x )`, semicolons, short header comment per file describing its role.
