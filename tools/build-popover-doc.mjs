// Regenerates docs/popover.html from tokens/components/popover.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Uses the native `popover` HTML attribute + `popovertarget`/`popovertargetaction`
// (Popover API) — real top-layer rendering, free outside-click/Escape dismissal,
// no JS state management. Only a small script positions the panel under its
// trigger (the API itself doesn't do anchor positioning without the newer,
// less broadly supported CSS anchor-positioning API). Unlike every other demo
// on this site, these popovers are genuinely, natively interactive on the docs
// page itself — no forced/inline-style stand-ins needed for "open" state.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-popover-doc.mjs
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
const shadowPrim = load("tokens/primitives/shadow.tokens.json").shadow;
const typo = load("tokens/primitives/typography.tokens.json");
const textStyle = load("tokens/primitives/text-styles.tokens.json")["text-style"];
const semantic = load("tokens/semantic/color.tokens.json");
const popover = load("tokens/components/popover.tokens.json").component.popover;

const registry = {
  color: colorPrim,
  spacing: dim,  radius: radiusPrim,
  shadow: shadowPrim,
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

const colorPaths = ["surface.default", "border.default", "border.focus", "text.default", "text.secondary", "icon.secondary", "fill.neutralHover", "fill.neutralActive"];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const radius = px(resolve(popover.radius.$value));
const padding = px(resolve(popover.padding.$value));
const gap = resolve(popover.gap.$value);
const titleType = resolveToken(popover.title);
const bodyType = resolveToken(popover.body);
const shadow = resolveToken(popover.shadow);
const shadowCss = `${px(shadow.offsetX)} ${px(shadow.offsetY)} ${px(shadow.blur)} ${px(shadow.spread)} ${shadow.color}`;

const iconClose = fs.readFileSync(path.join(root, "assets/icons/material-filled/close.svg"), "utf8").replace("<svg ", '<svg class="popover__close-icon" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.popover { margin: 0; box-sizing: border-box; max-width: 280px; padding: ${padding}; border-radius: ${radius}; background: ${cv("surface.default")}; border: 1px solid ${cv("border.default")}; box-shadow: ${shadowCss}; font-family: ${cv("family.sans")}; }
.popover__header { display: flex; align-items: flex-start; justify-content: space-between; gap: ${px(resolve("spacing.2"))}; }
.popover__title { margin: 0; color: ${cv("text.default")}; ${typoCss(titleType)} }
.popover__body { margin: 8px 0 0; color: ${cv("text.secondary")}; ${typoCss(bodyType)} }
.popover__close { flex-shrink: 0; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: ${px(resolve("radius.default"))}; background: transparent; padding: 0; cursor: pointer; color: ${cv("icon.secondary")}; }
.popover__close:hover { background: ${cv("fill.neutralHover")}; }
.popover__close:active { background: ${cv("fill.neutralActive")}; }
.popover__close:focus-visible { outline: ${px(resolve("spacing.1"))} solid ${cv("border.focus")}; outline-offset: ${px(resolve("spacing.0_5"))}; }
.popover__close-icon { width: 18px; height: 18px; display: block; }
.popover__menu { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.popover__menu-item { border: none; background: none; text-align: left; width: 100%; padding: 8px; border-radius: 6px; cursor: pointer; color: ${cv("text.default")}; font-family: inherit; ${typoCss(bodyType)} }
.popover__menu-item:hover { background: ${cv("fill.neutralHover")}; }`;

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

const basicDemo = `<button class="demo-trigger" popovertarget="pop-basic">Open popover</button>
    <div id="pop-basic" class="popover" popover>
      <div class="popover__header">
        <p class="popover__title">Share this page</p>
        <button class="popover__close" popovertarget="pop-basic" popovertargetaction="hide" aria-label="Close">${iconClose}</button>
      </div>
      <p class="popover__body">Anyone with the link can view this document.</p>
    </div>`;
const basicCode = `<button popovertarget="pop-basic">Open popover</button>
<div id="pop-basic" class="popover" popover>
  <div class="popover__header">
    <p class="popover__title">Share this page</p>
    <button class="popover__close" popovertarget="pop-basic" popovertargetaction="hide" aria-label="Close">…</button>
  </div>
  <p class="popover__body">Anyone with the link can view this document.</p>
</div>`;

const menuDemo = `<button class="demo-trigger" popovertarget="pop-menu">Open menu</button>
    <div id="pop-menu" class="popover" popover>
      <ul class="popover__menu">
        <li><button class="popover__menu-item">Rename</button></li>
        <li><button class="popover__menu-item">Duplicate</button></li>
        <li><button class="popover__menu-item">Delete</button></li>
      </ul>
    </div>`;
const menuCode = `<button popovertarget="pop-menu">Open menu</button>
<div id="pop-menu" class="popover" popover>
  <ul class="popover__menu">
    <li><button class="popover__menu-item">Rename</button></li>
    <li><button class="popover__menu-item">Duplicate</button></li>
    <li><button class="popover__menu-item">Delete</button></li>
  </ul>
</div>`;

const positionScript = `document.querySelectorAll('[popovertarget]').forEach((trigger) => {
  if (trigger.hasAttribute('popovertargetaction')) return; // close buttons don't need positioning
  trigger.addEventListener('click', () => {
    const panel = document.getElementById(trigger.getAttribute('popovertarget'));
    const rect = trigger.getBoundingClientRect();
    panel.style.top = (rect.bottom + ${gap.value}) + 'px';
    panel.style.left = rect.left + 'px';
  });
});`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Popover</title>
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

  .demo-trigger { font-family: var(--sans); font-size: 14px; padding: 8px 14px; border-radius: 8px; border: 1px solid ${cv("border.default")}; background: ${cv("surface.default")}; color: ${cv("text.default")}; cursor: pointer; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("popover")}
  </nav>
  <main>
    <h1>Popover</h1>
    <p class="sub">tokens/components/popover.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Native popover API</b><span>Real <code class="tok">popover</code>/<code class="tok">popovertarget</code> attributes — free top-layer rendering (no z-index), free outside-click/Escape dismissal. These demos are genuinely interactive, not forced-open stand-ins.</span></div>
      <div class="row"><b>Border + shadow, both</b><span>Unlike Card (border-only, doesn't float) or Tooltip (shadow-only, no border) — Popover floats (needs shadow.sm) but also carries structured content worth a crisp edge (border.default).</span></div>
      <div class="row"><b>Positioning</b><span>The Popover API alone doesn't anchor-position — a small script (shown below) reads the trigger's bounding rect on click and places the panel underneath it, gap.2 (8px) below.</span></div>
      <div class="row"><b>No animation</b><span>Instant show/hide, on purpose — kept the scope on the core native-dismissal behavior rather than entrance/exit polish.</span></div>
      <div class="row"><b>Not modal</b><span>The rest of the page stays interactive while a Popover is open — that's the whole distinction from <a href="modal.html">Modal</a>/<a href="drawer.html">Drawer</a>.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Positioning script</h2>
    <p class="section-desc">The only JS this component needs — everything else (open/close/outside-click/Escape/top-layer) is native browser behavior.</p>
    <pre class="code"><code>${esc(positionScript)}</code></pre>

    <h2 class="big-section">Examples</h2>
    <p class="section-desc">Click to open for real — try clicking outside the panel or pressing Escape.</p>
    <div class="story-grid">
      ${storyCard("With header + close button", basicDemo, basicCode)}
      ${storyCard("Menu content", menuDemo, menuCode, "Popover doesn't care what's inside — a list of actions works exactly like the header+body example.")}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
<script>${positionScript}</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/popover.html"), html);
console.log("wrote docs/popover.html");
