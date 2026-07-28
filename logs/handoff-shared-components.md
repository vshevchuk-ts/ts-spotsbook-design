# Handoff — shared component-CSS library refactor

**For a fresh Claude session (possibly a different account).** Read this + `logs/status.md` + `CLAUDE.md` before touching anything. This repo is the Turbo Sportsbook design system (DTCG tokens → generated `docs/*.html`). Git deploys `main` to Vercel.

## The goal

Extract each component's **CSS + markup generators into shared modules** under `tools/lib/components/*.mjs`, so a page *imports* a component instead of re-emitting its CSS. Order:

1. Most-reused first: **Input, Button, Odds, Badge, Tooltip, Select** → `tools/lib/components/`.
2. Migrate the betslip pages (**bet-card**, **summary**) to import them, then the rest.

## Why (the root cause this fixes)

The tokens (`tokens/`) are the shared source of **values** — solid. But **component CSS is NOT shared**: every `tools/build-X-doc.mjs` independently re-resolves and re-emits the same CSS. So "using Input inside Summary" today means copy-resolving Input's CSS into `build-summary-doc.mjs` — which invites re-drawing and drift, and has already caused real bugs (I hand-rolled a `.sum-stake` + fake `.sum-max` chip when Input's real `input--action` variant — field + Max Button — already existed; and re-derived Input in the bet card). The variant lived in `build-input-doc.mjs`, not the token JSON, so a tokens-only check missed it.

After this refactor, a page does `import * as Input from './lib/components/input.mjs'` and gets the **byte-identical** real component — impossible to re-draw or drift.

## Locked conventions (MUST honor — also in CLAUDE.md "Hard rules")

- **Every resolved colour → a `--tok-<dotted-path-kebab>` CSS custom property** (via `tools/lib/css-vars.mjs`, `cssVarName`). Never a literal hex in generated CSS.
- **Builders never hardcode a colour role/primitive** — resolve from the token node's `$value` (a `cvOf(node)` helper), so a token repoint flows through with zero build edits. `colorPaths` (the `:root` emission list) holds **semantic roles only, never primitives**.
- **Components alias semantic roles, never primitives** — no `{color.base|status|sub|white|black.*}` in a component token file. Audit: `grep -rE '\{color\.(base|status|sub|white|black)' tokens/components/` must be **0**.
- **Compose out of existing components, never redraw.** Check the component's **build script** for variants (they live there, not the token JSON), e.g. `input--action`, button `twoRow`/`roundIcon`, badge `named`/`betStatus`.
- **Clamp every inlined SVG icon** to its wrapper: `.wrap svg { display:block; width:100%; height:100% }` (imported `assets/icons/**` carry their own `width`/`height` attrs that otherwise win). Exception: Select puts the class directly on the `<svg>` and sizes it via CSS on the element — that also clamps.
- Generated `<style>` block and any printed "copy this code" sample must be the **same string** — never hand-duplicate.
- `resolveToken()` drops `$extensions` (used by `text-style.link-*`/`label-*` for `textDecoration`/`textTransform`) — read it off the referenced node in `typoOf`.

## Proposed architecture

### 1. `tools/lib/resolve.mjs` — a shared resolver context

Every build currently duplicates the same ~40 lines (load primitives + semantic, build `registry`, `get`/`resolve`/`resolveToken`/`cv`/`cvOf`/`typoOf`/`px`). Extract once:

```js
export function createCtx() {
  // load primitives: color, dimension(spacing), radius, elevation, typography, text-styles
  // load semantic; build registry = { color, spacing, radius, elevation, family, weight, size,
  //   leading, tracking, "text-style", ...semantic }
  // return { registry, get, resolve, resolveToken, px, cv, cvOf, typoOf, renderRootVars, cssVarName,
  //   load, /* the component token files: */ tokens: { input, button, odds, badge, tooltip, select, ... } }
}
```
- `cvOf(node) = cv(node.$value.replace(/[{}]/g,''))` — the "resolve role from node" helper.
- `typoOf(node)` — the existing typography→CSS that also reads `$extensions` textDecoration/textTransform.
- Keep `cv`/`cssVarName`/`renderRootVars` from `tools/lib/css-vars.mjs`.

### 2. `tools/lib/components/<name>.mjs` — one per component

Each exports:
```js
export const colorPaths = ["surface.page", "outline.strong", ...]; // semantic roles this component emits as :root vars
export function css(ctx) { return `...the real .input / .btn / .odds ... CSS...`; } // uses ctx.cv/cvOf/typoOf/px + ctx.tokens.<name>
// markup helpers that return the real classes, e.g.:
export function action(ctx, { size = "lg", label, value, prefix = "$", max }) { /* .input.input--action + Button.twoRowSecondary */ }
```
- `colorPaths` are unioned by the consuming page; markup helpers return the real `.input`/`.btn`/`.select`/`.odds`/`.badge` class strings.
- Cross-component composition is fine: `input.mjs`'s `action()` imports `button.mjs` for the Max (`btn btn--secondary btn--tworow`). `summary`/`bet-card` import `odds.mjs`, `tooltip.mjs`, etc.
- Odds also ships a small `oddsPlayScript()` (the rAF count-up + flash trigger) — export it as a string so pages that show live odds can drop it in.

### 3. A page build becomes:

```js
import { createCtx } from './lib/resolve.mjs';
import * as Input from './lib/components/input.mjs';
import * as Odds  from './lib/components/odds.mjs';
const ctx = createCtx();
const colorPaths = [...new Set([...Input.colorPaths, ...Odds.colorPaths, ...pageOwnPaths])];
const rootVars = ctx.renderRootVars([...colorPaths.map(p => [p, ctx.resolve(p)]), ["family.sans", `'${ctx.resolve("family.sans")}', sans-serif`]]);
const css = `${rootVars}\n\n${Input.css(ctx)}\n\n${Odds.css(ctx)}\n\n${pageOwnCss}`;
```

## The plan, step by step

For EACH component (Input, Button, Odds, Badge, Tooltip, Select), in this order:

1. Create `tools/lib/components/<name>.mjs` by **lifting the exact CSS + markup** out of `tools/build-<name>-doc.mjs` (move, don't rewrite — the output must not change).
2. Refactor `build-<name>-doc.mjs` to `import * as X` and call `X.css(ctx)` / `X.<markup>()`.
3. **Verify output-preserving:** `node tools/build-<name>-doc.mjs` then `git diff docs/<name>.html` must be **empty** (or trivially whitespace). This is the regression gate — the standalone page must render identically.

Then migrate the composite pages:

4. `build-bet-card-doc.mjs` — replace its inline copies of Input/Badge/Tooltip/Odds with the lib imports. `git diff docs/bet-card.html` should stay empty (the composed CSS was already resolved from the same tokens).
5. `build-summary-doc.mjs` — replace its inline Input/Select/Button/Odds with lib imports. (Summary already uses the real `.input`/`.select`/`.btn`/`.odds` classes, so this is a straight swap; `git diff docs/summary.html` empty.)
6. `build-mobile-betslip-doc.mjs` (Designs prototype) and any remaining page that reuses a component.
7. Optionally extract the remaining standalone components too, for consistency.

Cross-component dependency order to extract first: **Button** (Input's `action` + toast's action + card × reuse it) and **Odds** (bet-card, summary), then Input/Select/Badge/Tooltip.

## Verify (every step)

- `for f in tools/build-*.mjs; do node "$f" >/dev/null 2>&1 || echo "FAIL: $f"; done` — all must build.
- `git diff --stat docs/` after a component extraction — **should be empty** for that component's page (output-preserving is the whole point).
- `grep -rE '\{color\.(base|status|sub|white|black)' tokens/components/` → **0**.
- Visual/spot-check via a server **from repo root** (fonts/assets are `../assets/…`): `python3 -m http.server 8743 &` then `http://localhost:8743/docs/X.html`. The screenshot tool goes blank on tall pages after scrolling — verify with computed-style JS / `read_page` instead. Kill the server when done.

## Git workflow (as used here)

`main` deploys to Vercel. This session has been committing straight to `main` at the user's instruction (`git push origin main`), one commit per logical change, message ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Confirm the user still wants direct-to-main vs. a branch before pushing.

## State pointers

- `logs/status.md` — full component inventory + betslip build progress (Bet card, Odds, Summary, Alert, Toast, Badge all done; next after this refactor: Place-bet CTA + footer icon buttons, suspended/error card states, collapsed betslip, then assemble the Drawer shell).
- The betslip reference screens are in `~/Documents/betslip-mobile/` (82 screens; the checklist artifact grouped 24 components into build-new / extend / reuse).
- Note: this account's `~/.claude/.../memory/` (compose-out-of-components, builders-never-hardcode-colors) will NOT travel to another account — but the same rules are captured in CLAUDE.md "Hard rules" and above.
