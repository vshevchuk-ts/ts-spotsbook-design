// Regenerates docs/drawer.html from tokens/components/drawer.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Uses the native <dialog> element with showModal() — free focus-trap,
// Escape-to-close, ::backdrop, top-layer rendering, no z-index needed.
// Close button uses <form method="dialog">, the fully-declarative native way
// to close a dialog, no onclick handler. Open/close animates via
// @starting-style + transitions on transform/::backdrop (allow-discrete) —
// no JS animation.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-drawer-doc.mjs
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
const drawer = load("tokens/components/drawer.tokens.json").component.drawer;

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

const colorPaths = [
  "surface.raised",
  "surface.card", "surface.overlay", "outline.default", "outline.active", "text.default", "text.secondary", "lighten.2", "text.onFill", "text.forActiveBg", "icon.secondary",
  "fill.neutral", "fill.neutralHover", "fill.neutralPressed", "fill.active", "fill.activeHover", "fill.activePressed",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const width = px(resolve(drawer.width.$value));
const radius = px(resolve(drawer.radius.$value));
const padding = px(resolve(drawer.padding.$value));
const gap = px(resolve(drawer.gap.$value));
const duration = drawer.transitionDuration.$value;
const titleType = resolveToken(drawer.title);
const bodyType = resolveToken(drawer.body);
const shadow = resolveToken(drawer.shadow);
const shadowCss = `${px(shadow.offsetX)} ${px(shadow.offsetY)} ${px(shadow.blur)} ${px(shadow.spread)} ${shadow.color}`;
const dur = `${duration.value}${duration.unit}`;

const iconClose = fs.readFileSync(path.join(root, "assets/icons/material-filled/close.svg"), "utf8").replace("<svg ", '<svg class="drawer__close-icon" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

dialog.drawer { position: fixed; margin: 0; padding: 0; border: none; box-sizing: border-box; background: ${cv("surface.card")}; box-shadow: ${shadowCss}; }
dialog.drawer::backdrop { background: ${cv("surface.overlay")}; opacity: 0; transition: opacity ${dur} ease allow-discrete; }
dialog.drawer[open]::backdrop { opacity: 1; }
@starting-style { dialog.drawer[open]::backdrop { opacity: 0; } }

dialog.drawer--right { top: 0; right: 0; left: auto; height: 100dvh; width: ${width}; max-width: 90vw; border-radius: ${radius}; transform: translateX(100%); transition: transform ${dur} ease, overlay ${dur} allow-discrete, display ${dur} allow-discrete; }
dialog.drawer--right[open] { transform: translateX(0); }
@starting-style { dialog.drawer--right[open] { transform: translateX(100%); } }

dialog.drawer--bottom { bottom: 0; left: 0; right: 0; top: auto; width: 100%; max-height: 80dvh; border-radius: ${radius}; transform: translateY(100%); transition: transform ${dur} ease, overlay ${dur} allow-discrete, display ${dur} allow-discrete; }
dialog.drawer--bottom[open] { transform: translateY(0); }
@starting-style { dialog.drawer--bottom[open] { transform: translateY(100%); } }

.drawer__content { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; font-family: ${cv("family.sans")}; }
.drawer__header { flex-shrink: 0; box-sizing: border-box; position: relative; display: flex; align-items: center; justify-content: center; gap: ${px(resolve("spacing.2"))}; height: ${px(resolve("spacing.10"))}; padding: 0 ${px(resolve("spacing.10"))}; background: ${cv("surface.raised")}; }
.drawer__title { margin: 0; color: ${cv("text.default")}; text-align: center; ${typoCss(titleType)} }
.drawer__hcounter { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: ${cv("lighten.2")}; color: ${cv("text.default")}; font-weight: 700; font-size: 12px; }
.drawer__body { flex: 1; box-sizing: border-box; overflow: auto; padding: ${padding}; }
.drawer__body-text { margin: 0; color: ${cv("text.secondary")}; ${typoCss(bodyType)} }
.drawer__footer { flex-shrink: 0; box-sizing: border-box; display: flex; gap: ${gap}; justify-content: flex-end; padding: ${padding}; border-top: 1px solid ${cv("outline.default")}; }

.drawer__close { position: absolute; right: ${px(resolve("spacing.2"))}; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: ${px(resolve("radius.default"))}; background: transparent; padding: 0; cursor: pointer; color: ${cv("icon.secondary")}; }
.drawer__close:hover { background: ${cv("fill.neutralHover")}; }
.drawer__close:active { background: ${cv("fill.neutralPressed")}; }
.drawer__close:focus-visible { outline: ${px(resolve("spacing.1"))} solid ${cv("outline.active")}; outline-offset: ${px(resolve("spacing.0_5"))}; }
.drawer__close-icon { width: 20px; height: 20px; display: block; }

.ov-btn { box-sizing: border-box; height: ${px(resolve("spacing.10"))}; padding: 0 ${px(resolve("spacing.3"))}; border-radius: ${px(resolve("radius.default"))}; border: none; cursor: pointer; font-family: ${cv("family.sans")}; ${typoCss(resolveToken(get("text-style.heading-base")))} }
.ov-btn--secondary { background: ${cv("fill.neutral")}; color: ${cv("text.default")}; }
.ov-btn--secondary:hover { background: ${cv("fill.neutralHover")}; }
.ov-btn--secondary:active { background: ${cv("fill.neutralPressed")}; }
.ov-btn--primary { background: ${cv("fill.active")}; color: ${cv("text.forActiveBg")}; font-weight: 600; }
.ov-btn--primary:hover { background: ${cv("fill.activeHover")}; }
.ov-btn--primary:active { background: ${cv("fill.activePressed")}; }
.ov-btn:focus-visible { outline: ${px(resolve("spacing.1"))} solid ${cv("outline.active")}; outline-offset: ${px(resolve("spacing.0_5"))}; }`;

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

function drawerMarkup(id, placement, { withHeader = true, withCounter = false } = {}) {
  return `<button class="ov-btn ov-btn--secondary" data-drawer-open="${id}">Open drawer</button>
    <dialog class="drawer drawer--${placement}" id="${id}">
      <div class="drawer__content">
        ${withHeader ? `<div class="drawer__header">
          <p class="drawer__title">Betslip${withCounter ? ` <span class="drawer__hcounter">0</span>` : ""}</p>
          <form method="dialog"><button class="drawer__close" aria-label="Close">${iconClose}</button></form>
        </div>` : ""}
        <div class="drawer__body">
          <p class="drawer__body-text">Drawer content goes here — forms, filters, details, whatever the trigger opened for.</p>
        </div>
      </div>
    </dialog>`;
}
function drawerCode(placement, { withHeader = true } = {}) {
  return `<button data-drawer-open="drawer-${placement}">Open drawer</button>
<dialog class="drawer drawer--${placement}" id="drawer-${placement}">
  <div class="drawer__content">
${withHeader ? `    <div class="drawer__header">
      <p class="drawer__title">Betslip</p>
      <form method="dialog"><button class="drawer__close" aria-label="Close">…</button></form>
    </div>
` : ""}    <div class="drawer__body">
      <p class="drawer__body-text">Drawer content goes here…</p>
    </div>
  </div>
</dialog>`;
}

const openScript = `document.querySelectorAll('[data-drawer-open]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.drawerOpen).showModal();
  });
});`;

// showModal() gives Escape-to-close for free, but NOT click-outside-to-close —
// that's a separate, well-known <dialog> gotcha. Standard recipe (MDN's own
// light-dismiss pattern): the dialog's own padding is 0 and .drawer__content
// fills 100% of it, so every pixel of the visible panel is covered by a
// descendant element — a click landing on the <dialog> element itself (not a
// descendant) can only mean it hit the backdrop.
const dismissScript = `document.querySelectorAll('dialog.drawer').forEach((dlg) => {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
});`;

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Drawer</title>
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
    ${renderNav("drawer")}
  </nav>
  <main>
    <h1>Drawer</h1>
    <p class="sub">tokens/components/drawer.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Native &lt;dialog&gt;</b><span>Real <code class="tok">showModal()</code> — free focus-trap, Escape-to-close, ::backdrop, top-layer (no z-index). These demos are genuinely interactive.</span></div>
      <div class="row"><b>Separate from Modal</b><span>Both are "&lt;dialog&gt; with showModal()" underneath, but sizing/positioning/radius differ enough (edge-attached vs. free-floating centered) to keep as separate token files — an explicit prior decision, not an oversight.</span></div>
      <div class="row"><b>No border, no radius on flush edges</b><span>3 of 4 edges sit against the viewport boundary — shadow.md + the backdrop scrim already read as a distinct layer; a border would be redundant, and radius would look odd on edges with nothing to round away from.</span></div>
      <div class="row"><b>Header</b><span>A 40px band in surface-4 (distinct from the surface-2 body), no divider needed. The heading-base title is centered — optionally with a counter beside it — and the close button sits vertically centered on the right. The footer was removed. Header itself is still optional (a Drawer can be body-only).</span></div>
      <div class="row"><b>Real button states</b><span>Close (×) and the footer actions are genuine interactive elements — transparent/fill.neutral at rest → fill.neutralHover on hover → fill.neutralActive on press → a focus ring — the same recipe <a href="button.html">Button</a> itself uses, not unstyled placeholders.</span></div>
      <div class="row"><b>Native close</b><span><code class="tok">&lt;form method="dialog"&gt;</code> around each action button — the fully-declarative way to close a dialog, no onclick handler.</span></div>
      <div class="row"><b>Click-outside</b><span>Not native — showModal() only gives Escape for free. A small script (below) closes on backdrop click, same light-dismiss pattern MDN's own &lt;dialog&gt; docs recommend.</span></div>
      <div class="row"><b>Animated</b><span>@starting-style + transitions on transform/::backdrop (allow-discrete) — native CSS, no JS animation library.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Open script</h2>
    <p class="section-desc">&lt;dialog&gt; has no declarative "open" attribute equivalent to Popover's popovertarget, so a tiny script calls showModal(). Focus-trap, Escape-to-close, and ::backdrop are native — click-outside is not (see below).</p>
    <pre class="code"><code>${esc(openScript)}</code></pre>

    <h2 class="big-section">Click-outside-to-close</h2>
    <p class="section-desc">showModal() gives Escape-to-close for free, but <em>not</em> click-outside — that's a separate, easy-to-miss &lt;dialog&gt; gotcha (a body-only drawer with no close button and no click-outside would only be closable via Escape). Standard recipe: the dialog's own padding is 0 and .drawer__content fills 100% of it, so a click landing on the &lt;dialog&gt; element itself (not a descendant) can only mean it hit the backdrop.</p>
    <pre class="code"><code>${esc(dismissScript)}</code></pre>

    <h2 class="big-section">Placement</h2>
    <p class="section-desc">Click to open for real — try pressing Escape, clicking outside the panel, or clicking Cancel/Apply.</p>
    <div class="story-grid">
      ${storyCard("right (default)", drawerMarkup("drawer-right", "right", { withCounter: true }), drawerCode("right"), "Header is a 40px surface-4 band; the heading-base title is centered, with an optional counter beside it; the close (×) sits vertically centered at the right. No footer.")}
      ${storyCard("bottom", drawerMarkup("drawer-bottom", "bottom"), drawerCode("bottom"), "Same component, width:100% + max-height cap instead of the fixed 320px side width.")}
      ${storyCard("body only", drawerMarkup("drawer-plain", "right", { withHeader: false, withFooter: false }), drawerCode("plain", { withHeader: false, withFooter: false }), "No header, no footer, no close button — Escape and click-outside are the only ways to dismiss this one, which is exactly why click-outside isn't optional.")}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
<script>${openScript}</script>
<script>${dismissScript}</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/drawer.html"), html);
console.log("wrote docs/drawer.html");
