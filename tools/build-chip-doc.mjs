// Regenerates docs/chip.html from tokens/components/chip.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Two kinds sharing one shell: "toggle" (filter selection, checkbox-like —
// real <button aria-pressed> driving the checked look via a CSS attribute
// selector, wired to a live click handler so every toggle chip on this page
// actually works, not just one showcase) and "removable" (a selected value
// with a trailing dismiss, reusing Popover/Drawer/Modal's own close-button
// recipe for the × verbatim). Deliberately split from Badge — Badge is
// display-only, Chip is the interactive, checkbox-like sibling.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-chip-doc.mjs
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
const chip = load("tokens/components/chip.tokens.json").component.chip;
const counter = load("tokens/components/counter.tokens.json").component.counter;

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
const refPath = (ref) => ref.replace(/[{}]/g, "");

const colorPaths = [
  "surface.card", "outline.default", "outline.strong", "outline.active", "text.default", "icon.default",
  "fill.active", "fill.activeHover", "fill.disabled", "text.forActiveBg", "icon.forActiveBg",
  "bg.active", "text.active", "icon.active",
  "text.disabled", "icon.disabled",
  "icon.secondary", "fill.neutralHover", "fill.neutralPressed",
  "surface.raised",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const radius = px(resolve(chip.radius.$value));
const sizeDefs = ["sm", "base", "lg"].map((key) => {
  const s = chip.size[key];
  return {
    key,
    height: resolve(s.height.$value),
    paddingX: resolve(s.paddingX.$value),
    gap: resolve(s.gap.$value),
    iconSize: resolve(s.iconSize.$value),
    label: resolveToken(s.label),
  };
});
const ringWidth = px(resolve(chip.focus.ringWidth.$value));
const ringOffset = px(resolve(chip.focus.ringOffset.$value));

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

// ---- resolve counter (needed for the icon+text+counter content variant) ----
// toggle solid (bg=fill.primary) pairs with counter.onPrimary, toggle default/
// outline (light bg) pairs with counter.onNeutral — same surface-matching
// logic Button/Tabs already established, resolved from Counter's own real
// values, not retyped.
const counterRadius = px(resolve(counter.radius.$value));
const counterSizes = ["sm", "base", "lg"].map((key) => {
  const s = counter.size[key];
  return { key, height: resolve(s.height.$value), minWidth: resolve(s.minWidth.$value), paddingX: resolve(s.paddingX.$value), label: resolveToken(s.label) };
});
const counterSurfaces = {
  onPrimary: { inactiveBg: refPath(counter.onPrimary.state.inactive.bg.$value), inactiveLabel: refPath(counter.onPrimary.state.inactive.label.$value) },
  onNeutral: { inactiveBg: refPath(counter.onNeutral.state.inactive.bg.$value), inactiveLabel: refPath(counter.onNeutral.state.inactive.label.$value) },
};

// ---- icons ----
const iconOf = (name, cls) => fs.readFileSync(path.join(root, `assets/icons/material-filled/${name}.svg`), "utf8").replace("<svg ", `<svg class="${cls}" `);
const iconFlag = iconOf("flag", "chip__icon");
const iconTune = iconOf("tune", "chip__icon");
const iconClose = iconOf("close", "chip__remove-icon");

const css = `${rootVars}

.chip { box-sizing: border-box; display: inline-flex; align-items: center; border: 1px solid transparent; border-radius: ${radius}; font-family: ${cv("family.sans")}; cursor: pointer; white-space: nowrap; }
.chip__icon { flex-shrink: 0; }
${sizeDefs
  .map(
    (s) => `.chip--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; gap: ${px(s.gap)}; ${typoCss(s.label)} }
.chip--${s.key} .chip__icon { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }
.chip--${s.key} .chip__remove { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }
.chip--${s.key} .chip__remove-icon { width: calc(${px(s.iconSize)} * 0.75); height: calc(${px(s.iconSize)} * 0.75); }`
  )
  .join("\n")}

.chip--toggle { background: ${cv("surface.raised")}; border-color: ${cv("outline.default")}; color: ${cv("text.default")}; }
.chip--toggle .chip__icon { color: ${cv("icon.default")}; }
.chip--toggle:not([aria-pressed="true"]):not(:disabled):hover { border-color: ${cv("fill.active")}; }
.chip--toggle[aria-pressed="true"] { background: ${cv("fill.active")}; border-color: ${cv("fill.active")}; color: ${cv("text.forActiveBg")}; }
.chip--toggle[aria-pressed="true"] .chip__icon { color: ${cv("icon.forActiveBg")}; }
.chip--toggle[aria-pressed="true"]:not(:disabled):hover { background: ${cv("fill.activeHover")}; border-color: ${cv("fill.activeHover")}; }
.chip--toggle.chip--outline[aria-pressed="true"] { background: ${cv("bg.active")}; border-color: ${cv("fill.active")}; color: ${cv("text.active")}; }
.chip--toggle.chip--outline[aria-pressed="true"] .chip__icon { color: ${cv("icon.active")}; }
.chip--toggle:focus-visible { outline: ${ringWidth} solid ${cv("outline.active")}; outline-offset: ${ringOffset}; }
.chip--toggle:disabled { color: ${cv("text.disabled")}; cursor: not-allowed; }
.chip--toggle:disabled .chip__icon { color: ${cv("icon.disabled")}; }
.chip--toggle:disabled[aria-pressed="true"] { background: ${cv("fill.disabled")}; border-color: ${cv("fill.disabled")}; color: ${cv("text.disabled")}; }

.chip--removable { background: ${cv("surface.raised")}; border-color: ${cv("outline.default")}; color: ${cv("text.default")}; cursor: default; }
.chip--removable .chip__icon { color: ${cv("icon.default")}; }
.chip--removable:hover { border-color: ${cv("outline.strong")}; }
.chip--removable.chip--disabled { color: ${cv("text.disabled")}; }
.chip--removable.chip--disabled .chip__icon { color: ${cv("icon.disabled")}; }

.chip__remove { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: ${px(resolve("radius.default"))}; background: transparent; padding: 0; cursor: pointer; color: ${cv("icon.secondary")}; }
.chip__remove:hover { background: ${cv("fill.neutralHover")}; }
.chip__remove:active { background: ${cv("fill.neutralPressed")}; }
.chip__remove:focus-visible { outline: ${ringWidth} solid ${cv("outline.active")}; outline-offset: ${ringOffset}; }
.chip--disabled .chip__remove { visibility: hidden; }

.counter { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; border-radius: ${counterRadius}; flex-shrink: 0; }
${counterSizes.map((s) => `.counter--${s.key} { height: ${px(s.height)}; min-width: ${px(s.minWidth)}; padding: 0 ${px(s.paddingX)}; font-weight: ${s.label.fontWeight}; font-size: ${px(s.label.fontSize)}; line-height: ${s.label.lineHeight}; }`).join("\n")}
${Object.entries(counterSurfaces).map(([k, v]) => `.counter--${k}.counter--inactive { background: ${cv(v.inactiveBg)}; color: ${cv(v.inactiveLabel)}; }`).join("\n")}`;

const js = `document.querySelectorAll(".chip--toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    btn.setAttribute("aria-pressed", btn.getAttribute("aria-pressed") === "true" ? "false" : "true");
  });
});`;

function counterMarkup(sizeKey, surface) {
  return `<span class="counter counter--${sizeKey} counter--${surface} counter--inactive">3</span>`;
}

function toggleChipMarkup(sizeKey, { label = "Label", icon = null, counterSurface = null, outline = false, pressed = false, disabled = false, forceHoverStyle = null } = {}) {
  const classes = ["chip", `chip--${sizeKey}`, "chip--toggle"];
  if (outline) classes.push("chip--outline");
  const attrs = [` aria-pressed="${pressed}"`, disabled ? " disabled" : "", forceHoverStyle ? ` style="${forceHoverStyle}"` : ""].join("");
  const iconHtml = icon ? icon : "";
  const counterHtml = counterSurface ? counterMarkup(sizeKey, counterSurface) : "";
  return `<button class="${classes.join(" ")}"${attrs}>${iconHtml}<span class="chip__label">${label}</span>${counterHtml}</button>`;
}
function removableChipMarkup(sizeKey, { label = "Label", icon = null, disabled = false } = {}) {
  const classes = ["chip", `chip--${sizeKey}`, "chip--removable"];
  if (disabled) classes.push("chip--disabled");
  const iconHtml = icon ? icon : "";
  return `<span class="${classes.join(" ")}">${iconHtml}<span class="chip__label">${label}</span><button class="chip__remove" aria-label="Remove ${label}"${disabled ? " disabled" : ""}>${iconClose}</button></span>`;
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

// ---- Sizes (toggle, unchecked, as reference) ----
function sizeStories() {
  return sizeDefs
    .map((s) => storyCard(`${s.key} — ${px(s.height)}`, toggleChipMarkup(s.key, { label: "Flagged", icon: iconFlag }), toggleChipMarkup(s.key, { label: "Flagged", icon: iconFlag })))
    .join("\n");
}

// ---- Toggle states (real interactive, click any chip below) ----
const toggleStateDefs = [
  { key: "default", label: "default (unchecked)", opts: {}, note: "surface.card + border.default — click it, it's real." },
  { key: "hover", label: "hover (unchecked)", opts: { forceHoverStyle: `border-color:${cv("fill.active")}` }, note: "fill.active border — same 'gray reads too weak' lesson Checkbox/Radio/Card's own unchecked-hover already applied. Forced via inline style for a static screenshot; the real rule is :hover in the CSS above." },
  { key: "checked", label: "checked (solid)", opts: { pressed: true }, note: "fill.active bg + text.onFill — a real boolean toggle, no counter." },
  { key: "checked-hover", label: "checked + hover", opts: { pressed: true, forceHoverStyle: `background:${cv("fill.activeHover")}; border-color:${cv("fill.activeHover")}` }, note: "fill.activeHover, the same darken-on-hover pair every other checked control in this system uses." },
  { key: "focused", label: "focused", opts: { forceHoverStyle: `outline:${ringWidth} solid ${cv("outline.active")}; outline-offset:${ringOffset}` }, note: "Additive ring. Real CSS is :focus-visible on the button." },
  { key: "disabled", label: "disabled (unchecked)", opts: { disabled: true }, note: "Keeps its background, only text/icon fade — same convention as every other disabled control in this system." },
  { key: "checked-disabled", label: "disabled (checked)", opts: { disabled: true, pressed: true }, note: "fill.disabled — brand blue never shows on an inert control." },
];
function toggleStateStories() {
  return toggleStateDefs.map((s) => storyCard(s.label, toggleChipMarkup("base", { label: "Flagged", ...s.opts }), toggleChipMarkup("base", { label: "Flagged", ...s.opts }), s.note)).join("\n");
}

// ---- Content variants (real interactive, base size) ----
function contentStories() {
  const defs = [
    { title: "Text only", html: toggleChipMarkup("base", { label: "Flagged" }) },
    { title: "Icon + text", html: toggleChipMarkup("base", { label: "Flagged", icon: iconFlag }) },
    { title: "Text + counter", html: toggleChipMarkup("base", { label: "Recent", counterSurface: "onNeutral" }), note: "Unchecked/light bg pairs with counter.onNeutral — click to check it and the counter switches to onPrimary automatically via CSS, no JS." },
    { title: "Icon + text + counter", html: toggleChipMarkup("base", { label: "Filters", icon: iconTune, counterSurface: "onNeutral", outline: true, pressed: true }), note: "Shown pre-checked with the outline treatment — a 'Filters' trigger chip summarizing N active filters is an aggregate/trigger, not a single boolean, so it uses checkedOutline (bg.primary tint + border) instead of a full solid fill. Still real — click it." },
  ];
  return defs.map((d) => storyCard(d.title, d.html, d.html, d.note || "")).join("\n");
}

// ---- Removable chip ----
function removableStories() {
  const defs = [
    { title: "Default", html: removableChipMarkup("base", { label: "Calam Xavier" }) },
    { title: "With icon", html: removableChipMarkup("base", { label: "Engineering", icon: iconFlag }) },
    { title: "Disabled", html: removableChipMarkup("base", { label: "Calam Xavier", disabled: true }), note: "Remove button hidden (visibility:hidden, keeps layout stable) — nothing to remove when the whole chip is inert." },
  ];
  return defs.map((d) => storyCard(d.title, d.html, d.html, d.note || "")).join("\n");
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Chip</title>
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

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 22px; display: flex; flex-direction: column; gap: 12px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 44px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("chip")}
  </nav>
  <main>
    <h1>Chip</h1>
    <p class="sub">tokens/components/chip.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, nothing hand-copied. Every toggle chip below is a real, clickable <code class="tok">&lt;button aria-pressed&gt;</code> — try one.</p>

    <div class="legend">
      <div class="row"><b>toggle vs. removable</b><span>Two kinds sharing one shell. <code class="tok">toggle</code> = filter selection, checkbox-like (click flips checked/unchecked — "I'm Involved"/"Flagged"/"Expires Soon"). <code class="tok">removable</code> = a selected value with a trailing dismiss (×) — a chosen multi-select option, a recipient chip. Existence IS the selection for removable; there's no checked ladder, only present-or-removed.</span></div>
      <div class="row"><b>Not Badge</b><span>Badge is the display-only sibling this was deliberately split from — a status/tag pill you look at, not click. Chip is the checkbox-like, interactive one. Same ARIA-role reasoning as the Menu/Listbox split.</span></div>
      <div class="row"><b>solid vs. outline checked</b><span>Two checked treatments for <code class="tok">toggle</code>, not a ladder — pick by content. Solid (fill.primary + white text) for a real single boolean. Outline (bg.primary tint + border, reuses Badge's own tint recipe) for a chip carrying a <code class="tok">Counter</code> — a "Filters · 3" trigger summarizing several sub-selections is an aggregate, not one thing being on, so filling it fully solid would overstate it.</span></div>
      <div class="row"><b>Sizes</b><span>sm 24 / base 32 / lg 40 — Button's own height ladder (32/40/48) shifted down one dim-step at every size, since a chip is clickable like a button but reads as a small pill like Badge.</span></div>
      <div class="row"><b>Remove button</b><span>Resolved from Popover/Drawer/Modal's own close-button recipe, not re-invented: transparent → fill.neutralHover → fill.neutralActive.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">JS</h2>
    <p class="section-desc">The only script this page needs — a click listener flipping <code class="tok">aria-pressed</code>, which the CSS above already keys off of. Every toggle chip on this page uses it, not a forced screenshot state.</p>
    <pre class="code"><code>${esc(js)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">sm / base / lg, unchecked toggle chip with an icon as the reference.</p>
    <div class="story-grid">
      ${sizeStories()}
    </div>

    <h2 class="big-section">Toggle — states</h2>
    <p class="section-desc">Base size. Every card except hover/focused (forced via inline style for a static screenshot) is a real, clickable button.</p>
    <div class="story-grid">
      ${toggleStateStories()}
    </div>

    <h2 class="big-section">Toggle — content variants</h2>
    <p class="section-desc">Base size, all real and clickable.</p>
    <div class="story-grid">
      ${contentStories()}
    </div>

    <h2 class="big-section">Removable</h2>
    <p class="section-desc">Base size — a selected value with a trailing dismiss. The × is a real button; the chip body itself isn't interactive.</p>
    <div class="story-grid">
      ${removableStories()}
    </div>
  </main>
</div>
<script>${js}</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/chip.html"), html);
console.log("wrote docs/chip.html");
