# Status — Turbo Sportsbook Design System

Maintained snapshot (not append-only). Update when inventory or conventions change.

## What this is

A design system for the **Turbo Sportsbook** product, started as a detached duplicate of an internal system. Git remote removed (not pushed anywhere yet). DTCG tokens (`tokens/`) → generated static docs (`docs/`), Vercel from repo root. Chat is Ukrainian; every `docs/*.html` artifact is English, `<html lang="en">`.

**Dark** system: page is the darkest surface, cards get lighter (opposite elevation direction from a light system). Colour primitives are a fixed, **Theme-Editor-driven** set (no Tailwind ramp), baked to the **Pro** theme; the live product rewrites them as CSS variables at runtime.

## Current state

**Colour token migration — phase 1 done (interactive):**
- `tokens/primitives/color.tokens.json` rewritten to the sportsbook set (Pro theme): `color.base` (surface-0/2/4/6, secondary, contrast, active-1/2, accent) · `color.status` (positive/negative/warning + color-4..7) · `color.sub` (opacity tints/darken/lighten/shadow) · white/black. Kept under top-level `color` so every component build script's generic resolver still works.
- `tokens/semantic/color.tokens.json` rewritten to reconciled groups (below) **plus COMPAT aliases** (old names → new), so all 26 component build scripts still resolve (verified: 0 dangling refs). Only 3 files mentioned old ramp primitives and only inside `$description` prose (input/button/counter) — harmless.
- `tools/build-semantic-colors-doc.mjs` rebuilt as the **semantic legend**: one accordion per canonical token (chevron), summary = swatch + name + alias; expand = resolved value + full note + auto-generated "Used in" index (components + in-component context, linked). Translucent swatches render split (over page / over checkerboard) so transparency is obvious. COMPAT aliases are hidden but route their usages to the canonical token.
- Message/Bubble/Attachment family (Attachment/Message/Bubble/ThreadListItem/Composer) deleted — irrelevant to sportsbook. Badge/Chip kept.
- Rebranded to **Turbo Sportsbook** everywhere (nav.mjs, all build-script titles, index.html, CLAUDE.md). `logs/decision-log.md` (hp-design history) deleted.

**Layout tokens:** the spacing scale namespace was renamed **`dim` → `spacing`** (values unchanged) — `{dim.N}` → `{spacing.N}` across all token files, the `dimension.tokens.json` top-level key, all build-script registries (`spacing: dim,`), bare `resolve("dim.N")` refs, and layout.html display labels (`--spacing-N`, "Spacing" section). File kept as `dimension.tokens.json`. Note: spacing values are inlined as px in generated CSS (only *colors* become `--tok-*` vars), so there are no `--tok-spacing-*` vars.

**Typography:** family → **Rubik** self-hosted (Cyrillic), weights 400/500/800. The font only loads when the preview server runs from the **repo root** (`../assets` is outside a `docs/`-rooted server — see CLAUDE.md). Fixed the hardcoded-`'Sora'` specimen bug. Label specimen = "Freebet".

**Known build failures (all phase-2, expected):** `colors`/`badge`/`avatar` (reference removed ramp/tag/avatar tokens) and the 6 overlay pages `tooltip`/`popover`/`drawer`/`modal`/`menu`/`listbox` (see the shadow collision below). The other 19 pages build clean.

**Shadow namespace collision (introduced in phase 1, resolve in phase 2):** the new semantic `shadow` group (2/4/6/8 → sub-black colors, the sportsbook way) collides in each build script's registry with the legacy primitive `shadow.sm/md/lg` (composite offset/blur/spread) via the `...semantic` spread — the semantic one wins, so `{shadow.sm}` no longer resolves and the 6 overlay builds crash. Sportsbook has no composite-shadow primitive (shadows = a shadow color + component-defined geometry), so phase 2 should **remove `tokens/primitives/shadow.tokens.json`** and rework the overlay components' shadows onto the semantic `shadow.*` colors for the dark theme.

**Semantic groups (canonical):** surface (page/card/raised/overlay) · fill (active/activeGradient/accent/positive/negative/warning) · bg (active/accent/positive/negative/warning — 12% tints) · outline (default/strong/active/accent/positive/negative/warning) · text (default/secondary/contrast/forActiveBg/active/accent/positive/negative/warning/onFill) · icon (mirrors text) · betStatus (win/loose/halfWin/halfLoose/refund/cashout/pending) · label (live/freebet/postponed/reviewing/score/inactiveCounter/activeCounter) · darken (2/4/6/8) · lighten (2/4) · shadow (2/4/6/8) · additional (favorites/preloader).

## Locked-in conventions

**Colour model (sportsbook):**
- **`bg` = 12% colored tint, `fill` = solid.** **`surface` = neutral elevation greys** (page/card/raised); **`bg` = colored washes.** Different jobs, kept as separate groups on purpose.
- **surface-6 is a fill/outline colour, not a background** (outline.strong, outline-buttons, lines). Use as a background only for sanctioned exceptions (e.g. `label.score`).
- **Hover/pressed = a darken (bright fills) / lighten (dark neutral) overlay** — conceptually an alpha layer the real product applies. In the DS this is expressed two ways: the `darken`/`lighten` semantic groups hold the overlay colours, AND the `fill.*Hover`/`*Pressed` tokens hold the **pre-composited result** for the Pro theme (e.g. `fill.activeHover` = active + 12% darken = `#DD7B2D`), so the static docs bake a concrete value like everything else. A real port swaps the pre-composited token for an alpha overlay. Darken/shadow steps are built on the **page colour** (surface-0), not pure black.
- **Active colour can be a gradient** (`fill.activeGradient`, active-1→active-2, 90°); flat active (text/icons) = active-1. The gradient is also reused as the **border on hover** states.
- **`text.forActiveBg`**: text placed on an active-colored fill is dark or white depending on how bright the theme's active colour is (Pro active = bright orange → dark text). A parallel `text.forLabelBg` (light/dark per theme) is deferred for label backgrounds.
- Dropped from the old system: `avatar` (team logos instead), `ai` role, the decorative 10-hue `tag` palette (labels have semantic meaning — Badge will be driven by `label`/`betStatus`/status, not arbitrary hues).

**Build/docs (still valid, generic):**
- Layering `primitives → semantic → components`, never a hardcoded value below primitives.
- Every resolved colour → `--tok-<dotted-path-kebab>` CSS var (`tools/lib/css-vars.mjs`). The `--tok-` prefix is load-bearing (once collided with the docs chrome's own `--text-primary`, turned page text blue).
- Generated `<style>` block and the printed "copy this code" sample must be the **exact same string** — never hand-duplicate.
- Reused sub-component tokens must resolve **real values** from that token file, never retype a colour-role name by hand (caught real bugs twice).
- Icon colour needs its own explicit rule per state — don't rely on `currentColor` inheriting from the label unless the token values actually match.
- `resolveToken()` silently drops `$extensions` (the field `text-style.link-*`/`label-*` use for `textDecoration`/`textTransform`) — fetch `$extensions` directly from the referenced node.
- BEM: shared block class + `--modifier` (size/variant/state) + `__element`. Where two variants share identical sizing, assert it identical at build time rather than trusting it.
- Overlay components (Tooltip/Popover/Drawer/Modal/Menu/Listbox) use native browser mechanisms (`popover` attr, `<dialog>`+`showModal()`), not hand-rolled JS state; only a small positioning/click-outside script where the API doesn't cover it.

**Known non-bugs:** `file://` preview is flaky (use `python3 -m http.server 8743` in `docs/`). The screenshot action returns blank on tall pages after scrolling far — verify via `read_page`/`get_page_text`/computed-style JS.

## Components (23)

Button, Counter, Input, Select, Search, Pagination, Separator, Tabs, Checkbox, Radio, Box, Card, Switch, Grid, Tooltip, Popover, Drawer, Modal, Menu, Listbox, Avatar, Badge, Chip. **All migrated to canonical sportsbook colours; all 28 doc pages build.**

## Phase 2 — DONE (autonomous run)

1. ✅ **Compat → canonical rename** applied across all component token files + build scripts (43 files) via codemod: `fill.primary→fill.active`, `primaryHover→activeHover`, `primaryActive→activePressed`, `success→positive`, `danger→negative`, `neutralActive→neutralPressed`, `surface.default→card`, `sunken→raised`, `inverse→raised`, `bg.*` likewise, `border.*→outline.*` (`focus→outline.active`), `text/icon .primary/success/danger/muted→…`, `status.*→fill.*`, `ai` dropped. **COMPAT aliases removed** from the semantic file — it is now canonical-only.
2. ✅ **Hover/pressed** — pre-composited tokens (`fill.activeHover`/`activePressed`/`neutralHover`/`neutralPressed`/`negativeHover`) baked to Pro; see the hover convention note above (real port applies an alpha overlay).
3. ✅ **Badge** reworked (role-driven: neutral/active/positive/negative/warning × tint/solid; decorative `tag` axis dropped; named labels & bet statuses shown as role applications). **Avatar** identity palette removed → single neutral initials fallback (`avatar.*` + `chart-series.tokens.json` deleted).
4. ✅ **colors.html** rewritten for the sportsbook primitive set (base/status/absolutes/sub, checkerboard for translucent).
5. ✅ **Shadow→elevation**: primitive `shadow.tokens.json` renamed to `elevation.tokens.json` (frees the `shadow` name for the semantic colour group), recoloured to the page colour at dark-theme alpha; 6 overlay components + layout updated.
6. ✅ **Typography** (done in the earlier interactive pass): family → Rubik (self-hosted, Cyrillic), weights 400/500/800, `dim`→`spacing`.
7. ✅ **Rebuilt everything**; `assets/fonts/sora/` deleted; `index.html` token cards refreshed.

8. ✅ **Text-on-active-fill contrast** — after the mechanical rename, elements sitting on the bright active fill still had white text (`text.onFill`, correct for the old blue, wrong on Pro's orange). Fixed to `text.forActiveBg`/`icon.forActiveBg` (dark) in button/chip/checkbox/counter(onNeutral)/pagination/listbox/drawer, in both the token files AND the builders' hardcoded `colorPaths`/CSS (the builders hardcode these, so the token edit alone wasn't enough). Kept `onFill` (white) where the fill is dark: tooltip (dark surface), modal danger button (red), the counter-on-primary inactive pill (dark activePressed). Added `icon.forActiveBg` to the semantic file. Verified: `.btn--primary` = orange bg + `#11141C` text.

**Remaining polish (not blocking):** the component doc pages' hand-written **prose** (legend rows, `$description`s) still mentions old token names/colours in places ("brand blue", "fill.primary", "blue.600", "gray.100") — cosmetic, doesn't affect rendering; a prose sweep is a separate low-priority pass. Full in-browser visual QA of hover/pressed on every page (screenshot tool goes blank on tall pages after scrolling — use computed-style JS). `text.forLabelBg` (per-theme label text) still deferred. Docs 4-theme switcher still deferred.

## Open / deferred

- `text.forLabelBg` (light/dark per theme) for text on label backgrounds — deferred.
- Docs theme switcher for all 4 themes (Blue/Pro/Gold/Alien) — only Pro is baked; primitives file has all 4 columns' worth of data available if wanted.
- The Vercel deploy / Deployment Protection state is unverified from this side.
