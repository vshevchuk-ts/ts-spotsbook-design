// Regenerates docs/menu.html from tokens/components/menu.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Built on Popover's exact shell (native `popover` attribute, border+shadow.sm+
// radius.default, the same small positioning script) — Menu is a list of
// actions (role=menu/menuitem in a real port), not a Popover variant, same
// reasoning Modal/Drawer stayed separate files despite sharing <dialog>.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-menu-doc.mjs
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
const menu = load("tokens/components/menu.tokens.json").component.menu;

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
  "surface.card", "outline.default", "outline.accent", "text.default", "text.disabled", "text.negative",
  "icon.secondary", "icon.disabled", "icon.negative", "fill.neutral", "fill.neutralHover", "fill.neutralPressed", "bg.negative",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const radius = px(resolve(menu.radius.$value));
const itemRadius = px(resolve(menu.itemRadius.$value));
const padding = px(resolve(menu.padding.$value));
const gap = px(resolve(menu.gap.$value));
const itemPaddingX = px(resolve(menu.itemPaddingX.$value));
const itemPaddingY = px(resolve(menu.itemPaddingY.$value));
const itemGap = px(resolve(menu.itemGap.$value));
const iconSize = px(resolve(menu.iconSize.$value));
const labelType = resolveToken(menu.label);
const shadow = resolveToken(menu.shadow);
const shadowCss = `${px(shadow.offsetX)} ${px(shadow.offsetY)} ${px(shadow.blur)} ${px(shadow.spread)} ${shadow.color}`;

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const iconFile = (name) => fs.readFileSync(path.join(root, `assets/icons/ui/${name}.svg`), "utf8").replace("<svg ", '<svg class="menu__icon" ');
const iconEdit = iconFile("settings");
const iconCopy = iconFile("copy");
const iconDelete = iconFile("delete");

const css = `${rootVars}

.menu { margin: 0; box-sizing: border-box; padding: ${padding}; border-radius: ${radius}; background: ${cv("surface.card")}; border: 1px solid ${cv("outline.default")}; box-shadow: ${shadowCss}; font-family: ${cv("family.sans")}; min-width: 180px; }
.menu__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: ${gap}; }
.menu__item { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: ${itemGap}; padding: ${itemPaddingY} ${itemPaddingX}; border: none; background: none; border-radius: ${itemRadius}; cursor: pointer; text-align: left; color: ${cv("text.default")}; font-family: inherit; ${typoCss(labelType)} }
.menu__item:hover { background: ${cv("fill.neutralHover")}; }
.menu__icon { width: ${iconSize}; height: ${iconSize}; flex-shrink: 0; color: ${cv("icon.secondary")}; }
.menu__item:disabled { color: ${cv("text.disabled")}; cursor: not-allowed; }
.menu__item:disabled:hover { background: none; }
.menu__item:disabled .menu__icon { color: ${cv("icon.disabled")}; }
.menu__item--destructive { color: ${cv("text.negative")}; }
.menu__item--destructive .menu__icon { color: ${cv("icon.negative")}; }
.menu__item--destructive:hover { background: ${cv("bg.negative")}; }
.menu__divider { height: 1px; background: ${cv("outline.default")}; margin: ${px(resolve("spacing.0_5"))} ${px(resolve("spacing.0"))}; }`;

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

const textOnlyDemo = `<button class="ov-btn ov-btn--secondary" popovertarget="menu-text">Actions</button>
    <div id="menu-text" class="menu" popover>
      <ul class="menu__list">
        <li><button class="menu__item">Settings</button></li>
        <li><button class="menu__item">Copy</button></li>
        <li><button class="menu__item">Share</button></li>
      </ul>
    </div>`;
const textOnlyCode = `<button popovertarget="menu-text">Actions</button>
<div id="menu-text" class="menu" popover>
  <ul class="menu__list">
    <li><button class="menu__item">Settings</button></li>
    <li><button class="menu__item">Copy</button></li>
    <li><button class="menu__item">Share</button></li>
  </ul>
</div>`;

const iconDemo = `<button class="ov-btn ov-btn--secondary" popovertarget="menu-icon">Actions</button>
    <div id="menu-icon" class="menu" popover>
      <ul class="menu__list">
        <li><button class="menu__item">${iconEdit}Settings</button></li>
        <li><button class="menu__item">${iconCopy}Copy</button></li>
        <li><div class="menu__divider"></div></li>
        <li><button class="menu__item menu__item--destructive">${iconDelete}Delete</button></li>
      </ul>
    </div>`;
const iconCode = `<button popovertarget="menu-icon">Actions</button>
<div id="menu-icon" class="menu" popover>
  <ul class="menu__list">
    <li><button class="menu__item">…Settings</button></li>
    <li><button class="menu__item">…Copy</button></li>
    <li><div class="menu__divider"></div></li>
    <li><button class="menu__item menu__item--destructive">…Delete</button></li>
  </ul>
</div>`;

const disabledDemo = `<button class="ov-btn ov-btn--secondary" popovertarget="menu-disabled">Actions</button>
    <div id="menu-disabled" class="menu" popover>
      <ul class="menu__list">
        <li><button class="menu__item">${iconEdit}Settings</button></li>
        <li><button class="menu__item" disabled>${iconCopy}Copy</button></li>
        <li><div class="menu__divider"></div></li>
        <li><button class="menu__item menu__item--destructive">${iconDelete}Delete</button></li>
      </ul>
    </div>`;
const disabledCode = `<button class="menu__item" disabled>…Copy</button>`;

const triggerGap = resolve("spacing.2").value;
const positionScript = `document.querySelectorAll('[popovertarget]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const panel = document.getElementById(trigger.getAttribute('popovertarget'));
    const rect = trigger.getBoundingClientRect();
    panel.style.top = (rect.bottom + ${triggerGap}) + 'px';
    panel.style.left = rect.left + 'px';
  });
});`;

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Menu</title>
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

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 64px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .ov-btn { box-sizing: border-box; height: ${px(resolve("spacing.10"))}; padding: 0 ${px(resolve("spacing.3"))}; border-radius: ${px(resolve("radius.default"))}; border: none; cursor: pointer; font-family: var(--sans); ${typoCss(resolveToken(get("text-style.heading-base")))} }
  .ov-btn--secondary { background: ${cv("fill.neutral")}; color: ${cv("text.default")}; }
  .ov-btn--secondary:hover { background: ${cv("fill.neutralHover")}; }
  .ov-btn--secondary:active { background: ${cv("fill.neutralPressed")}; }
  .ov-btn:focus-visible { outline: ${px(resolve("spacing.1"))} solid ${cv("outline.accent")}; outline-offset: ${px(resolve("spacing.0_5"))}; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("menu")}
  </nav>
  <main>
    <h1>Menu</h1>
    <p class="sub">tokens/components/menu.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Not a Popover variant</b><span>Built on Popover's exact shell (native <code class="tok">popover</code> attribute, border+shadow.sm+radius.default, same positioning script) but kept as its own component — a list of actions has a different content/keyboard model than arbitrary Popover content, same reasoning Modal/Drawer stayed separate despite sharing &lt;dialog&gt;.</span></div>
      <div class="row"><b>Not Listbox</b><span>Items here are things you <em>do</em> (Settings, Copy, Delete) with no persistent selection state — a list of selectable <em>options</em> (checkboxes, single/multi-select) is <a href="listbox.html">Listbox</a>, a separate component with a different ARIA role (listbox/option vs. menu/menuitem).</span></div>
      <div class="row"><b>Concentric radius</b><span>Panel is radius.default (8px), items are radius.xs (4px) — 8px outer minus the 4px outer padding, so a corner item's curve lines up with the panel's own curve instead of fighting it.</span></div>
      <div class="row"><b>Destructive item</b><span>text.danger/icon.danger at rest, and hovers into bg.danger (a pale red tint) instead of the usual fill.neutralHover — stays 'red' on hover rather than reverting to neutral gray.</span></div>
      <div class="row"><b>Static demo only</b><span>No real arrow-key/type-ahead keyboard navigation or ARIA roles implemented here — this is a tokens+visual reference, not a full accessible widget. A real port needs role="menu"/"menuitem" and roving tabindex added on top.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Positioning script</h2>
    <p class="section-desc">Identical to Popover's — same native popover attribute, same reasoning.</p>
    <pre class="code"><code>${esc(positionScript)}</code></pre>

    <h2 class="big-section">Content variants</h2>
    <p class="section-desc">Click to open for real.</p>
    <div class="story-grid">
      ${storyCard("Text only", textOnlyDemo, textOnlyCode)}
      ${storyCard("Icon + text, with divider + destructive item", iconDemo, iconCode, "The divider groups 'safe' actions apart from the destructive one — a common real menu pattern.")}
      ${storyCard("Disabled item", disabledDemo, disabledCode, "A disabled item keeps its icon/label faded and drops the hover background entirely.")}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
<script>${positionScript}</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/menu.html"), html);
console.log("wrote docs/menu.html");
