// Regenerates docs/checkbox.html from tokens/components/checkbox.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Real native <input type="checkbox"> stays in the DOM (visually hidden via
// clip-rect, not display:none) so keyboard/forms/screen-readers work for free —
// only the box next to it is repainted via CSS, driven by :checked/:disabled/
// :focus-visible on the real input. indeterminate has no HTML attribute (it's
// a JS-only DOM property), so a tiny inline script sets it on load for any
// input marked [data-indeterminate] in this static doc.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-checkbox-doc.mjs
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
const checkbox = load("tokens/components/checkbox.tokens.json").component.checkbox;

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
  "surface.default", "surface.disabled",
  "border.default", "border.focus",
  "fill.primary", "fill.primaryHover", "fill.disabled",
  "icon.onFill", "icon.disabled",
  "text.default", "text.disabled", "text.secondary",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const box = px(resolve(checkbox.size.box.$value));
const iconSize = px(resolve(checkbox.size.iconSize.$value));
const borderWidth = px(resolve(checkbox.size.borderWidth.$value));
const gap = px(resolve(checkbox.size.gap.$value));
const boxRadius = px(resolve(checkbox.radius.$value));
const labelType = resolveToken(checkbox.label);
const ringWidth = px(resolve(checkbox.state.focused.ringWidth.$value));
const ringOffset = px(resolve(checkbox.state.focused.ringOffset.$value));

const group = checkbox.group;
const gapVertical = px(resolve(group.gapVertical.$value));
const gapHorizontal = px(resolve(group.gapHorizontal.$value));
const groupLabelGap = px(resolve(group.labelGap.$value));
const groupLabelType = resolveToken(group.label);
const groupHelperType = resolveToken(group.helper);

const iconCheck = fs.readFileSync(path.join(root, "assets/icons/material-filled/check.svg"), "utf8").replace("<svg ", '<svg class="checkbox__icon checkbox__icon--check" ');
const iconRemove = fs.readFileSync(path.join(root, "assets/icons/material-filled/remove.svg"), "utf8").replace("<svg ", '<svg class="checkbox__icon checkbox__icon--remove" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.checkbox { display: inline-flex; align-items: center; gap: ${gap}; font-family: ${cv("family.sans")}; cursor: pointer; }
.checkbox__input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.checkbox__box { box-sizing: border-box; width: ${box}; height: ${box}; border-radius: ${boxRadius}; border: ${borderWidth} solid ${cv("border.default")}; background: ${cv("surface.default")}; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.checkbox__icon { width: ${iconSize}; height: ${iconSize}; display: none; }
.checkbox__label { color: ${cv("text.default")}; ${typoCss(labelType)} }

.checkbox:hover .checkbox__box { border-color: ${cv("fill.primary")}; }
.checkbox__input:focus-visible ~ .checkbox__box { outline: ${ringWidth} solid ${cv("border.focus")}; outline-offset: ${ringOffset}; }
.checkbox__input:checked ~ .checkbox__box, .checkbox__input:indeterminate ~ .checkbox__box {
  background: ${cv("fill.primary")}; border-color: ${cv("fill.primary")};
}
.checkbox:hover .checkbox__input:checked:not(:disabled) ~ .checkbox__box, .checkbox:hover .checkbox__input:indeterminate:not(:disabled) ~ .checkbox__box {
  background: ${cv("fill.primaryHover")}; border-color: ${cv("fill.primaryHover")};
}
.checkbox__input:checked ~ .checkbox__box .checkbox__icon--check { display: block; color: ${cv("icon.onFill")}; }
.checkbox__input:indeterminate ~ .checkbox__box .checkbox__icon--remove { display: block; color: ${cv("icon.onFill")}; }
.checkbox__input:disabled ~ .checkbox__box { background: ${cv("surface.disabled")}; border-color: ${cv("border.default")}; cursor: not-allowed; }
.checkbox__input:disabled ~ .checkbox__label { color: ${cv("text.disabled")}; }
.checkbox__input:disabled:checked ~ .checkbox__box, .checkbox__input:disabled:indeterminate ~ .checkbox__box {
  background: ${cv("fill.disabled")}; border-color: ${cv("fill.disabled")};
}
.checkbox__input:disabled:checked ~ .checkbox__box .checkbox__icon--check, .checkbox__input:disabled:indeterminate ~ .checkbox__box .checkbox__icon--remove { color: ${cv("icon.disabled")}; }
.checkbox:has(.checkbox__input:disabled) { cursor: not-allowed; }

.checkbox-group { display: flex; flex-direction: column; gap: ${groupLabelGap}; }
.checkbox-group--vertical .checkbox-group__items { display: flex; flex-direction: column; gap: ${gapVertical}; }
.checkbox-group--horizontal .checkbox-group__items { display: flex; flex-direction: row; flex-wrap: wrap; gap: ${gapHorizontal}; }
.checkbox-group__label { color: ${cv("text.default")}; margin: 0; ${typoCss(groupLabelType)} }
.checkbox-group__helper { color: ${cv("text.secondary")}; margin: 0; ${typoCss(groupHelperType)} }`;

function ic(svg, name, live) {
  return live ? svg : `<svg class="checkbox__icon checkbox__icon--${name}"><!-- icon: ${name} --></svg>`;
}

// Both glyphs are always present in the markup — which one shows is decided
// purely by CSS off the real input's :checked/:indeterminate state (display:
// none by default). Earlier this only inserted whichever glyph matched the
// state passed at build time, so clicking a live checkbox that started
// unchecked toggled the box to fill.primary with no glyph inside it at all —
// a plain blue square, no tick. Always rendering both fixes that for real
// user interaction, not just the static story-card snapshots.
function glyphs(live) {
  return `${ic(iconCheck, "check", live)}${ic(iconRemove, "remove", live)}`;
}

function markup(id, { checked = false, indeterminate = false, disabled = false, hover = false, focused = false, live = true } = {}) {
  const attrs = [
    checked ? " checked" : "",
    disabled ? " disabled" : "",
    indeterminate ? ' data-indeterminate="true"' : "",
  ].join("");
  const extraStyle = focused
    ? ` style="outline:${ringWidth} solid ${cv("border.focus")}; outline-offset:${ringOffset}"`
    : hover && (checked || indeterminate)
    ? ` style="background:${cv("fill.primaryHover")}; border-color:${cv("fill.primaryHover")}"`
    : hover
    ? ` style="border-color:${cv("fill.primary")}"`
    : "";
  return `<label class="checkbox">
    <input type="checkbox" class="checkbox__input" id="${id}"${attrs} />
    <span class="checkbox__box"${extraStyle}>${glyphs(live)}</span>
    <span class="checkbox__label">Label</span>
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
  { key: "hover", label: "hover", opts: { hover: true }, note: "fill.primary (blue.500) border — border.strong (gray) read as too weak a cue in practice. Real CSS uses :hover on the label; forced here via inline style so it screenshots without a real cursor." },
  { key: "focused", label: "focused", opts: { focused: true }, note: "Additive ring (border.focus), composes on top of checked/unchecked. Real CSS is :focus-visible on the input; forced here via inline style." },
  { key: "checked", label: "checked", opts: { checked: true }, note: "bg + border both fill.primary, icon icon.onFill (check.svg)." },
  { key: "checked-hover", label: "checked + hover", opts: { checked: true, hover: true }, note: "fill.primaryHover (blue.600) — the same darken-on-hover Button primary already uses for its own filled background." },
  { key: "indeterminate", label: "indeterminate", opts: { indeterminate: true }, note: "Same fill as checked, remove.svg dash instead of a tick — typical for a parent 'select all' row. Set via a tiny inline script (indeterminate is a JS-only DOM property, no HTML attribute)." },
  { key: "disabled", label: "disabled", opts: { disabled: true }, note: "surface.disabled, unlike checked/unchecked default which uses surface.default — a real visible change here (see token's own note)." },
  { key: "disabled-checked", label: "disabled + checked", opts: { disabled: true, checked: true }, note: "fill.disabled/icon.disabled — same pair Button secondary and Input already use for their own disabled states." },
];
function stateStories(live) {
  return stateDefs.map((s, i) => storyCard(s.label, markup(`cb-state-${i}-${live ? "live" : "code"}`, { ...s.opts, live: true }), markup(`cb-state-${i}`, { ...s.opts, live: false }), s.note)).join("\n");
}

function groupExample(layout) {
  const items = ["Email", "SMS", "Push notifications"];
  const itemsHtml = items.map((label, i) => `      <label class="checkbox">
        <input type="checkbox" class="checkbox__input" id="cb-${layout}-${i}"${i === 0 ? " checked" : ""} />
        <span class="checkbox__box">${glyphs(true)}</span>
        <span class="checkbox__label">${label}</span>
      </label>`).join("\n");
  return `<div class="checkbox-group checkbox-group--${layout}">
      <p class="checkbox-group__label">Notify me by</p>
      <div class="checkbox-group__items">
${itemsHtml}
      </div>
      <p class="checkbox-group__helper">Choose at least one channel.</p>
    </div>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Checkbox</title>
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
    ${renderNav("checkbox")}
  </nav>
  <main>
    <h1>Checkbox</h1>
    <p class="sub">tokens/components/checkbox.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Native input</b><span>A real <code class="tok">&lt;input type="checkbox"&gt;</code> stays in the DOM, visually hidden (clip-rect, not display:none) — keyboard/forms/screen-readers work for free. Only the box is repainted, driven by :checked/:disabled/:focus-visible on the real input.</span></div>
      <div class="row"><b>Single size</b><span>20px box, 4px radius — no sm/base/lg grid, per explicit spec (this is a fixed-size control, not a field).</span></div>
      <div class="row"><b>Glyphs</b><span>check.svg (checked) / remove.svg (indeterminate) from the shared <a href="icons.html">Material icon set</a> — not bespoke assets.</span></div>
      <div class="row"><b>Unchecked ≠ disabled</b><span>Unchecked default sits on surface.default (not filled), so disabled's surface.disabled swap is an actual visible change — unlike Input, where those two already share the same gray.100 value.</span></div>
      <div class="row"><b>States</b><span>default / hover / focused / checked / checked+hover / indeterminate / disabled / disabled+checked. No error state — not asked for, and there's no field validation concept here.</span></div>
      <div class="row"><b>Groups</b><span>CheckboxGroup composes plain Checkbox items under an optional heading + helper text, vertical or horizontal — no group-level error state.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">States</h2>
    <p class="section-desc">Single size (20px). Hover/focused are forced via inline style for a static screenshot — the real rule is :hover / :focus-visible on the native input, shown in the CSS above.</p>
    <div class="story-grid">
      ${stateStories(true)}
    </div>

    <h2 class="big-section">Groups</h2>
    <p class="section-desc">CheckboxGroup — vertical (stacked) and horizontal (wrapping row) layouts, each with an optional group label and helper text. No error/validation state at the group level.</p>
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
<script>
  document.querySelectorAll('[data-indeterminate]').forEach((el) => { el.indeterminate = true; });
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/checkbox.html"), html);
console.log("wrote docs/checkbox.html");
