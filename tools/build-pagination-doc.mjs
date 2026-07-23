// Regenerates docs/pagination.html from tokens/components/pagination.tokens.json.
// The rows-per-page control isn't a new dropdown — it loads and renders
// tokens/components/select.tokens.json's sm size directly, so it's pixel-identical
// to the real Select component instead of a hand-styled lookalike.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-pagination-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";
import { cssVarName, renderRootVars } from "./lib/css-vars.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const load = (p) => JSON.parse(fs.readFileSync(path.join(root, p)));

const colorPrim = load("tokens/primitives/color.tokens.json").color;
const dim = load("tokens/primitives/dimension.tokens.json").spacing;
const radiusPrim = load("tokens/primitives/radius.tokens.json").radius;
const typo = load("tokens/primitives/typography.tokens.json");
const textStyle = load("tokens/primitives/text-styles.tokens.json")["text-style"];
const semantic = load("tokens/semantic/color.tokens.json");
const pagination = load("tokens/components/pagination.tokens.json").component.pagination;
const select = load("tokens/components/select.tokens.json").component.select;

const registry = {
  color: colorPrim,
  spacing: dim,  radius: radiusPrim,
  family: typo.family,
  weight: typo.weight,
  size: typo.size,
  leading: typo.leading,
  tracking: typo.tracking,
  "text-style": textStyle,
  ...semantic,
};
function get(ref) {
  const parts = ref.replace(/[{}]/g, "").split(".");
  let node = registry;
  for (const p of parts) node = node[p];
  return node;
}
function resolveValue(v) {
  if (typeof v === "string" && v.startsWith("{")) return resolveToken(get(v));
  return v;
}
function resolveToken(node) {
  const v = node.$value;
  if (v && typeof v === "object" && !("value" in v)) {
    const out = {};
    for (const [k, sub] of Object.entries(v)) out[k] = resolveValue(sub);
    return out;
  }
  if (v && typeof v === "object" && "value" in v) return v;
  return resolveValue(v);
}
const resolve = (ref) => resolveToken(get(ref));
const px = (d) => `${d.value}${d.unit}`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- color tokens this page uses, as CSS custom properties ----
const colorPaths = [
  "text.default", "text.forActiveBg", "text.disabled", "text.secondary", "fill.neutralHover", "fill.active",
  "surface.raised", "outline.default", "outline.strong", "icon.default",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

// ---- pagination item ----
const item = {
  size: px(resolve(pagination.item.size.$value)),
  paddingX: px(resolve(pagination.item.paddingX.$value)),
  gap: px(resolve(pagination.item.gap.$value)),
  iconSize: px(resolve(pagination.item.iconSize.$value)),
  radius: px(resolve(pagination.item.radius.$value)),
  label: resolveToken(pagination.item.label),
};

// ---- rows-per-page: reuse Select's sm size directly, not a new style ----
const selectRadius = px(resolve(select.radius.$value));
const selSm = select.size.sm;
const sel = {
  height: px(resolve(selSm.height.$value)),
  paddingX: px(resolve(selSm.paddingX.$value)),
  gap: px(resolve(selSm.gap.$value)),
  iconSize: px(resolve(selSm.iconSize.$value)),
  value: resolveToken(selSm.value),
};
const barGap = px(resolve(pagination.bar.gap.$value));

const iconChevronLeft = fs.readFileSync(path.join(root, "assets/icons/material-filled/chevron_left.svg"), "utf8").replace("<svg ", '<svg class="page-item__icon" ');
const iconChevronRight = fs.readFileSync(path.join(root, "assets/icons/material-filled/chevron_right.svg"), "utf8").replace("<svg ", '<svg class="page-item__icon" ');
const iconChevronDown = fs.readFileSync(path.join(root, "assets/icons/material-filled/expand_more.svg"), "utf8").replace("<svg ", '<svg class="select__chevron" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.page-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: ${item.size};
  min-width: ${item.size};
  padding: 0 ${item.paddingX};
  border: none;
  border-radius: ${item.radius};
  background: transparent;
  color: ${cv("text.default")};
  font-family: ${cv("family.sans")};
  ${typoCss(item.label)}
  cursor: pointer;
}
.page-item__icon { width: ${item.iconSize}; height: ${item.iconSize}; }
.page-item:not(.page-item--active):not(.page-item--disabled):hover, .page-item--hover { background: ${cv("fill.neutralHover")}; }
.page-item--active { background: ${cv("fill.active")}; color: ${cv("text.forActiveBg")}; cursor: default; }
.page-item--disabled { color: ${cv("text.disabled")}; cursor: not-allowed; }
.page-ellipsis { display: inline-flex; align-items: center; justify-content: center; height: ${item.size}; min-width: ${item.size}; color: ${cv("text.secondary")}; ${typoCss(item.label)} }
.pagination { display: inline-flex; align-items: center; gap: ${item.gap}; }

.select { display: inline-flex; align-items: center; box-sizing: border-box; background: ${cv("surface.raised")}; border: 1px solid ${cv("outline.default")}; border-radius: ${selectRadius}; font-family: ${cv("family.sans")}; cursor: pointer; height: ${sel.height}; padding: 0 ${sel.paddingX}; gap: ${sel.gap}; }
.select:hover { border-color: ${cv("outline.strong")}; }
.select__value { color: ${cv("text.default")}; ${typoCss(sel.value)} }
.select__chevron { flex-shrink: 0; margin-left: auto; color: ${cv("icon.default")}; width: ${sel.iconSize}; height: ${sel.iconSize}; }
.rows-per-page { display: inline-flex; align-items: center; gap: ${px(resolve("spacing.2"))}; }
.rows-per-page__label { color: ${cv("text.default")}; ${typoCss(item.label)} }
.pagination-bar { display: flex; align-items: center; justify-content: space-between; gap: ${barGap}; width: 100%; }`;

// ---- classic "always show first/last, collapse the middle" range algorithm ----
function paginationRange(current, total, siblingCount = 1) {
  const totalVisible = siblingCount * 2 + 5; // first + last + current + siblings on both sides + wiggle room
  if (total <= totalVisible) return Array.from({ length: total }, (_, i) => i + 1);
  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, total);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;
  if (!showLeftEllipsis && showRightEllipsis) {
    const range = Array.from({ length: 3 + siblingCount * 2 }, (_, i) => i + 1);
    return [...range, "…", total];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    const count = 3 + siblingCount * 2;
    const range = Array.from({ length: count }, (_, i) => total - count + 1 + i);
    return [1, "…", ...range];
  }
  const range = Array.from({ length: rightSibling - leftSibling + 1 }, (_, i) => leftSibling + i);
  return [1, "…", ...range, "…", total];
}

function pageItem(page, current, live) {
  const isActive = page === current;
  const cls = isActive ? "page-item page-item--active" : "page-item";
  return `<button class="${cls}"${isActive ? ' aria-current="page"' : ""}>${page}</button>`;
}
function arrowItem(direction, disabled, live) {
  const icon = direction === "prev" ? iconChevronLeft : iconChevronRight;
  const codeIcon = direction === "prev" ? `<svg class="page-item__icon"><!-- icon: chevron_left --></svg>` : `<svg class="page-item__icon"><!-- icon: chevron_right --></svg>`;
  const cls = disabled ? "page-item page-item--disabled" : "page-item";
  const attrs = disabled ? " disabled" : "";
  return `<button class="${cls}" aria-label="${direction === "prev" ? "Previous" : "Next"} page"${attrs}>${live ? icon : codeIcon}</button>`;
}
function paginationBar(current, total, live) {
  const items = paginationRange(current, total)
    .map((p) => (p === "…" ? `<span class="page-ellipsis">…</span>` : pageItem(p, current, live)))
    .join("");
  return `<nav class="pagination">${arrowItem("prev", current === 1, live)}${items}${arrowItem("next", current === total, live)}</nav>`;
}
function rowsPerPage(live) {
  const chev = live ? iconChevronDown : `<svg class="select__chevron"><!-- icon: expand_more --></svg>`;
  return `<div class="rows-per-page"><span class="rows-per-page__label">Rows per page</span><div class="select"><span class="select__value">10</span>${chev}</div></div>`;
}
function fullBar(current, total, live) {
  return `<div class="pagination-bar">${rowsPerPage(live)}${paginationBar(current, total, live)}</div>`;
}

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

const rangeStories = [
  { title: "Near the start", current: 3, total: 12, note: "current=3, total=12 → 1 2 3 4 5 … 12. First 5 pages fit within the sibling window, so only the trailing range collapses." },
  { title: "In the middle", current: 7, total: 12, note: "current=7, total=12 → 1 … 6 7 8 … 12. Both sides collapse, but page 1 and page 12 stay real, clickable numbers — never hidden behind the ellipsis." },
  { title: "Near the end", current: 11, total: 12, note: "current=11, total=12 → 1 … 8 9 10 11 12. Mirrors the start case." },
  { title: "Short enough — no ellipsis", current: 2, total: 5, note: "total=5 fits entirely within the visible window (5 numbers), so nothing collapses at all." },
].map((s) => storyCard(s.title, paginationBar(s.current, s.total, true), paginationBar(s.current, s.total, false), s.note));

const itemStates = [
  { key: "default", label: "default", live: () => `<button class="page-item">4</button>`, code: () => `<button class="page-item">4</button>` },
  { key: "hover", label: "hover", live: () => `<button class="page-item page-item--hover">4</button>`, code: () => `<button class="page-item page-item--hover">4</button>` },
  { key: "active", label: "active (current page)", live: () => `<button class="page-item page-item--active" aria-current="page">4</button>`, code: () => `<button class="page-item page-item--active" aria-current="page">4</button>` },
  { key: "disabled", label: "disabled (arrow at a boundary)", live: () => arrowItem("prev", true, true), code: () => arrowItem("prev", true, false) },
];
const stateStories = itemStates
  .map((s) =>
    storyCard(s.label, s.live(), s.code(), s.key === "active" ? "fill.active — matches the button primary's own fill, not a new color." : s.key === "hover" ? "fill.neutralHover — reused from the secondary button's own hover fill." : "")
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Pagination</title>
<link rel="stylesheet" href="../assets/fonts/rubik/rubik.css" />
<style>
  :root {
    --bg-page: #f7f7f5; --bg-card: #ffffff; --bg-card-hover: #fbfbfa;
    --border: #e4e3df; --border-strong: #d2d1cb;
    --text-primary: #0e0e10; --text-secondary: #63625c; --text-muted: #918f87;
    --accent: #0468c4; --accent-bg: #eff6ff;
    --code-bg: #1e1e22; --code-text: #e4e3df;
    --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --sans: -apple-system, "Segoe UI", system-ui, sans-serif;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) {
      --bg-page: #17171a; --bg-card: #1e1e22; --bg-card-hover: #232327;
      --border: #313035; --border-strong: #403f45;
      --text-primary: #f2f1ee; --text-secondary: #a7a5a0; --text-muted: #706e68;
      --accent: #5aa4ec; --accent-bg: #16283b;
      --code-bg: #0d0d0f; --code-text: #d7d6d2;
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --bg-page: #17171a; --bg-card: #1e1e22; --bg-card-hover: #232327;
    --border: #313035; --border-strong: #403f45;
    --text-primary: #f2f1ee; --text-secondary: #a7a5a0; --text-muted: #706e68;
    --accent: #5aa4ec; --accent-bg: #16283b;
    --code-bg: #0d0d0f; --code-text: #d7d6d2;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg-page); color: var(--text-primary); font-family: var(--sans); }
  .shell { display: flex; min-height: 100vh; }
  nav.side { width: 220px; flex-shrink: 0; border-right: 0.5px solid var(--border); padding: 1.5rem 1rem; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .brand { font-size: 14px; font-weight: 600; margin: 0 0 2px 8px; }
  .brand-sub { font-size: 11.5px; color: var(--text-muted); margin: 0 0 1.5rem 8px; }
  .navlink { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 8px; border-radius: 7px; font-size: 13px; text-decoration: none; color: var(--text-primary); margin-bottom: 1px; }
  .navlink:hover { background: var(--bg-card-hover); }
  .navlink.active { background: var(--accent-bg); color: var(--accent); font-weight: 600; }
  .nav-category { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 16px 8px 6px; }
  main { flex: 1; padding: 4rem 4rem 6rem; max-width: 1120px; }

  h1 { font-size: 36px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.02em; }
  .sub { font-size: 14px; color: var(--text-secondary); margin: 0 0 2.5rem; }
  h2.big-section { font-size: 24px; font-weight: 700; margin: 5.5rem 0 1.5rem; letter-spacing: -0.01em; padding-top: 2.5rem; border-top: 1px solid var(--border); }
  h2.big-section:first-of-type { margin-top: 3rem; padding-top: 0; border-top: none; }
  .section-desc { font-size: 13.5px; color: var(--text-secondary); margin: -0.5rem 0 1.5rem; max-width: 68ch; line-height: 1.6; }

  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 14px 18px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1rem; line-height: 1.6; }
  .legend .row { display: flex; gap: 14px; padding: 6px 0; border-bottom: 0.5px solid var(--border); }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 150px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  code.tok { font-family: var(--mono); font-size: 12px; color: var(--accent); }

  pre.code { background: var(--code-bg); color: var(--code-text); border-radius: 10px; padding: 16px 18px; margin: 0; overflow-x: auto; font-family: var(--mono); font-size: 12px; line-height: 1.7; }
  pre.code code { font-family: inherit; }

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 64px; display: flex; align-items: center; justify-content: center; padding: 12px 0; flex-wrap: wrap; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .full-bar-demo { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .full-bar-demo .story-preview { justify-content: stretch; padding: 16px 4px; border-bottom: 0.5px solid var(--border); }
  .full-bar-demo .pagination-bar { flex-wrap: wrap; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("pagination")}
  </nav>
  <main>
    <h1>Pagination</h1>
    <p class="sub">tokens/components/pagination.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>First/last always visible</b><span>Replaces the old double-arrow jump-to-first/jump-to-last buttons — page 1 and the last page are always real, clickable numbers, never collapsed behind the ellipsis, so clicking them does the same job the extra arrows used to.</span></div>
      <div class="row"><b>Active page</b><span>fill.primary bg + text.onFill label — same fill as the primary button, not a new color.</span></div>
      <div class="row"><b>Hover</b><span>fill.neutralHover — reused from the secondary button's own hover fill for the same subtle-gray feedback.</span></div>
      <div class="row"><b>Size</b><span>One size only, 32px items — a compact utility control for tables/lists, not something that needs sm/base/lg the way button/input/select do.</span></div>
      <div class="row"><b>Rows per page</b><span>Not a new dropdown style — this literally renders component.select's sm size, so it stays pixel-identical to the real Select component as that one evolves.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc"><code class="tok">.page-item</code> (shared by numbers and arrows) + <code class="tok">.page-ellipsis</code> (non-interactive) + the reused <code class="tok">.select</code> rules for rows-per-page.</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Full bar</h2>
    <p class="section-desc">Rows-per-page and the page-range nav almost always appear together — a table/list footer, not two isolated controls. <code class="tok">.pagination-bar</code> spreads them with <code class="tok">justify-content: space-between</code> across the full width; the ${barGap} gap only matters if the container is narrower than the two groups combined.</p>
    <div class="full-bar-demo">
      <div class="story-preview">${fullBar(3, 12, true)}</div>
      <pre class="code"><code>${esc(fullBar(3, 12, false))}</code></pre>
    </div>

    <h2 class="big-section">Page ranges</h2>
    <p class="section-desc">The range-collapsing logic is a real algorithm (current ± 1 sibling, first/last pinned, the rest collapsed into one ellipsis per side), not four hand-typed examples — these are just its output at different current-page positions.</p>
    <div class="story-grid">
      ${rangeStories.join("\n")}
    </div>

    <h2 class="big-section">Item states</h2>
    <div class="story-grid">
      ${stateStories}
    </div>

    <h2 class="big-section">Rows per page</h2>
    <p class="section-desc">Composed from component.select's sm size — see <a href="select.html">select.html</a> for the full component.</p>
    <div class="story-grid">
      ${storyCard("Rows per page", rowsPerPage(true), rowsPerPage(false))}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/pagination.html"), html);
console.log("wrote docs/pagination.html");
