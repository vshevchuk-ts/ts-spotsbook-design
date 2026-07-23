// Regenerates docs/search.html from tokens/components/search.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// No floating label at any size (unlike input/select) — placeholder just
// vanishes on focus. Leading search icon always present; trailing clear (×)
// icon shown only once there's a value.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-search-doc.mjs
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
const search = load("tokens/components/search.tokens.json").component.search;

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

const colorPaths = [
  "surface.raised", "surface.disabled", "outline.default", "outline.strong", "outline.active",
  "text.secondary", "text.default", "text.disabled", "icon.default", "icon.disabled",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const fieldRadius = px(resolve(search.radius.$value));
const valueType = resolveToken(search.value);
const sizes = ["sm", "base", "lg"].map((key) => {
  const s = search.size[key];
  return {
    key,
    height: resolve(s.height.$value),
    paddingX: resolve(s.paddingX.$value),
    gap: resolve(s.gap.$value),
    iconSize: resolve(s.iconSize.$value),
  };
});

const iconSearch = fs.readFileSync(path.join(root, "assets/icons/material-filled/search.svg"), "utf8").replace("<svg ", '<svg class="search__icon" ');
const iconClose = fs.readFileSync(path.join(root, "assets/icons/material-filled/close.svg"), "utf8").replace("<svg ", '<svg class="search__clear" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.search--disabled { opacity: 0.5; }
.search {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  background: ${cv("surface.raised")};
  border: 1px solid ${cv("outline.default")};
  border-radius: ${fieldRadius};
  font-family: ${cv("family.sans")};
  cursor: text;
}
.search__icon { flex-shrink: 0; color: ${cv("icon.default")}; }
.search__clear { flex-shrink: 0; margin-left: auto; color: ${cv("icon.default")}; cursor: pointer; }
.search__placeholder { color: ${cv("text.secondary")}; flex: 1; }
.search__value { color: ${cv("text.default")}; flex: 1; ${typoCss(valueType)} }
.search__placeholder { ${typoCss(valueType)} }

${sizes
  .map(
    (s) => `.search--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; gap: ${px(s.gap)}; }
.search--${s.key} .search__icon, .search--${s.key} .search__clear { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }`
  )
  .join("\n\n")}

.search:not(.search--disabled):hover, .search--hover { border-color: ${cv("outline.strong")}; }
.search--focus { border-color: ${cv("outline.active")}; }
.search--disabled { background: ${cv("surface.disabled")}; cursor: not-allowed; }
.search--disabled .search__placeholder, .search--disabled .search__value { color: ${cv("text.disabled")}; }
.search--disabled .search__icon, .search--disabled .search__clear { color: ${cv("icon.disabled")}; }`;

function markup(size, { state = "default", value = "", live = true } = {}) {
  const ic = live ? iconSearch : `<svg class="search__icon"><!-- icon: search --></svg>`;
  const classes = ["search", `search--${size}`];
  if (state !== "default" && state !== "populated") classes.push(`search--${state}`);
  const showClear = value.length > 0;
  const textEl = value ? `<span class="search__value">${value}</span>` : state === "focus" ? "" : `<span class="search__placeholder">Search</span>`;
  const clear = showClear ? (live ? iconClose : `<svg class="search__clear"><!-- icon: close --></svg>`) : "";
  return `<div class="${classes.join(" ")}">${ic}${textEl}${clear}</div>`;
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

function sizeStories() {
  return sizes.map((s) => storyCard(`${s.key} — ${px(s.height)}`, markup(s.key, { value: "sneakers", live: true }), markup(s.key, { value: "sneakers", live: false }))).join("\n");
}

const stateDefs = [
  { key: "default", label: "default", value: "", note: "Empty, not focused — placeholder visible." },
  { key: "hover", label: "hover", value: "", note: "outline.strong." },
  { key: "focus", label: "focus", value: "", note: "Placeholder vanishes the instant the field is focused, at every size — no floated label to replace it with, the value area just starts empty." },
  { key: "populated", label: "populated (with clear)", value: "sneakers", note: "Once there's a value, the clear (×) icon appears at the trailing edge — click to empty the field." },
  { key: "disabled", label: "disabled", value: "", note: "surface.disabled equals surface.sunken — same recurring pattern as input/select/secondary-button." },
];
function stateStories() {
  return stateDefs.map((s) => storyCard(s.label, markup("base", { state: s.key, value: s.value, live: true }), markup("base", { state: s.key, value: s.value, live: false }), s.note)).join("\n");
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Search</title>
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

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 64px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-preview .search { width: 100%; max-width: 260px; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("search")}
  </nav>
  <main>
    <h1>Search</h1>
    <p class="sub">tokens/components/search.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Fill + border</b><span>Same as <a href="input.html">Input</a>/<a href="select.html">Select</a> — surface.sunken bg + border.default hairline.</span></div>
      <div class="row"><b>Sizes</b><span>sm 32px / base 40px / lg 48px — same grid, but no floating label at any size. Value/placeholder is 16px throughout (Safari-zoom-safe).</span></div>
      <div class="row"><b>No floating label</b><span>Unlike Input/Select, the placeholder just vanishes the instant the field is focused, at every size — there's no 12px label to move it into.</span></div>
      <div class="row"><b>Clear button</b><span>The trailing × icon only renders once there's a value — click to empty the field. Not present in the default/hover/focus/disabled examples below.</span></div>
      <div class="row"><b>States</b><span>default / hover / focus / populated / disabled — no error state; a search box has no validation concept the way a form input/select does.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">One shared value/placeholder text style (16px at every size, no per-size label) plus size modifiers and state classes.</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">All 3 shown populated (with the clear icon), since that's the state most likely to reveal any size-related rendering issues (icon + text + clear icon all present).</p>
    <div class="story-grid">
      ${sizeStories()}
    </div>

    <h2 class="big-section">States</h2>
    <p class="section-desc">Base size.</p>
    <div class="story-grid">
      ${stateStories()}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/search.html"), html);
console.log("wrote docs/search.html");
