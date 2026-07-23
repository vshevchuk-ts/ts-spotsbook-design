// Regenerates docs/box.html from tokens/components/box.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Purely presentational — no hover/focus/disabled states, same as Separator.
// The lowest-level layout primitive: exposes surface/border/padding roles
// directly rather than fixing one combination (that's what Card does on top
// of it). Radius isn't re-declared as a Box-specific token — the full
// existing radius scale (tokens/primitives/radius.tokens.json) applies as-is,
// shown here the same way layout.html shows it, just rendered on a real .box.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-box-doc.mjs
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
const box = load("tokens/components/box.tokens.json").component.box;

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

const colorPaths = ["surface.page", "surface.card", "surface.raised", "surface.overlay", "outline.default", "text.secondary"];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const paddingKeys = ["none", "xs", "sm", "md", "lg"];
const paddingValue = Object.fromEntries(paddingKeys.map((k) => [k, px(resolve(box.padding[k].$value))]));

// Sort by resolved px, same reasoning as build-layout-doc.mjs: object key
// order for radius ("none","xxs","xs","sm","default","md","lg","xl","full")
// already reads sensibly here since none of the keys look like array indices.
const radiusRows = Object.entries(radiusPrim).filter(([k]) => !k.startsWith("$"));
function resolveRadiusPx(ref) {
  const key = ref.replace(/[{}]/g, "").split(".")[1];
  return px(dim[key].$value);
}

const css = `${rootVars}

.box { box-sizing: border-box; }
.box--border { border: 1px solid ${cv("outline.default")}; }
.box--page { background: ${cv("surface.page")}; }
.box--default { background: ${cv("surface.card")}; }
.box--sunken { background: ${cv("surface.raised")}; }
.box--overlay { background: ${cv("surface.overlay")}; }
.box--padding-none { padding: ${paddingValue.none}; }
.box--padding-xs { padding: ${paddingValue.xs}; }
.box--padding-sm { padding: ${paddingValue.sm}; }
.box--padding-md { padding: ${paddingValue.md}; }
.box--padding-lg { padding: ${paddingValue.lg}; }`;

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

const surfaceDefs = [
  { key: "page", label: "surface.page", note: "The page background itself — a Box in this role only reads as a container once nested inside something with a different surface." },
  { key: "default", label: "surface.card", note: "The ordinary card/panel background." },
  { key: "sunken", label: "surface.raised", note: "Recessed — same role Input/Select/Search use for their own field background." },
  { key: "overlay", label: "surface.overlay", note: "Modal/drawer backdrop surface — includes its own alpha, per the semantic layer's own token." },
];
function surfaceStories() {
  return surfaceDefs
    .map((s) => {
      const html = `<div class="box box--${s.key} box--border box--padding-md demo-box">Box</div>`;
      const code = `<div class="box box--${s.key} box--border box--padding-md">…</div>`;
      return storyCard(s.label, html, code, s.note);
    })
    .join("\n");
}

function paddingStories() {
  return paddingKeys
    .map((k) => {
      const html = `<div class="box box--default box--border box--padding-${k} demo-box">Box</div>`;
      const code = `<div class="box box--default box--border box--padding-${k}">…</div>`;
      return storyCard(`padding.${k} — ${paddingValue[k]}`, html, code);
    })
    .join("\n");
}

function radiusRowsHtml() {
  return radiusRows
    .map(([k, v]) => {
      const d = resolveRadiusPx(v.$value);
      return `<tr><td><code class="tok">radius.${k}</code></td><td class="ctx">${v.$value}</td><td>${d}</td><td><div class="box box--default box--border radius-demo" style="border-radius:${d}"></div></td></tr>`;
    })
    .join("\n      ");
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Box</title>
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

  .demo-box { width: 100%; min-height: 64px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--text-secondary); font-family: var(--mono); }

  table.scale { border-collapse: collapse; width: 100%; font-size: 13px; }
  table.scale th, table.scale td { text-align: left; padding: 8px 12px 8px 0; border-bottom: 0.5px solid var(--border); vertical-align: middle; }
  table.scale th { color: var(--text-secondary); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
  .ctx { color: var(--text-secondary); font-size: 12px; }
  .radius-demo { width: 56px; height: 56px; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("box")}
  </nav>
  <main>
    <h1>Box</h1>
    <p class="sub">tokens/components/box.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Lowest-level primitive</b><span>A generic container exposing surface/border/padding directly, no fixed combination — <a href="card.html">Card</a> is built on top of it by picking one specific combination for content grouping.</span></div>
      <div class="row"><b>No states</b><span>Purely presentational — same as <a href="separator.html">Separator</a>, a plain container never reacts to hover/focus/press on its own.</span></div>
      <div class="row"><b>Surface</b><span>Every semantic surface role except disabled (a component-state concept, not a layout choice): page/default/sunken/overlay.</span></div>
      <div class="row"><b>Border</b><span>On/off only (border.default) — not a role choice like Input's, since Box isn't an interactive field.</span></div>
      <div class="row"><b>Radius</b><span>Not re-declared — the full existing radius scale applies as-is, shown below on a real Box.</span></div>
      <div class="row"><b>Padding</b><span>A curated 5-step subset of the dim scale (none/xs/sm/md/lg) — enough for a generic container; anything more specific can still reach dim.* directly.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Surface</h2>
    <p class="section-desc">All shown with border on, padding.md, for a consistent frame of reference.</p>
    <div class="story-grid">
      ${surfaceStories()}
    </div>

    <h2 class="big-section">Radius</h2>
    <p class="section-desc">The complete existing radius scale (tokens/primitives/radius.tokens.json) — Box doesn't own its own radius values, it just demonstrates the scale on a real container.</p>
    <div class="table-wrap">
    <table class="scale">
      <tr><th>Token</th><th>Alias</th><th>Value</th><th>Preview</th></tr>
      ${radiusRowsHtml()}
    </table>
    </div>

    <h2 class="big-section">Padding</h2>
    <p class="section-desc">surface.default + border, five padding steps.</p>
    <div class="story-grid">
      ${paddingStories()}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/box.html"), html);
console.log("wrote docs/box.html");
