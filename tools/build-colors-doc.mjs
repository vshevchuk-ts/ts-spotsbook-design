// Regenerates docs/colors.html from tokens/primitives/*.json.
// Run: node tools/build-colors-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const colorTokens = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/color.tokens.json")));
const chartTokens = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/chart-series.tokens.json")));

const famOrder = ["gray", "blue", "red", "green", "amber", "orange", "violet", "magenta", "teal", "brown"];

function ramp(fam) {
  const group = colorTokens.color[fam];
  return Object.entries(group)
    .filter(([k]) => k !== "$description")
    .map(([step, tok]) => ({
      step,
      hex: tok.$value,
      L: tok.$extensions["turbo.sportsbook/x"].l,
      H: tok.$extensions["turbo.sportsbook/x"].h,
      onWhite: tok.$extensions["turbo.sportsbook/x"].onWhite,
    }))
    .sort((a, b) => Number(a.step) - Number(b.step));
}

const palette = {};
for (const fam of famOrder) palette[fam] = ramp(fam);
const primitiveWhite = colorTokens.color.white.$value;

const categorical = Object.entries(chartTokens.color.chart).map(([slot, tok]) => {
  const [, fam] = tok.$value.match(/^\{color\.(\w+)\.500\}$/);
  const row = palette[fam].find((r) => r.step === "500");
  return { slot, fam, ...row };
});

const html = `<!doctype html>
<html lang="en">
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
  nav.side {
    width: 220px; flex-shrink: 0; border-right: 0.5px solid var(--border);
    padding: 1.5rem 1rem; position: sticky; top: 0; height: 100vh; overflow-y: auto;
  }
  .brand { font-size: 14px; font-weight: 600; margin: 0 0 2px 8px; }
  .brand-sub { font-size: 11.5px; color: var(--text-muted); margin: 0 0 1.5rem 8px; }
  .navlink {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 7px 8px; border-radius: 7px; font-size: 13px; text-decoration: none;
    color: var(--text-primary); margin-bottom: 1px;
  }
  .navlink:hover { background: var(--bg-card-hover); }
  .navlink.active { background: var(--accent-bg); color: var(--accent); font-weight: 600; }
  .navlink.disabled { color: var(--text-muted); cursor: default; pointer-events: none; }
  .nav-category { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 16px 8px 6px; }
  .tag { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); border: 0.5px solid var(--border-strong); border-radius: 4px; padding: 1px 5px; }
  main { flex: 1; padding: 3rem 3rem 4rem; max-width: 1120px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  .sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 2rem; }
  h2.section { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin: 2.5rem 0 0.9rem; }
  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 12px 16px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1rem; }
  .legend .row { display: flex; gap: 14px; padding: 5px 0; border-bottom: 0.5px solid var(--border); align-items: baseline; }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 150px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; vertical-align: 1px; }
  .dot.text { background: #1c9851; }
  .dot.ui { border: 1.5px solid var(--text-muted); }
  .cat-row { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; }
  .cat-swatch { border-radius: 10px; padding: 12px 10px 10px; min-height: 78px; display: flex; flex-direction: column; justify-content: space-between; border: 0.5px solid var(--border); }
  .cat-swatch .name { font-size: 11px; font-weight: 600; letter-spacing: 0.02em; }
  .cat-swatch .hex { font-family: var(--mono); font-size: 10.5px; opacity: 0.85; }
  .family { margin-bottom: 4px; }
  .family-head { display: flex; align-items: baseline; gap: 8px; margin: 1.4rem 0 6px; }
  .family-name { font-size: 13px; font-weight: 600; text-transform: capitalize; }
  .family-hue { font-family: var(--mono); font-size: 11px; color: var(--text-muted); }
  .ramp { display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px; }
  .swatch { position: relative; border-radius: 6px; height: 52px; display: flex; flex-direction: column; justify-content: space-between; padding: 4px 5px; border: 0.5px solid rgba(0,0,0,0.06); }
  .swatch .step { font-family: var(--mono); font-size: 9.5px; font-weight: 600; }
  .swatch .hex { font-family: var(--mono); font-size: 8px; opacity: 0.8; }
  .swatch .mark { position: absolute; top: 4px; right: 4px; }
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("colors")}
  </nav>
  <main>
    <h1>Colors — primitives</h1>
    <p class="sub">tokens/primitives/color.tokens.json · generated — don't hand-edit hex</p>

    <div class="legend">
      <div class="row"><b><span class="dot text"></span>Step 600</b><span>AA text-safe on white, ≥4.5:1 — body text, links, small icons, anything read as text.</span></div>
      <div class="row"><b><span class="dot ui"></span>Step 500</b><span>Brand/UI-safe only, ≥3:1 — large text (≥18pt/14pt bold), borders, fills, illustrations. Not for small/body text.</span></div>
      <div class="row"><b>Steps 25–200</b><span>Solid light tints for backgrounds (notification chips, subtle fills, hover washes) — used as flat colors, not via opacity, so they never shift depending on what's behind them.</span></div>
      <div class="row"><b>Steps 700–950</b><span>Dark end of the ramp — reserved mostly for future dark-mode surfaces/text, not used by any light-mode style yet.</span></div>
      <div class="row"><b>Chart palette</b><span>Use only the 8 validated series slots below for data-viz identity — never a raw ramp color for a chart series, and never reorder them (order is the CVD-safety mechanism).</span></div>
      <div class="row"><b>white</b><span>Literal, not part of the gray ramp — gray-25 is a near-white neutral but not identical to it. No literal black: gray-950 already serves that role well (pure black reads too harsh for text in most modern UI).</span></div>
    </div>

    <h2 class="section">Absolutes</h2>
    <div class="cat-row" style="grid-template-columns: repeat(4, 1fr);">
      <div class="cat-swatch" style="background:${primitiveWhite};color:#141414;border:0.5px solid var(--border-strong)">
        <span class="name">white</span><span class="hex">${primitiveWhite}</span>
      </div>
    </div>

    <h2 class="section">Categorical / chart palette — validated (fixed order, CVD-safe)</h2>
    <div class="cat-row">
      ${categorical
        .map(
          (c) => `<div class="cat-swatch" style="background:${c.hex};color:${c.L > 0.64 ? "#141414" : "#fdfdfd"}">
        <span class="name">${c.slot}<br>${c.fam}</span><span class="hex">${c.hex}</span>
      </div>`
        )
        .join("\n      ")}
    </div>

    <h2 class="section">Primitive ramps</h2>
    <div id="families">
      ${famOrder
        .map((fam) => {
          const rows = palette[fam];
          const hue = rows.find((r) => r.step === "500").H;
          const swatches = rows
            .map((r) => {
              const color = r.L > 0.64 ? "#141414" : "#fdfdfd";
              const mark =
                r.onWhite >= 4.5
                  ? '<span class="mark dot text"></span>'
                  : r.onWhite >= 3
                  ? '<span class="mark dot ui"></span>'
                  : "";
              return `<div class="swatch" style="background:${r.hex};color:${color}" title="${fam}-${r.step}  ${r.hex}  onWhite ${r.onWhite}:1">
          <span class="step">${r.step}</span>${mark}<span class="hex">${r.hex}</span>
        </div>`;
            })
            .join("\n        ");
          return `<div class="family">
        <div class="family-head"><span class="family-name">${fam}</span><span class="family-hue">H ${hue}°</span></div>
        <div class="ramp">
        ${swatches}
        </div>
      </div>`;
        })
        .join("\n      ")}
    </div>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/colors.html"), html);
console.log("wrote docs/colors.html");
