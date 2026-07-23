// Regenerates docs/colors.html from tokens/primitives/color.tokens.json.
// The sportsbook primitive set (Pro theme) — base / status / absolutes / sub —
// NOT a Tailwind ramp. Run: node tools/build-colors-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const color = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/color.tokens.json"))).color;
const PAGE = color.base["surface-0"].$value;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isDark = (hex) => {
  if (!hex.startsWith("#")) return true;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.6;
};

function swatch(name, tok) {
  const v = tok.$value;
  const translucent = v.startsWith("rgba");
  const face = translucent
    ? `<span class="sw sw-alpha"><span class="sw-half" style="background:${PAGE}"><span class="sw-in" style="background:${v}"></span></span><span class="sw-half sw-check"><span class="sw-in" style="background:${v}"></span></span></span>`
    : `<span class="sw" style="background:${v}"></span>`;
  return `<div class="tok-row">
    ${face}
    <div class="tok-meta">
      <code class="tok-name">${name}</code>
      <code class="tok-val">${esc(v)}</code>
    </div>
    <p class="tok-desc">${esc(tok.$description || "")}</p>
  </div>`;
}

function group(title, note, entries) {
  return `<section class="grp">
    <h2 class="section">${title}</h2>
    ${note ? `<p class="grp-note">${esc(note)}</p>` : ""}
    <div class="tok-list">${entries.map(([k, t]) => swatch(k, t)).join("\n")}</div>
  </section>`;
}

const baseSurfaces = ["surface-0", "surface-2", "surface-4", "surface-6"].map((k) => [`base.${k}`, color.base[k]]);
const baseBrand = ["secondary", "contrast", "active-1", "active-2", "accent"].map((k) => [`base.${k}`, color.base[k]]);
const status = Object.entries(color.status).filter(([k]) => !k.startsWith("$")).map(([k, t]) => [`status.${k}`, t]);
const absolutes = [["white", color.white], ["black", color.black]];
const sub = Object.entries(color.sub).filter(([k]) => !k.startsWith("$")).map(([k, t]) => [`sub.${k}`, t]);

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — colors</title>
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
  .nav-category { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 16px 8px 6px; }
  main { flex: 1; padding: 3rem 3rem 4rem; max-width: 960px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  .sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 1.6rem; max-width: 74ch; line-height: 1.5; }
  h2.section { font-size: 13px; font-weight: 600; margin: 2rem 0 2px; font-family: var(--mono); }
  .grp-note { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 0.7rem; max-width: 78ch; line-height: 1.5; }
  .tok-list { border: 0.5px solid var(--border); border-radius: 10px; overflow: hidden; }
  .tok-row { display: grid; grid-template-columns: 40px 220px 1fr; align-items: center; gap: 14px; padding: 9px 14px; background: var(--bg-card); border-bottom: 0.5px solid var(--border); }
  .tok-row:last-child { border-bottom: none; }
  .sw { display: flex; width: 36px; height: 30px; border-radius: 6px; border: 0.5px solid var(--border-strong); overflow: hidden; }
  .sw-in { display: block; width: 100%; height: 100%; }
  .sw-half { flex: 1; min-width: 0; }
  .sw-check { background-image: linear-gradient(45deg, #bbb 25%, transparent 25%), linear-gradient(-45deg, #bbb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #bbb 75%), linear-gradient(-45deg, transparent 75%, #bbb 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0; background-color: #fff; }
  .tok-meta { display: flex; flex-direction: column; gap: 2px; }
  .tok-name { font-family: var(--mono); font-size: 12px; font-weight: 600; }
  .tok-val { font-family: var(--mono); font-size: 10.5px; color: var(--text-muted); }
  .tok-desc { font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.45; }
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("colors")}
  </nav>
  <main>
    <h1>Colors — primitives</h1>
    <p class="sub">The Turbo Sportsbook primitive set, baked to the <strong>Pro</strong> theme. This is a fixed, Theme-Editor-driven palette — no 25→950 ramp. In the live product the Theme Editor rewrites <code>base</code> and <code>status</code> as CSS variables at runtime; <code>sub</code> is derived from them by opacity. Everything above (semantic, components) aliases these. <code>tokens/primitives/color.tokens.json</code> · generated — don't hand-edit hex.</p>

    ${group("base — surfaces", "The neutral elevation stack (Theme Editor → Surfaces). Page is darkest; each step up is lighter. surface-6 is a fill/outline colour, not a background.", baseSurfaces)}
    ${group("base — text & brand", "secondary/contrast are the two text colours; active-1/active-2 are the active colour (flat + gradient stops); accent is the secondary brand pop. All editable in the Theme Editor.", baseBrand)}
    ${group("status", "positive/negative/warning are editable in the Theme Editor; color-4..7 are extra bet-status hues set only via an imported theme file.", status)}
    ${group("absolutes", "Theme-independent. Note: the darken/shadow steps below build on surface-0 (the page colour), not on pure black.", absolutes)}
    ${group("sub — opacity washes", "Derived by opacity: 12% colour tints, black darken/shadow steps (on the page colour), white lighten steps. Shown split — left over the page colour (real look), right on a checkerboard to reveal transparency.", sub)}
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/colors.html"), html);
console.log("wrote docs/colors.html");
