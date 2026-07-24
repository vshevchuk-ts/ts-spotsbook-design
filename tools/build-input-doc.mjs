// Regenerates docs/input.html from tokens/components/input.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// sm has no floating label (single-line placeholder/value, both 16px). base/lg
// float the placeholder into a 12px label above the value once focused or
// populated — implemented as flexbox-centered stacked lines with an explicit
// gap, not hand-computed padding (see the token's own $description for why).
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-input-doc.mjs
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
const input = load("tokens/components/input.tokens.json").component.input;

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
  "surface.page", "surface.raised", "surface.disabled", "outline.strong", "outline.default", "outline.active", "outline.negative",
  "text.secondary", "text.default", "text.disabled", "text.active", "text.negative",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const fieldRadius = px(resolve(input.radius.$value));
const sizes = ["sm", "base", "lg"].map((key) => {
  const s = input.size[key];
  const base = {
    key,
    height: resolve(s.height.$value),
    paddingX: resolve(s.paddingX.$value),
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
// keyboard-focus ring (:focus-visible), same additive treatment as Button.
// var(--bg-card) is the docs surface the field sits on — the ring's inner gap
// must match whatever surface the field is placed on, inherently contextual.
const ringWidth = px(resolve(input.state.focused.ringWidth.$value));
const ringOffset = px(resolve(input.state.focused.ringOffset.$value));
const ringShadow = `box-shadow: 0 0 0 ${ringOffset} var(--bg-card) /* substitute your own surface color */, 0 0 0 calc(${ringOffset} + ${ringWidth}) ${cv("outline.active")};`;

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

// ---- the actual stylesheet — printed as code AND used to render the live preview ----
const css = `${rootVars}

.input {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  background: ${cv("surface.page")};
  border: 1px solid ${cv("outline.strong")};
  border-radius: ${fieldRadius};
  font-family: ${cv("family.sans")};
  cursor: text;
}
.input__placeholder { color: ${cv("text.secondary")}; }
.input__value { color: ${cv("text.default")}; }
.input__stack { display: flex; flex-direction: column; justify-content: center; }
.input__label { color: ${cv("text.secondary")}; }

${sizes
  .map((s) => {
    const lines = [
      `.input--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; }`,
      `.input--${s.key} .input__placeholder, .input--${s.key} .input__value { ${typoCss(s.value)} }`,
    ];
    if (s.label) {
      lines.push(`.input--${s.key} .input__stack { gap: ${px(s.labelGap)}; }`);
      lines.push(`.input--${s.key} .input__label { ${typoCss(s.label)} }`);
    }
    return lines.join("\n");
  })
  .join("\n\n")}

/* hover fills to surface-4 — but NOT when the field is active/focused/error (those own their look) or disabled */
.input:not(.input--disabled):not(.input--active):not(.input--focused):not(.input--error):hover, .input--hover { background: ${cv("surface.raised")}; border-color: ${cv("surface.raised")}; }
/* active = pointer/editing focus: blue border + blue label + blinking caret */
.input--active { border-color: ${cv("outline.active")}; }
.input--active .input__label { color: ${cv("text.active")}; }
/* focused = keyboard focus (:focus-visible): the active look + an additive ring */
.input--focused { border-color: ${cv("outline.active")}; ${ringShadow} }
.input--focused .input__label { color: ${cv("text.active")}; }
.input__caret { display: inline-block; width: 1.5px; height: 1.1em; margin-left: 1px; vertical-align: -0.16em; background: ${cv("text.active")}; animation: input-caret 1.05s step-end infinite; }
@keyframes input-caret { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
.input--disabled { opacity: 0.5; background: ${cv("surface.disabled")}; border-color: ${cv("outline.default")}; cursor: not-allowed; }
.input--disabled .input__placeholder, .input--disabled .input__value, .input--disabled .input__label { color: ${cv("text.disabled")}; }
.input--error { border-color: ${cv("outline.negative")}; }
.input-field { display: inline-flex; flex-direction: column; gap: ${errorGap}; }
.input__error { color: ${cv("text.negative")}; font-family: ${cv("family.sans")}; font-size: ${errorTextSize}; line-height: 1.4; }`;

// ---- markup builders ----
function restingMarkup(size, { placeholder = "Enter", live = true } = {}) {
  return `<div class="input input--${size}"><span class="input__placeholder">${placeholder}</span></div>`;
}
function floatedMarkup(size, { label = "Sort by", value = "Last Added", caret = false, cls = "", live = true } = {}) {
  const car = caret ? `<span class="input__caret"></span>` : "";
  return `<div class="input input--${size}${cls}"><div class="input__stack"><span class="input__label">${label}</span><span class="input__value">${value}${car}</span></div></div>`;
}
// error state wraps the field with a helper line below it
function errorMarkup(size, { label = "Sort by", value = "Last Added", message = "Error text", live = true } = {}) {
  const field = floatedMarkup(size, { label, value, live }).replace('class="input input--' + size + '"', 'class="input input--' + size + ' input--error"');
  return `<div class="input-field">${field}<span class="input__error">${message}</span></div>`;
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
      const live = s.key === "sm" ? restingMarkup(s.key, { live: true }) : floatedMarkup(s.key, { live: true });
      const code = s.key === "sm" ? restingMarkup(s.key, { live: false }) : floatedMarkup(s.key, { live: false });
      return storyCard(`${s.key} — ${px(s.height)}`, live, code);
    })
    .join("\n");
}

const stateDefs = [
  { key: "default", label: "default", node: (live) => restingMarkup("base", { live }), note: "Empty, not focused — surface-0 fill + surface-6 hairline border, placeholder centered at value size (16px), no floated label yet." },
  { key: "hover", label: "hover", node: (live) => restingMarkup("base", { live }).replace('class="input input--base"', 'class="input input--base input--hover"'), note: "Fills to surface-4 and drops the visible border — the field lifts into a solid filled look on hover." },
  { key: "active", label: "active", node: (live) => floatedMarkup("base", { value: "Last Ad", caret: true, cls: " input--active", live }), note: "Being edited (pointer/click focus): fill stays surface-0, border + floated label turn brand-blue, and a blue caret blinks in the value as text is typed. No keyboard ring — that's the separate focused state." },
  { key: "focused", label: "focused", node: (live) => floatedMarkup("base", { value: "Last Ad", caret: true, cls: " input--focused", live }), note: "Keyboard focus (:focus-visible) — the active look plus an additive blue ring, the same a11y focus indicator used across Button/Checkbox/etc. A mouse click gives active without the ring." },
  { key: "populated", label: "populated", node: (live) => floatedMarkup("base", { live }), note: "Has a value, not focused — label stays floated (layout doesn't revert) but every color returns to default." },
  { key: "disabled", label: "disabled", node: (live) => restingMarkup("base", { live }).replace('class="input input--base"', 'class="input input--base input--disabled"'), note: "Swaps to surface.disabled and fades the text — same pattern as the secondary button's disabled state." },
  { key: "error", label: "error", node: (live) => errorMarkup("base", { live }), note: "Red border on the field (outline.negative) plus a red helper line below it (text.negative)." },
];
function stateStories() {
  return stateDefs.map((s) => storyCard(s.label, s.node(true), s.node(false), s.note)).join("\n");
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Input</title>
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
  .story-preview .input { width: 100%; max-width: 260px; }
  .story-preview .input-field { width: 100%; max-width: 260px; }
  .story-preview .input-field .input { max-width: none; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("input")}
  </nav>
  <main>
    <h1>Input</h1>
    <p class="sub">tokens/components/input.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Fill + border</b><span>One fill: surface-0 (page) background + a surface-6 (outline.strong) hairline border, so the field reads as recessed into the page. On hover it fills to surface-4 and the border blends away — lifting into a solid filled look.</span></div>
      <div class="row"><b>Sizes</b><span>sm 32px (no floating label) / base 40px (default) / lg 48px. Value/placeholder text is 16px at every size — Safari on iOS auto-zooms the page on focus if it's smaller.</span></div>
      <div class="row"><b>Floating label</b><span>base/lg only. Resting (empty, unfocused): one centered 16px placeholder line. Focused or populated: splits into a 10px label above the 16px value, vertically centered as a group via flexbox rather than hand-computed padding.</span></div>
      <div class="row"><b>States</b><span>default → surface-0 + surface-6 border · hover → fills to surface-4, borderless · active → blue border + blue label + blinking caret (being edited) · focused → active + a keyboard-focus ring (:focus-visible, matches Button/Checkbox) · populated → colors revert to default, only the layout (label floated) persists · disabled → surface.disabled + faded text · error → red border + red helper line below.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">One <code class="tok">:root</code> block of color custom properties, then a base <code class="tok">.input</code> class + <code class="tok">--sm/--base/--lg</code> size modifiers, then state modifiers as plain classes (also wired to real <code class="tok">:hover</code> for bonus interactivity where it doesn't conflict with a specific demonstrated state).</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">sm shows the resting single-line layout (its only layout). base/lg shown populated, to demonstrate the floated label at each size.</p>
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

fs.writeFileSync(path.join(root, "docs/input.html"), html);
console.log("wrote docs/input.html");
