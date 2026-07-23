// Regenerates docs/grid.html from tokens/components/grid.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Purely presentational — no hover/focus/disabled states, same as Box/Separator.
// display:grid + a curated gap scale, nothing else; column count/sizing isn't
// tokenized (see the token's own $description for why) — demonstrated here as
// plain fixed counts plus the auto-fit responsive pattern this very docs site
// already uses for its own .story-grid.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-grid-doc.mjs
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
const grid = load("tokens/components/grid.tokens.json").component.grid;

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

const colorPaths = ["surface.raised", "outline.default", "text.secondary"];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const gapKeys = ["none", "xs", "sm", "md", "lg"];
const gapValue = Object.fromEntries(gapKeys.map((k) => [k, px(resolve(grid.gap[k].$value))]));

const css = `${rootVars}

.grid { display: grid; }
.grid--gap-none { gap: ${gapValue.none}; }
.grid--gap-xs { gap: ${gapValue.xs}; }
.grid--gap-sm { gap: ${gapValue.sm}; }
.grid--gap-md { gap: ${gapValue.md}; }
.grid--gap-lg { gap: ${gapValue.lg}; }
.grid--cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid--cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid--cols-4 { grid-template-columns: repeat(4, 1fr); }
.grid--cols-6 { grid-template-columns: repeat(6, 1fr); }
.grid--auto { grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); }`;

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

function cell(n) {
  return `<div class="grid-cell">${n}</div>`;
}
function cells(n) {
  return Array.from({ length: n }, (_, i) => cell(i + 1)).join("");
}

function colsStories() {
  const defs = [
    { key: "cols-2", label: "2 columns", n: 4 },
    { key: "cols-3", label: "3 columns", n: 6 },
    { key: "cols-4", label: "4 columns", n: 8 },
  ];
  return defs
    .map((d) => {
      const html = `<div class="grid grid--${d.key} grid--gap-xs demo-grid">${cells(d.n)}</div>`;
      const code = `<div class="grid grid--${d.key} grid--gap-xs">\n  <div>…</div>\n  ...\n</div>`;
      return storyCard(d.label, html, code);
    })
    .join("\n");
}

function gapStories() {
  return gapKeys
    .map((k) => {
      const html = `<div class="grid grid--cols-3 grid--gap-${k} demo-grid">${cells(6)}</div>`;
      const code = `<div class="grid grid--cols-3 grid--gap-${k}">…</div>`;
      return storyCard(`gap.${k} — ${gapValue[k]}`, html, code);
    })
    .join("\n");
}

const autoDemo = `<div class="grid grid--auto grid--gap-xs demo-grid">${cells(7)}</div>`;
const autoCode = `<div class="grid grid--auto grid--gap-xs">\n  <div>…</div>\n  ...\n</div>`;

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Grid</title>
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

  .demo-grid { width: 100%; }
  .grid-cell { background: ${cv("surface.raised")}; border: 1px solid ${cv("outline.default")}; border-radius: 6px; color: ${cv("text.secondary")}; font-family: var(--mono); font-size: 12px; display: flex; align-items: center; justify-content: center; height: 44px; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("grid")}
  </nav>
  <main>
    <h1>Grid</h1>
    <p class="sub">tokens/components/grid.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Gap only</b><span>The only tokenized property is gap — column count/sizing is a per-use structural decision, not a design-token scale (same reasoning Box applied to not tokenizing radius).</span></div>
      <div class="row"><b>Gap scale</b><span>none/xs/sm/md/lg — 0/8/12/16/24 — the <em>exact same</em> steps and dim aliases as <a href="box.html">Box</a>'s padding scale, reused rather than inventing a second spacing scale.</span></div>
      <div class="row"><b>Fixed columns</b><span>Plain <code class="tok">repeat(N, 1fr)</code> — 2/3/4/6 shown, any count works the same way.</span></div>
      <div class="row"><b>Auto-fit</b><span>Responsive without a single breakpoint token — <code class="tok">repeat(auto-fit, minmax(…, 1fr))</code>, the exact pattern this docs site's own .story-grid already uses on every page.</span></div>
      <div class="row"><b>No states</b><span>Purely presentational — same as Box/Separator, a layout container never reacts to hover/focus/press.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Fixed columns</h2>
    <p class="section-desc">gap.xs (8px) throughout.</p>
    <div class="story-grid">
      ${colsStories()}
    </div>

    <h2 class="big-section">Gap scale</h2>
    <p class="section-desc">3 columns, all five gap steps.</p>
    <div class="story-grid">
      ${gapStories()}
    </div>

    <h2 class="big-section">Auto-fit (responsive)</h2>
    <p class="section-desc">Columns count adjusts to the container width on its own — resize the window to see it reflow, no media query needed.</p>
    <div class="story-grid">
      ${storyCard("auto-fit, minmax(96px, 1fr)", autoDemo, autoCode)}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/grid.html"), html);
console.log("wrote docs/grid.html");
