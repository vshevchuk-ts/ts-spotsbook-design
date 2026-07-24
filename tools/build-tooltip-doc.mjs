// Regenerates docs/tooltip.html from tokens/components/tooltip.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json
// (including the new shadow.tokens.json primitive — first component to use it).
// Pure CSS: :hover/:focus-within on a wrapper + position:absolute, no JS and no
// native popover API — unlike Popover, a tooltip is never dismissed by an
// outside click, it just tracks the trigger's own hover/focus state directly.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-tooltip-doc.mjs
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
const elevationPrim = load("tokens/primitives/elevation.tokens.json").elevation;
const typo = load("tokens/primitives/typography.tokens.json");
const textStyle = load("tokens/primitives/text-styles.tokens.json")["text-style"];
const semantic = load("tokens/semantic/color.tokens.json");
const tooltip = load("tokens/components/tooltip.tokens.json").component.tooltip;
const button = load("tokens/components/button.tokens.json").component.button;

const registry = {
  color: colorPrim,
  spacing: dim,  radius: radiusPrim,
  elevation: elevationPrim,
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

// The demo triggers are real Button-component buttons (secondary / base), so this
// page reuses the button component's own tokens — never retyping a color role by
// hand — for both the shown-off trigger and the tooltip bubble itself.
const colorPaths = ["outline.strong", "text.onFill", "fill.neutral", "text.default", "fill.neutralHover", "fill.neutralPressed"];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const radius = px(resolve(tooltip.radius.$value));
const paddingX = px(resolve(tooltip.paddingX.$value));
const paddingY = px(resolve(tooltip.paddingY.$value));
const gap = px(resolve(tooltip.gap.$value));
const arrowSize = resolve(tooltip.arrowSize.$value);
const arrowNeg = `-${arrowSize.value / 2}${arrowSize.unit}`;
const showDelay = tooltip.showDelay.$value; // literal {value,unit} — no dim.* step exists for durations, same "literal, not a token" precedent as Separator's 1px thickness
const labelType = resolveToken(tooltip.label);
const shadow = resolveToken(tooltip.shadow);
const shadowCss = `${px(shadow.offsetX)} ${px(shadow.offsetY)} ${px(shadow.blur)} ${px(shadow.spread)} ${shadow.color}`;

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.tooltip-wrapper { position: relative; display: inline-block; }
.tooltip { position: absolute; z-index: 1; box-sizing: border-box; padding: ${paddingY} ${paddingX}; border-radius: ${radius}; background: ${cv("outline.strong")}; color: ${cv("text.onFill")}; box-shadow: ${shadowCss}; white-space: nowrap; font-family: ${cv("family.sans")}; ${typoCss(labelType)}
  opacity: 0; pointer-events: none; transition: opacity 0.1s ease; }
.tooltip-wrapper:hover .tooltip, .tooltip-wrapper:focus-within .tooltip { opacity: 1; transition-delay: ${showDelay.value}${showDelay.unit}; }
.tooltip::after { content: ""; position: absolute; width: ${px(arrowSize)}; height: ${px(arrowSize)}; background: ${cv("outline.strong")}; transform: rotate(45deg); }

.tooltip--top { bottom: calc(100% + ${gap}); left: 50%; transform: translateX(-50%); }
.tooltip--top::after { bottom: ${arrowNeg}; left: 50%; margin-left: ${arrowNeg}; }
.tooltip--bottom { top: calc(100% + ${gap}); left: 50%; transform: translateX(-50%); }
.tooltip--bottom::after { top: ${arrowNeg}; left: 50%; margin-left: ${arrowNeg}; }
.tooltip--left { right: calc(100% + ${gap}); top: 50%; transform: translateY(-50%); }
.tooltip--left::after { right: ${arrowNeg}; top: 50%; margin-top: ${arrowNeg}; }
.tooltip--right { left: calc(100% + ${gap}); top: 50%; transform: translateY(-50%); }
.tooltip--right::after { left: ${arrowNeg}; top: 50%; margin-top: ${arrowNeg}; }`;

// ---- the demo trigger IS the Button component (secondary / base), resolved from
// button.tokens.json so the trigger on this page matches the real Button page ----
const bSize = button.secondary.size.base;
const bLabel = resolveToken(get(bSize.label.$value));
const buttonCss = `.btn { display: inline-flex; align-items: center; justify-content: center; border: none; cursor: pointer; white-space: nowrap; font-family: ${cv("family.sans")}; }
  .btn--base { height: ${px(resolve(bSize.height.$value))}; padding: 0 ${px(resolve(bSize.paddingX.$value))}; gap: ${px(resolve(bSize.gap.$value))}; border-radius: ${px(resolve(button.secondary.radius.$value))}; font-weight: ${bLabel.fontWeight}; font-size: ${px(bLabel.fontSize)}; line-height: ${bLabel.lineHeight}; }
  .btn--secondary { background: ${cv("fill.neutral")}; color: ${cv("text.default")}; }
  .btn--secondary:hover { background: ${cv("fill.neutralHover")}; }
  .btn--secondary:active { background: ${cv("fill.neutralPressed")}; }`;

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

function demo(placement, forceShow) {
  const style = forceShow ? "" : "";
  return `<span class="tooltip-wrapper${forceShow ? " demo-force-show" : ""}">
      <button class="btn btn--secondary btn--base">Hover me</button>
      <span class="tooltip tooltip--${placement}">Tooltip label</span>
    </span>`;
}
function demoCode(placement) {
  return `<span class="tooltip-wrapper">
  <button class="btn btn--secondary btn--base">Hover me</button>
  <span class="tooltip tooltip--${placement}">Tooltip label</span>
</span>`;
}

const placements = ["top", "bottom", "left", "right"];
function placementStories() {
  return placements
    .map((p) => storyCard(p, demo(p, true), demoCode(p)))
    .join("\n");
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Tooltip</title>
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

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; overflow: visible; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 90px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  ${buttonCss}
  .demo-force-show .tooltip { opacity: 1 !important; transition-delay: 0s !important; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("tooltip")}
  </nav>
  <main>
    <h1>Tooltip</h1>
    <p class="sub">tokens/components/tooltip.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Pure CSS</b><span>:hover/:focus-within on a wrapper + position:absolute — no JS, no native popover API. Unlike <a href="popover.html">Popover</a>, a tooltip only ever tracks its trigger's own hover/focus, never needs outside-click dismissal.</span></div>
      <div class="row"><b>Surface + shadow</b><span>surface-6 (outline.strong) bubble + a soft shadow — a raised floating surface that reads as lifted above whatever it's over, regardless of the surface underneath.</span></div>
      <div class="row"><b>Arrow</b><span>A small rotated square (::after, same bg as the bubble) pointing at the trigger — makes the trigger-tooltip relationship unambiguous at a glance.</span></div>
      <div class="row"><b>Show delay, no hide delay</b><span>400ms delay before appearing (so passing the mouse over a trigger doesn't flash a tooltip), disappears immediately on hover/focus-out — standard practice.</span></div>
      <div class="row"><b>Placement</b><span>top/bottom/left/right, plain CSS positioning (no collision detection — a real app would want a positioning library for that; out of scope for a static token demo).</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Placement</h2>
    <p class="section-desc">All four forced visible (via a docs-only class) so every placement is visible at once — try hovering any of the triggers (real <a href="button.html">Button</a> components, secondary / base) to see the actual :hover/:focus-within behavior, including the show delay.</p>
    <div class="story-grid">
      ${placementStories()}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/tooltip.html"), html);
console.log("wrote docs/tooltip.html");
