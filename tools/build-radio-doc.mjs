// Regenerates docs/radio.html from tokens/components/radio.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Real native <input type="radio"> stays in the DOM (visually hidden via
// clip-rect, not display:none) so grouping/keyboard/forms/screen-readers work
// for free — only the circle next to it is repainted via CSS, driven by
// :checked/:disabled/:focus-visible on the real input. Unlike Checkbox, the
// checked state never fills the whole circle — only the outline recolors plus
// a small inner dot (plain CSS circle, not an icon) appears.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-radio-doc.mjs
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
const radio = load("tokens/components/radio.tokens.json").component.radio;

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
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;

const colorPaths = [
  "surface.card", "surface.disabled",
  "outline.default", "outline.active",
  "fill.active", "fill.activeHover", "fill.disabled",
  "text.default", "text.disabled", "text.secondary",
  "outline.strong", "surface.raised",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const circle = px(resolve(radio.size.circle.$value));
const dot = px(resolve(radio.size.dot.$value));
const borderWidth = px(resolve(radio.size.borderWidth.$value));
const gap = px(resolve(radio.size.gap.$value));
const circleRadius = px(resolve(radio.radius.$value));
const labelType = resolveToken(radio.label);
const ringWidth = px(resolve(radio.state.focused.ringWidth.$value));
const ringOffset = px(resolve(radio.state.focused.ringOffset.$value));

const group = radio.group;
const gapVertical = px(resolve(group.gapVertical.$value));
const gapHorizontal = px(resolve(group.gapHorizontal.$value));
const groupLabelGap = px(resolve(group.labelGap.$value));
const groupLabelType = resolveToken(group.label);
const groupHelperType = resolveToken(group.helper);

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.radio { display: inline-flex; align-items: center; gap: ${gap}; font-family: ${cv("family.sans")}; cursor: pointer; }
.radio__input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.radio__circle { box-sizing: border-box; width: ${circle}; height: ${circle}; border-radius: ${circleRadius}; border: ${borderWidth} solid ${cv("outline.strong")}; background: ${cv("surface.raised")}; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.radio__dot { width: ${dot}; height: ${dot}; border-radius: ${circleRadius}; background: transparent; }
.radio__label { color: ${cv("text.default")}; ${typoCss(labelType)} }

.radio:hover .radio__circle { border-color: ${cv("fill.active")}; }
.radio__input:focus-visible ~ .radio__circle { outline: ${ringWidth} solid ${cv("outline.active")}; outline-offset: ${ringOffset}; }
.radio__input:checked ~ .radio__circle { border-color: ${cv("fill.active")}; }
.radio__input:checked ~ .radio__circle .radio__dot { background: ${cv("fill.active")}; }
.radio:hover .radio__input:checked:not(:disabled) ~ .radio__circle { border-color: ${cv("fill.activeHover")}; }
.radio:hover .radio__input:checked:not(:disabled) ~ .radio__circle .radio__dot { background: ${cv("fill.activeHover")}; }
.radio__input:disabled ~ .radio__circle { background: ${cv("surface.disabled")}; border-color: ${cv("outline.default")}; cursor: not-allowed; }
.radio__input:disabled ~ .radio__label { color: ${cv("text.disabled")}; }
.radio__input:disabled:checked ~ .radio__circle .radio__dot { background: ${cv("fill.disabled")}; }
.radio:has(.radio__input:disabled) { cursor: not-allowed; }

.radio-group { display: flex; flex-direction: column; gap: ${groupLabelGap}; }
.radio-group--vertical .radio-group__items { display: flex; flex-direction: column; gap: ${gapVertical}; }
.radio-group--horizontal .radio-group__items { display: flex; flex-direction: row; flex-wrap: wrap; gap: ${gapHorizontal}; }
.radio-group__label { color: ${cv("text.default")}; margin: 0; ${typoCss(groupLabelType)} }
.radio-group__helper { color: ${cv("text.secondary")}; margin: 0; ${typoCss(groupHelperType)} }`;

function markup(id, name, { checked = false, disabled = false, hover = false, focused = false } = {}) {
  const attrs = [checked ? " checked" : "", disabled ? " disabled" : ""].join("");
  let circleStyle = "";
  let dotStyle = "";
  if (focused) {
    circleStyle = ` style="outline:${ringWidth} solid ${cv("outline.active")}; outline-offset:${ringOffset}"`;
  } else if (hover && checked) {
    circleStyle = ` style="border-color:${cv("fill.activeHover")}"`;
    dotStyle = ` style="background:${cv("fill.activeHover")}"`;
  } else if (hover) {
    circleStyle = ` style="border-color:${cv("fill.active")}"`;
  }
  return `<label class="radio">
    <input type="radio" class="radio__input" id="${id}" name="${name}"${attrs} />
    <span class="radio__circle"${circleStyle}><span class="radio__dot"${dotStyle}></span></span>
    <span class="radio__label">Label</span>
  </label>`;
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

const stateDefs = [
  { key: "default", label: "default", opts: {}, note: "Unchecked, on surface.default — not filled." },
  { key: "hover", label: "hover", opts: { hover: true }, note: "fill.active (blue.500) — border.strong (gray) read as too weak a cue in practice. Real CSS uses :hover on the label; forced here via inline style so it screenshots without a real cursor." },
  { key: "focused", label: "focused", opts: { focused: true }, note: "Additive ring (border.focus). Real CSS is :focus-visible on the input; forced here via inline style." },
  { key: "checked", label: "checked", opts: { checked: true }, note: "Outline and inner dot both resolve to fill.primary — the circle itself never fills, unlike Checkbox's box." },
  { key: "checked-hover", label: "checked + hover", opts: { checked: true, hover: true }, note: "fill.activeHover (blue.600) on both outline and dot — same darken-on-hover Button primary already uses for its own filled background." },
  { key: "disabled", label: "disabled", opts: { disabled: true }, note: "surface.disabled, unlike default which uses surface.default." },
  { key: "disabled-checked", label: "disabled + checked", opts: { disabled: true, checked: true }, note: "Border stays border.default (never fill.primary) while disabled — brand blue never shows on an inert control; dot is fill.disabled." },
];
function stateStories() {
  return stateDefs.map((s, i) => storyCard(s.label, markup(`r-state-${i}`, `state-demo-${i}`, s.opts), markup(`r-state-${i}`, `state-demo-${i}`, s.opts), s.note)).join("\n");
}

function groupExample(layout) {
  const items = ["Email", "SMS", "Push notifications"];
  const name = `plan-${layout}`;
  const itemsHtml = items
    .map(
      (label, i) => `      <label class="radio">
        <input type="radio" class="radio__input" id="r-${layout}-${i}" name="${name}"${i === 0 ? " checked" : ""} />
        <span class="radio__circle"><span class="radio__dot"></span></span>
        <span class="radio__label">${label}</span>
      </label>`
    )
    .join("\n");
  return `<div class="radio-group radio-group--${layout}">
      <p class="radio-group__label">Notify me by</p>
      <div class="radio-group__items">
${itemsHtml}
      </div>
      <p class="radio-group__helper">Pick one channel.</p>
    </div>`;
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Radio</title>
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
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("radio")}
  </nav>
  <main>
    <h1>Radio</h1>
    <p class="sub">tokens/components/radio.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Native input</b><span>A real <code class="tok">&lt;input type="radio"&gt;</code> stays in the DOM, visually hidden (clip-rect, not display:none) — grouping via matching <code class="tok">name</code>, keyboard, forms, screen readers all work for free.</span></div>
      <div class="row"><b>Single size</b><span>20px circle, 8px dot — no sm/base/lg grid, same rationale as <a href="checkbox.html">Checkbox</a>.</span></div>
      <div class="row"><b>Never fully fills</b><span>Unlike Checkbox, checked only recolors the outline and shows a small inner dot — both fill.primary, the circle background stays surface.default. Plain CSS circle, not an icon; every reference checked (Radix/MUI/Ant/Material) draws it this way.</span></div>
      <div class="row"><b>States</b><span>default / hover / focused / checked / checked+hover / disabled / disabled+checked. No error state — not asked for.</span></div>
      <div class="row"><b>Groups</b><span>RadioGroup composes plain Radio items sharing one <code class="tok">name</code> under an optional heading + helper text, vertical or horizontal — no group-level error state.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">States</h2>
    <p class="section-desc">Single size (20px). Hover/focused are forced via inline style for a static screenshot — the real rule is :hover / :focus-visible on the native input, shown in the CSS above.</p>
    <div class="story-grid">
      ${stateStories()}
    </div>

    <h2 class="big-section">Groups</h2>
    <p class="section-desc">RadioGroup — vertical (stacked) and horizontal (wrapping row) layouts, each with an optional group label and helper text. No error/validation state at the group level.</p>
    <div class="story-grid">
      <div class="story">
        <h3>vertical</h3>
        <div class="story-preview" style="justify-content:flex-start">${groupExample("vertical")}</div>
      </div>
      <div class="story">
        <h3>horizontal</h3>
        <div class="story-preview" style="justify-content:flex-start">${groupExample("horizontal")}</div>
      </div>
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/radio.html"), html);
console.log("wrote docs/radio.html");
