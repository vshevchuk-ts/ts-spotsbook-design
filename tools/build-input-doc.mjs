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
  "surface.raised", "surface.disabled", "outline.default", "outline.strong", "outline.active", "outline.negative",
  "text.secondary", "text.default", "text.disabled", "text.active", "icon.default", "icon.disabled",
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

// ---- icons ----
const iconSearch = fs.readFileSync(path.join(root, "assets/icons/material-filled/search.svg"), "utf8").replace("<svg ", '<svg class="input__icon" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

// ---- the actual stylesheet — printed as code AND used to render the live preview ----
const css = `${rootVars}

.input--disabled { opacity: 0.5; }
.input {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  background: ${cv("surface.raised")};
  border: 1px solid ${cv("outline.default")};
  border-radius: ${fieldRadius};
  font-family: ${cv("family.sans")};
  cursor: text;
}
.input__icon { flex-shrink: 0; color: ${cv("icon.default")}; }
.input__placeholder { color: ${cv("text.secondary")}; }
.input__value { color: ${cv("text.default")}; }
.input__stack { display: flex; flex-direction: column; justify-content: center; }
.input__label { color: ${cv("text.secondary")}; }

${sizes
  .map((s) => {
    const lines = [
      `.input--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; gap: ${px(s.gap)}; }`,
      `.input--${s.key} .input__icon { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }`,
      `.input--${s.key} .input__placeholder, .input--${s.key} .input__value { ${typoCss(s.value)} }`,
    ];
    if (s.label) {
      lines.push(`.input--${s.key} .input__stack { gap: ${px(s.labelGap)}; }`);
      lines.push(`.input--${s.key} .input__label { ${typoCss(s.label)} }`);
    }
    return lines.join("\n");
  })
  .join("\n\n")}

.input:not(.input--disabled):hover, .input--hover { border-color: ${cv("outline.strong")}; }
.input--focus { border-color: ${cv("outline.active")}; }
.input--focus .input__label { color: ${cv("text.active")}; }
.input--disabled { background: ${cv("surface.disabled")}; cursor: not-allowed; }
.input--disabled .input__placeholder, .input--disabled .input__value, .input--disabled .input__label { color: ${cv("text.disabled")}; }
.input--disabled .input__icon { color: ${cv("icon.disabled")}; }
.input--error { border-color: ${cv("outline.negative")}; }`;

// ---- markup builders ----
function restingMarkup(size, { icon = false, placeholder = "Email address", live = true } = {}) {
  const ic = icon ? (live ? iconSearch : `<svg class="input__icon"><!-- icon: search --></svg>`) : "";
  return `<div class="input input--${size}">${ic}<span class="input__placeholder">${placeholder}</span></div>`;
}
function floatedMarkup(size, { icon = false, label = "Email address", value = "", live = true } = {}) {
  const ic = icon ? (live ? iconSearch : `<svg class="input__icon"><!-- icon: search --></svg>`) : "";
  return `<div class="input input--${size}">${ic}<div class="input__stack"><span class="input__label">${label}</span><span class="input__value">${value}</span></div></div>`;
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
      const live = s.key === "sm" ? restingMarkup(s.key, { live: true }) : floatedMarkup(s.key, { value: "name@example.com", live: true });
      const code = s.key === "sm" ? restingMarkup(s.key, { live: false }) : floatedMarkup(s.key, { value: "name@example.com", live: false });
      return storyCard(`${s.key} — ${px(s.height)}`, live, code);
    })
    .join("\n");
}

function contentStories() {
  const items = [];
  for (const withIcon of [false, true]) {
    const title = withIcon ? "Icon left + value" : "Value only";
    const live = floatedMarkup("base", { icon: withIcon, value: "name@example.com", live: true });
    const code = floatedMarkup("base", { icon: withIcon, value: "name@example.com", live: false });
    items.push(storyCard(title, live, code));
  }
  return items.join("\n");
}

const stateDefs = [
  { key: "default", label: "default", node: (live) => restingMarkup("base", { live }), note: "Empty, not focused — placeholder centered at value size (16px), no floated label yet." },
  { key: "hover", label: "hover", node: (live) => restingMarkup("base", { live }).replace('class="input input--base"', 'class="input input--base input--hover"'), note: "outline.strong — same rule already documented on that token before this component existed." },
  { key: "focus", label: "focus", node: (live) => floatedMarkup("base", { value: "", live }).replace('class="input input--base"', 'class="input input--base input--focus"'), note: "Placeholder already floated into the label the instant the field is focused — value area starts empty, ready to type." },
  { key: "populated", label: "populated", node: (live) => floatedMarkup("base", { value: "name@example.com", live }), note: "Has a value, not focused — label stays floated (layout doesn't revert) but every color returns to default." },
  { key: "disabled", label: "disabled", node: (live) => restingMarkup("base", { live }).replace('class="input input--base"', 'class="input input--base input--disabled"'), note: "surface.disabled equals surface.sunken (both gray.100) — same pattern as the secondary button's disabled state. Only text/icon fade." },
  { key: "error", label: "error", node: (live) => floatedMarkup("base", { value: "not-an-email", live }).replace('class="input input--base"', 'class="input input--base input--error"'), note: "Scoped to the field's own border only — no separate helper-text element built here." },
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
      <div class="row"><b>Fill + border</b><span>surface.sunken bg + border.default hairline — both already documented for exactly this ("Inputs...recessed" / "input borders at rest") from the semantic-color session, before this component existed. Not a pure outline, not a pure fill — both together.</span></div>
      <div class="row"><b>Sizes</b><span>sm 32px (no floating label) / base 40px (default) / lg 48px. Value/placeholder text is 16px at every size — Safari on iOS auto-zooms the page on focus if it's smaller.</span></div>
      <div class="row"><b>Floating label</b><span>base/lg only. Resting (empty, unfocused): one centered 16px placeholder line. Focused or populated: splits into a 12px label above the 16px value, vertically centered as a group via flexbox rather than hand-computed padding.</span></div>
      <div class="row"><b>States</b><span>default → border.default · hover → border.strong · focus → border.focus + label turns text.primary (blue) · populated → colors revert to default, only the layout (label floated) persists · disabled → surface.disabled + *.disabled text/icon · error → border.danger.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">One <code class="tok">:root</code> block of color custom properties, then a base <code class="tok">.input</code> class + <code class="tok">--sm/--base/--lg</code> size modifiers, then state modifiers as plain classes (also wired to real <code class="tok">:hover</code> for bonus interactivity where it doesn't conflict with a specific demonstrated state).</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">sm shows the resting single-line layout (its only layout). base/lg shown populated, to demonstrate the floated label at each size.</p>
    <div class="story-grid">
      ${sizeStories()}
    </div>

    <h2 class="big-section">Content variants</h2>
    <p class="section-desc">Base size, populated. Icon sizing/gap mirrors the button component's own convention (16/20/24px, flat 8px gap).</p>
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

fs.writeFileSync(path.join(root, "docs/input.html"), html);
console.log("wrote docs/input.html");
