// Regenerates docs/icons.html from assets/icons/material-filled/*.svg.
// Run: node tools/build-icons-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconsDir = path.join(root, "assets/icons/material-filled");
const files = fs.readdirSync(iconsDir).filter((f) => f.endsWith(".svg"));
const allSlugs = files.map((f) => f.replace(".svg", "")).sort();

const primitives = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/color.tokens.json"))).color;
const semantic = JSON.parse(fs.readFileSync(path.join(root, "tokens/semantic/color.tokens.json")));
function resolve(value, depth = 0) {
  if (depth > 5) throw new Error("alias too deep: " + value);
  if (typeof value !== "string" || !value.startsWith("{")) return value;
  const path_ = value.replace(/[{}]/g, "").split(".");
  let node;
  if (path_[0] === "color") node = path_.length === 2 ? primitives[path_[1]].$value : primitives[path_[1]][path_[2]].$value;
  else node = semantic[path_[0]][path_[1]].$value;
  return resolve(node, depth + 1);
}
const iconDefaultHex = resolve(semantic.icon.default.$value);

function svgOf(slug) {
  return fs.readFileSync(path.join(iconsDir, `${slug}.svg`), "utf8");
}

function renderGrid(slugs) {
  return `
    <div class="icon-grid">
      ${slugs
        .map(
          (slug) => `<div class="icon-card" data-name="${slug}">
        <div class="icon-glyph">${svgOf(slug)}</div>
        <code class="icon-name">${slug}</code>
        <span class="icon-used">not yet used</span>
      </div>`
        )
        .join("\n      ")}
    </div>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — icons</title>
<link rel="stylesheet" href="../assets/fonts/rubik/rubik.css" />
<style>
  :root {
    --bg-page: #f7f7f5; --bg-card: #ffffff; --bg-card-hover: #fbfbfa;
    --border: #e4e3df; --border-strong: #d2d1cb;
    --text-primary: #0e0e10; --text-secondary: #63625c; --text-muted: #918f87;
    --accent: #0468c4; --accent-bg: #eff6ff;
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
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --bg-page: #17171a; --bg-card: #1e1e22; --bg-card-hover: #232327;
    --border: #313035; --border-strong: #403f45;
    --text-primary: #f2f1ee; --text-secondary: #a7a5a0; --text-muted: #706e68;
    --accent: #5aa4ec; --accent-bg: #16283b;
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
  .navlink.disabled { color: var(--text-muted); cursor: default; pointer-events: none; }
  .nav-category { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 16px 8px 6px; }
  .tag { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); border: 0.5px solid var(--border-strong); border-radius: 4px; padding: 1px 5px; }
  main { flex: 1; padding: 3rem 3rem 4rem; max-width: 1200px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  .sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 1.2rem; }
  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 12px 16px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1.2rem; }
  .legend .row { display: flex; gap: 14px; padding: 5px 0; border-bottom: 0.5px solid var(--border); }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 150px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  #search { width: 100%; box-sizing: border-box; padding: 9px 12px; font-size: 13px; border: 0.5px solid var(--border-strong); border-radius: 8px; background: var(--bg-card); color: var(--text-primary); margin-bottom: 0.4rem; }
  #search:focus { outline: none; border-color: var(--accent); }
  #count { font-size: 11.5px; color: var(--text-muted); margin: 0 0 1.5rem; }
  .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 8px; }
  .icon-card { border: 0.5px solid var(--border); border-radius: 10px; background: var(--bg-card); padding: 14px 8px 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
  .icon-glyph { width: 24px; height: 24px; color: ${iconDefaultHex}; }
  .icon-glyph svg { width: 24px; height: 24px; display: block; }
  .icon-name { font-family: var(--mono); font-size: 10px; color: var(--text-secondary); word-break: break-all; }
  .icon-used { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .icon-card.hidden { display: none; }
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("icons")}
  </nav>
  <main>
    <h1>Icons</h1>
    <p class="sub">assets/icons/material-filled/*.svg · Material Icons, "Filled" style, Apache 2.0 · ${allSlugs.length} icons so far — extracted on demand, not the full ~2100-icon set</p>

    <div class="legend">
      <div class="row"><b>Source</b><span>google/material-design-icons, "Filled" style, 24px SVG. Extracted selectively (this batch matched an existing product icon audit + common UI basics) — add more the same way as new needs come up, not a one-time full import.</span></div>
      <div class="row"><b>Color</b><span>Every SVG has fill="currentColor" — never hardcode a fill. Previewed here at icon.default (${iconDefaultHex}); set icon.primary/success/danger/warning as the wrapper's CSS color to switch it.</span></div>
      <div class="row"><b>Size</b><span>Sourced at 24px, the standard UI icon grid — scale via CSS width/height, the paths stay crisp at typical UI sizes (16–32px).</span></div>
      <div class="row"><b>Used by</b><span>Placeholder for now — every icon says "not yet used" since no components consume them yet. Gets rewritten to real component references as they're built, per the standing token-docs-legend rule.</span></div>
    </div>

    <input id="search" type="text" placeholder="Search icons by name…" autocomplete="off" />
    <p id="count"></p>

    <div id="results">
      ${renderGrid(allSlugs)}
    </div>
  </main>
</div>
<script>
  const input = document.getElementById("search");
  const cards = [...document.querySelectorAll(".icon-card")];
  const countEl = document.getElementById("count");
  function update() {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach((c) => {
      const match = !q || c.dataset.name.includes(q);
      c.classList.toggle("hidden", !match);
      if (match) visible++;
    });
    countEl.textContent = visible + " / " + cards.length + " icons";
  }
  input.addEventListener("input", update);
  update();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/icons.html"), html);
console.log(`wrote docs/icons.html (${allSlugs.length} icons)`);
