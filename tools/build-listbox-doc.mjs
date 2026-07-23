// Regenerates docs/listbox.html from tokens/components/listbox.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json
// (plus search.tokens.json for the embedded search field's own sm-size values).
// Same panel shell as Menu/Popover (native popover attribute, border+shadow.sm+
// radius.default) — kept as its own component because options carry selection
// state (checked/selected), unlike Menu's one-shot action items. Separate from
// Menu for the same reason Modal/Drawer stayed separate despite sharing <dialog>.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-listbox-doc.mjs
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
const listbox = load("tokens/components/listbox.tokens.json").component.listbox;
const search = load("tokens/components/search.tokens.json").component.search;

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

const colorPaths = [
  "surface.default", "surface.sunken", "border.default", "border.focus", "text.default", "text.secondary", "text.disabled", "text.muted", "text.primary",
  "icon.default", "icon.onFill", "fill.neutral", "fill.neutralHover", "fill.neutralActive", "fill.primary",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const radius = px(resolve(listbox.radius.$value));
const optionRadius = px(resolve(listbox.optionRadius.$value));
const padding = px(resolve(listbox.padding.$value));
const gap = px(resolve(listbox.gap.$value));
const optionPaddingX = px(resolve(listbox.optionPaddingX.$value));
const optionPaddingY = px(resolve(listbox.optionPaddingY.$value));
const optionGap = px(resolve(listbox.optionGap.$value));
const checkmarkSize = px(resolve(listbox.checkmarkSize.$value));
const maxHeight = px(resolve(listbox.maxHeight.$value));
const labelType = resolveToken(listbox.label);
const shadow = resolveToken(listbox.shadow);
const shadowCss = `${px(shadow.offsetX)} ${px(shadow.offsetY)} ${px(shadow.blur)} ${px(shadow.spread)} ${shadow.color}`;

const cbBox = px(resolve(listbox.checkbox.box.$value));
const cbRadius = px(resolve(listbox.checkbox.radius.$value));
const cbBorderWidth = px(resolve(listbox.checkbox.borderWidth.$value));

const searchGapBelow = px(resolve(listbox.search.gapBelow.$value));
const searchHeight = px(resolve(search.size.sm.height.$value));
const searchPaddingX = px(resolve(search.size.sm.paddingX.$value));
const searchIconSize = px(resolve(search.size.sm.iconSize.$value));
const searchGap = px(resolve(search.size.sm.gap.$value));
const searchValueType = resolveToken(search.value);

const selectAllLabelType = resolveToken(listbox.selectAllRow.label);
const clearActionType = resolveToken(listbox.selectAllRow.clearAction);
// resolveToken only ever returns a $value tree, so $extensions (the
// textDecoration link-sm carries) gets silently dropped along the way —
// fetch it directly from the token this one points at.
const clearActionNode = get(listbox.selectAllRow.clearAction.$value);
const clearActionDecoration = clearActionNode.$extensions?.["turbo.sportsbook/text"]?.textDecoration;

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}
function linkCss(t, decoration) {
  return `${typoCss(t)}${decoration ? ` text-decoration: ${decoration};` : ""}`;
}

const iconCheck = fs.readFileSync(path.join(root, "assets/icons/material-filled/check.svg"), "utf8");
const iconCheckmark = iconCheck.replace("<svg ", '<svg class="listbox__checkmark" ');
const iconCheckboxGlyph = iconCheck.replace("<svg ", '<svg class="listbox__cb-icon" ');
const iconSearch = fs.readFileSync(path.join(root, "assets/icons/material-filled/search.svg"), "utf8").replace("<svg ", '<svg class="listbox__search-icon" ');

const css = `${rootVars}

.listbox { margin: 0; box-sizing: border-box; padding: ${padding}; border-radius: ${radius}; background: ${cv("surface.default")}; border: 1px solid ${cv("border.default")}; box-shadow: ${shadowCss}; font-family: ${cv("family.sans")}; min-width: 220px; }
.listbox__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: ${gap}; max-height: ${maxHeight}; overflow: auto; }
.listbox__option { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: ${optionGap}; padding: ${optionPaddingY} ${optionPaddingX}; border: none; background: none; border-radius: ${optionRadius}; cursor: pointer; text-align: left; color: ${cv("text.default")}; font-family: inherit; ${typoCss(labelType)} }
.listbox__option:hover { background: ${cv("fill.neutralHover")}; }
.listbox__checkmark { width: ${checkmarkSize}; height: ${checkmarkSize}; margin-left: auto; color: ${cv("fill.primary")}; flex-shrink: 0; }

.listbox__cb-option { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: ${optionGap}; padding: ${optionPaddingY} ${optionPaddingX}; border-radius: ${optionRadius}; cursor: pointer; }
.listbox__cb-option:hover { background: ${cv("fill.neutralHover")}; }
.listbox__cb-input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.listbox__cb-box { box-sizing: border-box; width: ${cbBox}; height: ${cbBox}; border-radius: ${cbRadius}; border: ${cbBorderWidth} solid ${cv("border.default")}; background: ${cv("surface.default")}; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.listbox__cb-icon { width: ${px(resolve("spacing.4"))}; height: ${px(resolve("spacing.4"))}; display: none; }
.listbox__cb-input:checked ~ .listbox__cb-box { background: ${cv("fill.primary")}; border-color: ${cv("fill.primary")}; }
.listbox__cb-input:checked ~ .listbox__cb-box .listbox__cb-icon { display: block; color: ${cv("icon.onFill")}; }
.listbox__cb-label { color: ${cv("text.default")}; font-family: inherit; ${typoCss(labelType)} }

.listbox__search-wrap { padding: ${px(resolve("spacing.1"))} ${px(resolve("spacing.1"))} ${searchGapBelow}; margin-bottom: ${px(resolve("spacing.0_5"))}; border-bottom: 1px solid ${cv("border.default")}; }
.listbox__search { display: flex; align-items: center; box-sizing: border-box; height: ${searchHeight}; padding: 0 ${searchPaddingX}; gap: ${searchGap}; border-radius: ${px(resolve("radius.default"))}; background: ${cv("surface.sunken")}; border: 1px solid ${cv("border.default")}; }
.listbox__search-icon { width: ${searchIconSize}; height: ${searchIconSize}; color: ${cv("icon.default")}; flex-shrink: 0; }
.listbox__search input { border: none; background: none; outline: none; width: 100%; color: ${cv("text.default")}; font-family: inherit; ${typoCss(searchValueType)} }
.listbox__search input::placeholder { color: ${cv("text.muted")}; }

.listbox__select-all { display: flex; align-items: center; justify-content: space-between; gap: ${px(resolve("spacing.2"))}; padding: ${px(resolve("spacing.1"))} ${px(resolve("spacing.2"))}; }
.listbox__select-all-label { color: ${cv("text.secondary")}; margin: 0; ${typoCss(selectAllLabelType)} }
.listbox__clear { border: none; background: none; padding: 0; cursor: pointer; color: ${cv("text.primary")}; ${linkCss(clearActionType, clearActionDecoration)} }`;

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

const singleCountries = ["Ukraine", "Poland", "Germany", "France"];
const singleDemo = `<button class="ov-btn ov-btn--secondary" popovertarget="listbox-single">Country: Poland</button>
    <div id="listbox-single" class="listbox" popover>
      <ul class="listbox__list">
        ${singleCountries.map((c) => `<li><button class="listbox__option">${c}${c === "Poland" ? iconCheckmark : ""}</button></li>`).join("\n        ")}
      </ul>
    </div>`;
const singleCode = `<button popovertarget="listbox-single">Country: Poland</button>
<div id="listbox-single" class="listbox" popover>
  <ul class="listbox__list">
    <li><button class="listbox__option">Ukraine</button></li>
    <li><button class="listbox__option">Poland<svg class="listbox__checkmark">…</svg></button></li>
    <li><button class="listbox__option">Germany</button></li>
    <li><button class="listbox__option">France</button></li>
  </ul>
</div>`;

const multiOptions = [
  { label: "Bug", checked: true },
  { label: "Feature request", checked: true },
  { label: "Documentation", checked: false },
  { label: "Question", checked: false },
];
function cbOption(id, label, checked) {
  return `<li><label class="listbox__cb-option" for="${id}">
          <input type="checkbox" class="listbox__cb-input" id="${id}"${checked ? " checked" : ""} />
          <span class="listbox__cb-box">${iconCheckboxGlyph}</span>
          <span class="listbox__cb-label">${label}</span>
        </label></li>`;
}
const multiDemo = `<button class="ov-btn ov-btn--secondary" popovertarget="listbox-multi">Labels (2)</button>
    <div id="listbox-multi" class="listbox" popover>
      <div class="listbox__search-wrap">
        <div class="listbox__search">${iconSearch}<input type="text" placeholder="Search labels…" /></div>
      </div>
      <div class="listbox__select-all">
        <p class="listbox__select-all-label">2 of 4 selected</p>
        <button class="listbox__clear">Clear all</button>
      </div>
      <ul class="listbox__list">
        ${multiOptions.map((o, i) => cbOption(`lb-multi-${i}`, o.label, o.checked)).join("\n        ")}
      </ul>
    </div>`;
const multiCode = `<button popovertarget="listbox-multi">Labels (2)</button>
<div id="listbox-multi" class="listbox" popover>
  <div class="listbox__search-wrap">
    <div class="listbox__search">…<input type="text" placeholder="Search labels…" /></div>
  </div>
  <div class="listbox__select-all">
    <p class="listbox__select-all-label">2 of 4 selected</p>
    <button class="listbox__clear">Clear all</button>
  </div>
  <ul class="listbox__list">
    <li><label class="listbox__cb-option">
      <input type="checkbox" class="listbox__cb-input" checked />
      <span class="listbox__cb-box">…</span>
      <span class="listbox__cb-label">Bug</span>
    </label></li>
    …
  </ul>
</div>`;

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
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Listbox</title>
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

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 64px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .ov-btn { box-sizing: border-box; height: ${px(resolve("spacing.10"))}; padding: 0 ${px(resolve("spacing.3"))}; border-radius: ${px(resolve("radius.default"))}; border: none; cursor: pointer; font-family: var(--sans); ${typoCss(resolveToken(get("text-style.heading-base")))} }
  .ov-btn--secondary { background: ${cv("fill.neutral")}; color: ${cv("text.default")}; }
  .ov-btn--secondary:hover { background: ${cv("fill.neutralHover")}; }
  .ov-btn--secondary:active { background: ${cv("fill.neutralActive")}; }
  .ov-btn:focus-visible { outline: ${px(resolve("spacing.1"))} solid ${cv("border.focus")}; outline-offset: ${px(resolve("spacing.0_5"))}; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("listbox")}
  </nav>
  <main>
    <h1>Listbox</h1>
    <p class="sub">tokens/components/listbox.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Not Menu</b><span>Options carry persistent selection state (checked/selected) — Menu's items are one-shot actions with no state. Different ARIA role too: listbox/option here vs. menu/menuitem there.</span></div>
      <div class="row"><b>Same panel shell</b><span>border.default + shadow.sm + radius.default, native popover attribute, same positioning script as Menu/Popover.</span></div>
      <div class="row"><b>Single-select</b><span>Trailing checkmark (check.svg, fill.primary) on the selected option, no background tint — same convention as Radix Select / a native &lt;select&gt;. Picking an option would close the listbox in a real implementation.</span></div>
      <div class="row"><b>Multi-select</b><span>A real Checkbox marker per option — literally the Checkbox component's own tokens (dim.5 box, radius.xs, fill.primary checked), not re-derived. Stays open across picks.</span></div>
      <div class="row"><b>Search + select-all</b><span>Search reuses Search component's own sm-size tokens verbatim. "Clear all" uses text-style.link-sm (the underlined-link style), not a button — both only shown for the multi-select variant, where a long option list actually benefits from them.</span></div>
      <div class="row"><b>Static demo only</b><span>No real keyboard nav, live search filtering, or ARIA roles implemented — same caveat as Menu, this is a tokens+visual reference.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Positioning script</h2>
    <p class="section-desc">Identical to Menu/Popover's.</p>
    <pre class="code"><code>${esc(positionScript)}</code></pre>

    <h2 class="big-section">Examples</h2>
    <p class="section-desc">Click to open for real.</p>
    <div class="story-grid">
      ${storyCard("Single-select", singleDemo, singleCode, "Poland is selected — trailing checkmark, no other visual change.")}
      ${storyCard("Multi-select, with search + select-all", multiDemo, multiCode, "Bug and Feature request are checked. Clicking a checkbox in a real implementation wouldn't close the panel.")}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
<script>${positionScript}</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/listbox.html"), html);
console.log("wrote docs/listbox.html");
