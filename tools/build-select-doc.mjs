// Regenerates docs/select.html from tokens/components/select.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Same box model as component.input (see that token's own $description for the
// floating-label mechanics) plus a trailing chevron, always present. The open
// menu/listbox is out of scope — this documents only the closed trigger.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-select-doc.mjs
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

const colorPaths = [
  "surface.raised", "surface.page", "surface.disabled", "outline.default", "outline.strong", "outline.active", "outline.negative",
  "text.secondary", "text.default", "text.disabled", "text.active", "icon.default", "icon.disabled",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const fieldRadius = px(resolve(select.radius.$value));
const sizes = ["sm", "base", "lg"].map((key) => {
  const s = select.size[key];
  const base = {
    key,
    height: resolve(s.height.$value),
    paddingX: resolve(s.paddingX.$value),
    gap: resolve(s.gap.$value),
    iconSize: resolve(s.iconSize.$value),
    value: resolveToken(s.value),
  };
  if (key !== "sm") {
    base.label = resolveToken(s.label);
    base.labelGap = resolve(s.labelGap.$value);
  }
  return base;
});

const iconChevron = fs.readFileSync(path.join(root, "assets/icons/ui/arrow-down.svg"), "utf8").replace("<svg ", '<svg class="select__chevron" ');
const iconSearch = fs.readFileSync(path.join(root, "assets/icons/ui/search.svg"), "utf8").replace("<svg ", '<svg class="select__icon" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.select--disabled { opacity: 0.5; }
.select {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  background: ${cv("surface.raised")};
  border: 1px solid ${cv("outline.default")};
  border-radius: ${fieldRadius};
  font-family: ${cv("family.sans")};
  cursor: pointer;
}
.select__icon { flex-shrink: 0; color: ${cv("icon.default")}; }
.select__chevron { flex-shrink: 0; margin-left: auto; color: ${cv("icon.default")}; }
.select__placeholder { color: ${cv("text.secondary")}; }
.select__value { color: ${cv("text.default")}; }
.select__stack { display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0; }
.select__label { color: ${cv("text.secondary")}; }
.select--outlined { background: ${cv("surface.page")}; border-color: ${cv("outline.strong")}; }

${sizes
  .map((s) => {
    const lines = [
      `.select--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; gap: ${px(s.gap)}; }`,
      `.select--${s.key} .select__icon, .select--${s.key} .select__chevron { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }`,
      `.select--${s.key} .select__placeholder, .select--${s.key} .select__value { ${typoCss(s.value)} }`,
    ];
    if (s.label) {
      lines.push(`.select--${s.key} .select__stack { gap: ${px(s.labelGap)}; }`);
      lines.push(`.select--${s.key} .select__label { ${typoCss(s.label)} }`);
    }
    return lines.join("\n");
  })
  .join("\n\n")}

.select:not(.select--disabled):hover, .select--hover { border-color: ${cv("outline.strong")}; }
.select--focus { border-color: ${cv("outline.active")}; }
.select--focus .select__label { color: ${cv("text.active")}; }
.select--disabled { background: ${cv("surface.disabled")}; cursor: not-allowed; }
.select--disabled .select__placeholder, .select--disabled .select__value, .select--disabled .select__label { color: ${cv("text.disabled")}; }
.select--disabled .select__icon, .select--disabled .select__chevron { color: ${cv("icon.disabled")}; }
.select--error { border-color: ${cv("outline.negative")}; }`;

function restingMarkup(size, { icon = false, placeholder = "Country", live = true } = {}) {
  const ic = icon ? (live ? iconSearch : `<svg class="select__icon"><!-- icon: search --></svg>`) : "";
  const chev = live ? iconChevron : `<svg class="select__chevron"><!-- icon: expand_more --></svg>`;
  return `<div class="select select--${size}">${ic}<span class="select__placeholder">${placeholder}</span>${chev}</div>`;
}
function floatedMarkup(size, { icon = false, label = "Country", value = "", live = true } = {}) {
  const ic = icon ? (live ? iconSearch : `<svg class="select__icon"><!-- icon: search --></svg>`) : "";
  const chev = live ? iconChevron : `<svg class="select__chevron"><!-- icon: expand_more --></svg>`;
  return `<div class="select select--${size}">${ic}<div class="select__stack"><span class="select__label">${label}</span><span class="select__value">${value}</span></div>${chev}</div>`;
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
  return sizes
    .map((s) => {
      const live = s.key === "sm" ? restingMarkup(s.key, { live: true }) : floatedMarkup(s.key, { value: "Ukraine", live: true });
      const code = s.key === "sm" ? restingMarkup(s.key, { live: false }) : floatedMarkup(s.key, { value: "Ukraine", live: false });
      return storyCard(`${s.key} — ${px(s.height)}`, live, code);
    })
    .join("\n");
}
function contentStories() {
  const items = [];
  for (const withIcon of [false, true]) {
    const title = withIcon ? "Icon left + value" : "Value only";
    const live = floatedMarkup("base", { icon: withIcon, value: "Ukraine", live: true });
    const code = floatedMarkup("base", { icon: withIcon, value: "Ukraine", live: false });
    items.push(storyCard(title, live, code));
  }
  return items.join("\n");
}

const stateDefs = [
  { key: "default", label: "default", node: (live) => restingMarkup("base", { live }), note: "Empty, not focused." },
  { key: "hover", label: "hover", node: (live) => restingMarkup("base", { live }).replace('class="select select--base"', 'class="select select--base select--hover"'), note: "outline.strong." },
  { key: "focus", label: "focus", node: (live) => floatedMarkup("base", { value: "", live }).replace('class="select select--base"', 'class="select select--base select--focus"'), note: "Trigger is focused (e.g. via keyboard) — label floats the same as input.state.focus." },
  { key: "populated", label: "populated", node: (live) => floatedMarkup("base", { value: "Ukraine", live }), note: "Has a chosen value, not focused — label stays floated, colors revert to default." },
  { key: "disabled", label: "disabled", node: (live) => restingMarkup("base", { live }).replace('class="select select--base"', 'class="select select--base select--disabled"'), note: "surface.disabled equals surface.sunken — same pattern as input/secondary-button." },
  { key: "error", label: "error", node: (live) => floatedMarkup("base", { value: "—", live }).replace('class="select select--base"', 'class="select select--base select--error"'), note: "e.g. a required field left unselected." },
];
function stateStories() {
  return stateDefs.map((s) => storyCard(s.label, s.node(true), s.node(false), s.note)).join("\n");
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Select</title>
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
  .story-preview .select { width: 100%; max-width: 260px; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("select")}
  </nav>
  <main>
    <h1>Select</h1>
    <p class="sub">tokens/components/select.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex. Documents the closed trigger only — the open menu/listbox isn't built yet.</p>

    <div class="legend">
      <div class="row"><b>Fill + border</b><span>Same as <a href="input.html">Input</a> — surface.sunken bg + border.default hairline.</span></div>
      <div class="row"><b>Sizes</b><span>Identical grid to Input: sm 32px (no floating label) / base 40px / lg 48px, 16px value text throughout.</span></div>
      <div class="row"><b>Chevron</b><span>Always present, right-aligned (margin-left: auto pushes it to the far edge regardless of value length) — unlike the optional icon-left, this isn't a content variant, every select has one.</span></div>
      <div class="row"><b>Floating label</b><span>Same mechanics as Input — see <a href="input.html">input.html</a> for the full reasoning.</span></div>
      <div class="row"><b>States</b><span>Same set as Input: default / hover / focus / populated / disabled / error.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">Same structure as Input's stylesheet, plus <code class="tok">.select__chevron</code> — always rendered, pushed to the trailing edge.</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">sm shows the resting layout. base/lg shown populated.</p>
    <div class="story-grid">
      ${sizeStories()}
    </div>

    <h2 class="big-section">Content variants</h2>
    <p class="section-desc">Base size, populated.</p>
    <div class="story-grid">
      ${contentStories()}
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

fs.writeFileSync(path.join(root, "docs/select.html"), html);
console.log("wrote docs/select.html");
