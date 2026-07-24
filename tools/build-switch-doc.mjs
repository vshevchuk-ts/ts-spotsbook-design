// Regenerates docs/switch.html from tokens/components/switch.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Real native <input type="checkbox"> stays in the DOM (visually hidden via
// clip-rect, not display:none) — keyboard/forms/screen-readers work for free,
// same pattern as Checkbox/Radio. Unlike those two, the track is always a
// solid fill (never transparent/outlined) at rest, and the thumb slides via
// a CSS transform driven by :checked on the real input.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-switch-doc.mjs
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
const switchTok = load("tokens/components/switch.tokens.json").component.switch;

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
  "outline.strong", "outline.accent",
  "fill.active", "fill.disabled", "lighten.2",
  "text.default", "text.disabled",
  "color.base.secondary", "color.white",
  "surface.card", "surface.raised", "surface.page", "fill.warning", "icon.default",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const trackWidth = resolve(switchTok.size.trackWidth.$value);
const trackHeight = resolve(switchTok.size.trackHeight.$value);
const thumb = resolve(switchTok.size.thumb.$value);
const inset = resolve(switchTok.size.thumbInset.$value);
const gap = px(resolve(switchTok.size.gap.$value));
const radius = px(resolve(switchTok.radius.$value));
const labelType = resolveToken(switchTok.label);
const ringWidth = px(resolve(switchTok.state.focused.ringWidth.$value));
const ringOffset = px(resolve(switchTok.state.focused.ringOffset.$value));

const travel = trackWidth.value - thumb.value - 2 * inset.value;

// ---- quick-bet variant (betslip 40px toggle with a bolt thumb) ----
const qb = switchTok.quickBet;
const qbTrackW = resolve(qb.trackWidth.$value);
const qbTrackH = px(resolve(qb.trackHeight.$value));
const qbThumb = resolve(qb.thumb.$value);
const qbInset = resolve(qb.thumbInset.$value);
const qbBorderW = px(resolve(qb.thumbBorderWidth.$value));
const qbIconSize = px(resolve(qb.iconSize.$value));
const qbTravel = qbTrackW.value - qbThumb.value - 2 * qbInset.value;
const iconBolt = fs.readFileSync(path.join(root, "assets/icons/ui/quick-bet.svg"), "utf8").replace("<svg ", '<svg class="switch__icon" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.switch:has(.switch__input:disabled) { opacity: 0.5; }
.switch { display: inline-flex; align-items: center; gap: ${gap}; font-family: ${cv("family.sans")}; cursor: pointer; }
.switch__input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.switch__track { box-sizing: border-box; position: relative; flex-shrink: 0; width: ${px(trackWidth)}; height: ${px(trackHeight)}; border-radius: ${radius}; background-color: ${cv("outline.strong")}; }
.switch__thumb { position: absolute; top: ${px(inset)}; left: ${px(inset)}; width: ${px(thumb)}; height: ${px(thumb)}; border-radius: ${radius}; background: ${cv("color.base.secondary")}; transform: translateX(0); }
.switch__label { color: ${cv("text.default")}; ${typoCss(labelType)} }

/* hover adds a 12% lighten LAYER over the current track fill (off: surface-6, on: active) — background-color stays, lighten.2 composites on top */
.switch:hover .switch__input:not(:disabled) ~ .switch__track { background-image: linear-gradient(${cv("lighten.2")}, ${cv("lighten.2")}); }
.switch__input:focus-visible ~ .switch__track { outline: ${ringWidth} solid ${cv("outline.accent")}; outline-offset: ${ringOffset}; }
.switch__input:checked ~ .switch__track { background-color: ${cv("fill.active")}; }
.switch__input:checked ~ .switch__track .switch__thumb { background: ${cv("color.white")}; transform: translateX(${travel}px); }
.switch__input:disabled ~ .switch__track { background-color: ${cv("fill.disabled")}; background-image: none; cursor: not-allowed; }
.switch__input:disabled ~ .switch__label { color: ${cv("text.disabled")}; }
.switch:has(.switch__input:disabled) { cursor: not-allowed; }

/* quick-bet variant — a 40px betslip toggle: a 32px thumb carrying the bolt icon */
.switch--quickbet .switch__track { width: ${px(qbTrackW)}; height: ${qbTrackH}; background-color: ${cv("surface.card")}; }
.switch--quickbet .switch__thumb { width: ${px(qbThumb)}; height: ${px(qbThumb)}; top: ${px(qbInset)}; left: ${px(qbInset)}; background: ${cv("surface.raised")}; border: ${qbBorderW} solid ${cv("outline.strong")}; display: inline-flex; align-items: center; justify-content: center; }
.switch--quickbet .switch__icon { width: ${qbIconSize}; height: ${qbIconSize}; color: ${cv("icon.default")}; flex-shrink: 0; }
/* track stays surface-2 when on (only the thumb lights up) — overrides the base switch's active-fill track */
.switch--quickbet .switch__input:checked ~ .switch__track { background-color: ${cv("surface.card")}; }
.switch--quickbet .switch__input:checked ~ .switch__track .switch__thumb { transform: translateX(${qbTravel}px); background: ${cv("fill.warning")}; border-color: ${cv("fill.warning")}; }
.switch--quickbet .switch__input:checked ~ .switch__track .switch__thumb .switch__icon { color: ${cv("surface.page")}; }`;

function markup(id, { checked = false, disabled = false, hover = false, focused = false } = {}) {
  const attrs = [checked ? " checked" : "", disabled ? " disabled" : ""].join("");
  let trackStyle = "";
  if (focused) trackStyle = ` style="outline:${ringWidth} solid ${cv("outline.accent")}; outline-offset:${ringOffset}"`;
  else if (hover) trackStyle = ` style="background-image:linear-gradient(${cv("lighten.2")}, ${cv("lighten.2")})"`;
  const thumbStyle = checked ? ` style="transform:translateX(${travel}px)"` : "";
  return `<label class="switch">
    <input type="checkbox" class="switch__input" id="${id}"${attrs} />
    <span class="switch__track"${trackStyle}><span class="switch__thumb"${thumbStyle}></span></span>
    <span class="switch__label">Label</span>
  </label>`;
}

function quickBetMarkup(id, { checked = false, live = true } = {}) {
  const icon = live ? iconBolt : `<svg class="switch__icon"><!-- icon: quick-bet --></svg>`;
  return `<label class="switch switch--quickbet">
    <input type="checkbox" class="switch__input" id="${id}"${checked ? " checked" : ""} />
    <span class="switch__track"><span class="switch__thumb">${icon}</span></span>
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
  { key: "default", label: "default", opts: {}, note: "Off, at rest — the track is a solid surface-6 (outline.strong) fill (reads on any surface), with a light-grey (base.secondary) thumb on the left." },
  { key: "hover", label: "hover", opts: { hover: true }, note: "Adds a 12% lighten layer over the surface-6 track (the sportsbook hover overlay, same as Search/Tabs) — not a colour swap." },
  { key: "focused", label: "focused", opts: { focused: true }, note: "Additive ring (border.focus). Real CSS is :focus-visible on the input; forced here via inline style." },
  { key: "checked", label: "checked", opts: { checked: true }, note: "Track fills fill.active (the brand active colour); the thumb turns white and slides right via transform." },
  { key: "checked-hover", label: "checked + hover", opts: { checked: true, hover: true }, note: "The same 12% lighten layer as the off hover, here over the active fill — hovers are a consistent lighten overlay across states." },
  { key: "disabled", label: "disabled", opts: { disabled: true }, note: "fill.disabled — same pair Button secondary/Input/Checkbox already use for their own disabled states." },
  { key: "disabled-checked", label: "disabled + checked", opts: { disabled: true, checked: true }, note: "Same fill.disabled regardless of checked — brand blue never shows on an inert control. Thumb still slides right (position follows :checked independently of :disabled)." },
];
function stateStories() {
  return stateDefs.map((s, i) => storyCard(s.label, markup(`sw-state-${i}`, s.opts), markup(`sw-state-${i}`, s.opts), s.note)).join("\n");
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Switch</title>
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
    ${renderNav("switch")}
  </nav>
  <main>
    <h1>Switch</h1>
    <p class="sub">tokens/components/switch.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Native input</b><span>A real <code class="tok">&lt;input type="checkbox"&gt;</code> stays in the DOM, visually hidden (clip-rect, not display:none) — keyboard/forms/screen-readers work for free, same approach as <a href="checkbox.html">Checkbox</a>/<a href="radio.html">Radio</a>.</span></div>
      <div class="row"><b>Single size</b><span>36×20px track, 16px thumb, 2px inset on every side — no sm/base/lg grid, same rationale as Checkbox/Radio.</span></div>
      <div class="row"><b>Always filled</b><span>Unlike Checkbox/Radio, the track is a solid fill even when off (surface-6) — every reference checked (Radix/MUI/Ant/iOS) draws it this way, since the track itself is the whole affordance, not just an outline.</span></div>
      <div class="row"><b>No indeterminate</b><span>Checkbox-specific tri-state concept — no switch equivalent.</span></div>
      <div class="row"><b>No shadow on the thumb</b><span>Flat white circle, no drop shadow — consistent with the rest of this system having no shadow/elevation token; contrast against the track color alone provides definition.</span></div>
      <div class="row"><b>States</b><span>default / hover / focused / checked / checked+hover / disabled / disabled+checked. No error state — not asked for.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">States</h2>
    <p class="section-desc">Single size. Hover/focused are forced via inline style for a static screenshot — the real rule is :hover / :focus-visible on the native input, shown in the CSS above.</p>
    <div class="story-grid">
      ${stateStories()}
    </div>

    <h2 class="big-section">Quick Bet (betslip)</h2>
    <p class="section-desc">A larger 40px switch variant for the betslip's Quick Bet toggle — a 32px thumb carrying the bolt icon. Off: surface-2 track, surface-4 thumb with a surface-6 ring, grey bolt. On: the thumb (and ring) fill warning-yellow and the bolt turns surface-0 (near-black).</p>
    <div class="story-grid">
      ${storyCard("off", quickBetMarkup("qb-off", { checked: false, live: true }), quickBetMarkup("qb-off", { checked: false, live: false }))}
      ${storyCard("on", quickBetMarkup("qb-on", { checked: true, live: true }), quickBetMarkup("qb-on", { checked: true, live: false }))}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/switch.html"), html);
console.log("wrote docs/switch.html");
