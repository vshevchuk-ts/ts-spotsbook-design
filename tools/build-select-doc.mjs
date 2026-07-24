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
  "surface.page", "surface.raised", "surface.disabled", "outline.strong", "outline.default", "outline.active", "outline.accent", "outline.negative",
  "text.secondary", "text.default", "text.disabled", "text.negative", "icon.default", "icon.disabled",
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
const errorTextSize = px(resolve("{size.sm}"));
const errorGap = px(resolve("{spacing.1}"));
// keyboard-focus ring (:focus-visible), accent, same additive treatment as Input/Button
const ringWidth = px(resolve(select.state.focused.ringWidth.$value));
const ringOffset = px(resolve(select.state.focused.ringOffset.$value));
const ringShadow = `box-shadow: 0 0 0 ${ringOffset} var(--bg-card) /* substitute your own surface color */, 0 0 0 calc(${ringOffset} + ${ringWidth}) ${cv("outline.accent")};`;

const iconChevron = fs.readFileSync(path.join(root, "assets/icons/ui/arrow-down.svg"), "utf8").replace("<svg ", '<svg class="select__chevron" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.select {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  background: ${cv("surface.page")};
  border: 1px solid ${cv("outline.strong")};
  border-radius: ${fieldRadius};
  font-family: ${cv("family.sans")};
  cursor: pointer;
}
.select__chevron { flex-shrink: 0; margin-left: auto; color: ${cv("icon.default")}; transition: transform 0.12s ease; }
.select__placeholder { color: ${cv("text.secondary")}; }
.select__value { color: ${cv("text.default")}; }
.select__stack { display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0; }
.select__label { color: ${cv("text.secondary")}; }

${sizes
  .map((s) => {
    const lines = [
      `.select--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; gap: ${px(s.gap)}; }`,
      `.select--${s.key} .select__chevron { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }`,
      `.select--${s.key} .select__placeholder, .select--${s.key} .select__value { ${typoCss(s.value)} }`,
    ];
    if (s.label) {
      lines.push(`.select--${s.key} .select__stack { gap: ${px(s.labelGap)}; }`);
      lines.push(`.select--${s.key} .select__label { ${typoCss(s.label)} }`);
    }
    return lines.join("\n");
  })
  .join("\n\n")}

/* hover fills to surface-4 — but NOT when active/focused/error/disabled */
.select:not(.select--disabled):not(.select--active):not(.select--focused):not(.select--error):hover, .select--hover { background: ${cv("surface.raised")}; border-color: ${cv("surface.raised")}; }
/* active = menu open: accent border + chevron flipped up (stays grey) */
.select--active { border-color: ${cv("outline.active")}; }
.select--active .select__chevron { transform: rotate(180deg); }
/* focused = keyboard focus on the closed trigger: active border + accent ring, chevron down */
.select--focused { border-color: ${cv("outline.active")}; ${ringShadow} }
.select--disabled { opacity: 0.5; background: ${cv("surface.disabled")}; border-color: ${cv("outline.default")}; cursor: not-allowed; }
.select--disabled .select__placeholder, .select--disabled .select__value, .select--disabled .select__label { color: ${cv("text.disabled")}; }
.select--disabled .select__chevron { color: ${cv("icon.disabled")}; }
.select--error { border-color: ${cv("outline.negative")}; }
.select-field { display: inline-flex; flex-direction: column; gap: ${errorGap}; }
.select__error { color: ${cv("text.negative")}; font-family: ${cv("family.sans")}; font-size: ${errorTextSize}; line-height: 1.4; }`;

const chevron = (live) => (live ? iconChevron : `<svg class="select__chevron"><!-- icon: chevron --></svg>`);
function restingMarkup(size, { placeholder = "Select", live = true } = {}) {
  return `<div class="select select--${size}"><span class="select__placeholder">${placeholder}</span>${chevron(live)}</div>`;
}
// single-line filled trigger (sm — no floating label, chosen value shown directly)
function filledMarkup(size, { value = "Last Added", live = true } = {}) {
  return `<div class="select select--${size}"><span class="select__value">${value}</span>${chevron(live)}</div>`;
}
function floatedMarkup(size, { label = "Sort by", value = "Last Added", cls = "", live = true } = {}) {
  return `<div class="select select--${size}${cls}"><div class="select__stack"><span class="select__label">${label}</span><span class="select__value">${value}</span></div>${chevron(live)}</div>`;
}
// error state wraps the trigger with a helper line below it
function errorMarkup(size, { label = "Sort by", value = "Last Added", message = "Please choose a value", live = true } = {}) {
  const field = floatedMarkup(size, { label, value, live }).replace('class="select select--' + size + '"', 'class="select select--' + size + ' select--error"');
  return `<div class="select-field">${field}<span class="select__error">${message}</span></div>`;
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
      // sm has no floating label — show it with a chosen value too (single-line),
      // so every size in the row reads as "has a selection".
      const mk = (live) => (s.key === "sm" ? filledMarkup(s.key, { live }) : floatedMarkup(s.key, { live }));
      return storyCard(`${s.key} — ${px(s.height)}`, mk(true), mk(false));
    })
    .join("\n");
}

const stateDefs = [
  { key: "default", label: "default", node: (live) => restingMarkup("base", { live }), note: "Empty, not focused — surface-0 fill + surface-6 hairline border, grey placeholder, grey chevron down." },
  { key: "hover", label: "hover", node: (live) => restingMarkup("base", { live }).replace('class="select select--base"', 'class="select select--base select--hover"'), note: "Fills to surface-4 and drops the visible border — the trigger lifts into a solid filled look." },
  { key: "active", label: "active", node: (live) => floatedMarkup("base", { cls: " select--active", live }), note: "Menu open: accent border, chevron flipped to point up (stays grey), chosen value shown. The floated label stays grey. No keyboard ring — that's the separate focused state." },
  { key: "focused", label: "focused", node: (live) => floatedMarkup("base", { cls: " select--focused", live }), note: "Keyboard focus on the closed trigger (:focus-visible) — active border + an additive accent ring, chevron still down. A pointer open gives active (chevron up) without the ring." },
  { key: "populated", label: "populated", node: (live) => floatedMarkup("base", { live }), note: "Has a chosen value, not focused — label stays floated, colours revert to default." },
  { key: "disabled", label: "disabled", node: (live) => restingMarkup("base", { live }).replace('class="select select--base"', 'class="select select--base select--disabled"'), note: "Swaps to surface.disabled and fades the text/chevron — same pattern as input/secondary-button." },
  { key: "error", label: "error", node: (live) => errorMarkup("base", { live }), note: "Red border on the trigger (outline.negative) plus a red helper line below it — e.g. a required field left unselected." },
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
      <div class="row"><b>Fill + border</b><span>Same as <a href="input.html">Input</a> — one fill: surface-0 (page) bg + surface-6 (outline.strong) hairline, lifting to a surface-4 filled look on hover.</span></div>
      <div class="row"><b>Sizes</b><span>Identical grid to Input: sm 32px (no floating label) / base 40px / lg 48px, 16px value text throughout, 10px floated label.</span></div>
      <div class="row"><b>Chevron</b><span>Always present, right-aligned, grey — flips to point up when active (the menu is open); the flip, not a colour change, is the open cue.</span></div>
      <div class="row"><b>Floating label</b><span>Same mechanics as Input — see <a href="input.html">input.html</a> for the full reasoning.</span></div>
      <div class="row"><b>States</b><span>Same set as Input: default / hover / active (open) / focused (keyboard ring) / populated / disabled / error.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">Same structure as Input's stylesheet, plus <code class="tok">.select__chevron</code> — always rendered, pushed to the trailing edge.</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">All three shown with a chosen value — sm as a single-line value (no floating label), base/lg with the value floated under the label.</p>
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

fs.writeFileSync(path.join(root, "docs/select.html"), html);
console.log("wrote docs/select.html");
