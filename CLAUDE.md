# Turbo Sportsbook Design System

DTCG-format JSON tokens (`tokens/`) are the source of truth; a generated static docs/storybook site (`docs/`) is the only consumer so far, deployed to Vercel from the repo root.

This project began as a duplicate of an internal design system and is being repurposed for the **Turbo Sportsbook** product. The colour model is the big difference: there is **no generative Tailwind ramp** — primitives are a fixed, theme-editor-driven set (surfaces + active/accent + status), baked here to the **Pro** theme, and the live product rewrites them as CSS variables at runtime. Sportsbook is a **dark** system (page is darkest, cards get lighter), the opposite elevation direction from a light system.

**Before doing anything else, read `logs/status.md`** — a maintained (not append-only) snapshot of what's built, the locked-in conventions, and what's still open.

## Layering

`tokens/primitives/` → `tokens/semantic/` → `tokens/components/`. Never hardcode a color/dimension/font value anywhere below primitives — everything aliases via DTCG `{a.b.c}` refs.

- **Primitives** (`tokens/primitives/color.tokens.json`): `color.base` (surface-0/2/4/6, secondary, contrast, active-1/2, accent), `color.status` (positive/negative/warning + color-4..7), `color.sub` (opacity-derived tints/darken/lighten/shadow), plus white/black. Each maps to a Theme Editor control — see the `$description`s.
- **Semantic** (`tokens/semantic/color.tokens.json`): canonical groups are surface / fill / bg / outline / text / icon / betStatus / label / darken / lighten / shadow / additional. Convention: **`bg` = 12% colored tint, `fill` = solid**; **`surface` = neutral elevation greys (page/card/raised), `bg` = colored washes**. Hover/pressed are an **opacity overlay** (darken/lighten), not separate `*Hover` tokens. The active color can be a gradient (`fill.activeGradient`, active-1→active-2), also reused as the border on hover.
- **COMPAT aliases**: the semantic file still carries old names (e.g. `fill.primary` → `fill.active`, `border.*` → `outline.*`, `surface.default` → `surface.card`) so components keep resolving during the migration. The component pass removes these.

## The component build pattern

Every component is: `tokens/components/X.tokens.json` + `tools/build-X-doc.mjs` → `docs/X.html`, wired into `tools/lib/nav.mjs` and `docs/index.html`. Run `node tools/build-X-doc.mjs` after any token edit (or loop over `tools/build-*.mjs` to rebuild everything — cheap, always do this before considering a change done).

Hard rules established over many rounds of fixing violations:
- All resolved colors become CSS custom properties prefixed `--tok-` (via `tools/lib/css-vars.mjs`) — never a literal hex in generated CSS. The prefix exists because a token var once collided with the docs chrome's own `--text-primary` and silently turned a whole page's text blue.
- The generated `<style>` block and the printed "copy this code" sample must be the exact same string — never hand-duplicate.
- When reusing another component's tokens, resolve the real values from that token file — never retype a color-role name by hand. Caught real bugs from doing this wrong twice.
- Icon color needs its own explicit rule per state — don't rely on `currentColor` inheriting from the label unless you've checked they're actually the same token value.
- `resolveToken()` silently drops `$extensions` (used by `text-style.link-*`/`label-*` for `textDecoration`/`textTransform`) — fetch `$extensions` directly from the referenced node, don't trust the resolved typography object to carry it.

## Language

Chat with the user happens in Ukrainian. Every docs-site artifact (`docs/*.html` — legends, section prose, story titles/notes, sample data) is English, `<html lang="en">` on every page.

## Verifying visually

The Browser preview tool is unreliable with `file://` URLs in this repo (treated as outside the sandbox's project root — stale snapshots, "no site open" errors). Workaround: run the server from the **repo root** — `python3 -m http.server 8743 &` — and open `http://localhost:8743/docs/X.html`. Serve from root, NOT from `docs/`: pages reference fonts/assets via `../assets/...`, which is outside a `docs/`-rooted server (the `@font-face` CSS 404s and the font silently falls back to a system face — this exact trap hid the Sora/Rubik font not loading). On Vercel it works because the bare domain rewrites to `docs/` from the repo root. The screenshot action also returns blank on tall pages after scrolling far down — verify via `read_page`/`get_page_text`/computed-style JS instead of trusting a blank capture. Kill the server when done.
