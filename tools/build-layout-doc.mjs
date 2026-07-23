// Regenerates docs/layout.html from tokens/primitives/dimension.tokens.json,
// radius.tokens.json, z-index.tokens.json, shadow.tokens.json.
// Run: node tools/build-layout-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const spacing = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/dimension.tokens.json"))).spacing;
const radius = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/radius.tokens.json"))).radius;
const z = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/z-index.tokens.json"))).z;
const elevation = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/elevation.tokens.json"))).elevation;

function resolveDim(ref) {
  const key = ref.replace(/[{}]/g, "").split(".")[1];
  return spacing[key].$value;
}
function px(d) {
  return `${d.value}${d.unit}`;
}

// JS/JSON object keys that look like array indices ("0","1",…"96") always
// sort numerically ahead of non-integer-like keys ("0_5","max") regardless of
// insertion order — a quirk of the spec, not something worth fighting in the
// source file. Sort explicitly by resolved px value for display instead of
// trusting object key order (true of the raw token JSON too, not just here).
const spacingRows = Object.entries(spacing)
  .filter(([k]) => !k.startsWith("$"))
  .sort((a, b) => a[1].$value.value - b[1].$value.value);
const radiusRows = Object.entries(radius).filter(([k]) => !k.startsWith("$"));
const zRows = Object.entries(z).filter(([k]) => !k.startsWith("$"));
const elevationRows = Object.entries(elevation).filter(([k]) => !k.startsWith("$"));
function shadowCss(v) {
  const px2 = (d) => `${d.value}${d.unit}`;
  return `${px2(v.offsetX)} ${px2(v.offsetY)} ${px2(v.blur)} ${px2(v.spread)} ${v.color}`;
}

const spacingLegend = [
  ["0_5 (2px)", "Hairline gaps — icon-to-text micro adjustments."],
  ["1 – 1_5 (4–6px)", "Tight inline spacing — icon-to-label inside a compact control."],
  ["2 (8px)", "The base gap — the single most-used spacing value in the whole scale: default gap between buttons, cards, form fields; standard icon-to-label spacing."],
  ["3 – 4 (12–16px)", "Comfortable padding — card/input padding, gap between closely related elements."],
  ["5 – 6 (20–24px)", "Gap between distinct components within a group or section."],
  ["7 – 12 (28–48px)", "Section spacing — gaps between grouped components, major content blocks."],
  ["14+ (56px+)", "Page-level layout gaps, major section breaks."],
  ["max (999px)", "Sentinel only, used by radius-full. Not a general-purpose \"big number\" — see the Radius legend below for why."],
];

const zContext = {
  base: "Base",
  raised: "Base — slightly raised elements",
  sticky: "Base — in-content sticky, stays below the page header",
  header: "Base — the page's global header",
  dropdown: "Floating on page — no drawer/modal open",
  popover: "Floating on page",
  tooltip: "Floating on page",
  "drawer-overlay": "Drawer — backdrop",
  drawer: "Drawer — panel",
  "drawer-floating": "Drawer — dropdown/tooltip mounted inside an open Drawer",
  "modal-overlay": "Modal L1 — backdrop",
  modal: "Modal L1 — panel",
  "modal-floating": "Modal L1 — dropdown/tooltip mounted inside an open Modal",
  "modal-overlay-2": "Modal L2 — backdrop (a modal opened from within a modal)",
  "modal-2": "Modal L2 — panel",
  "modal-floating-2": "Modal L2 — dropdown/tooltip mounted inside an open L2 modal",
  toast: "Global — always on top, over any open drawer/modal",
};

const radiusLegend = [
  ["none", "Square corners — rare; e.g. table cells inside a card that must sit flush against the edge."],
  ["xxs / xs", "Tight controls: checkboxes, small chips, tag pill corner easing."],
  ["sm", "Inputs, small buttons."],
  ["default (8px)", "The base grid unit — go-to radius for ordinary controls (buttons, inputs, cards) unless a component calls for a named size."],
  ["md / lg", "Cards, panels, dropdown menus."],
  ["xl", "Prominent surfaces: modals, large panels, hero cards."],
  ["full", "Pills, circular icon buttons, counters — guaranteed round regardless of element size (border-radius clamps to 50% of the box)."],
];

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — layout</title>
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
  main { flex: 1; padding: 3rem 3rem 4rem; max-width: 1080px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  .sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 2rem; }
  h2.section { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin: 2.5rem 0 0.9rem; }
  h3.sub-section { font-size: 15px; font-weight: 600; margin: 2rem 0 0.8rem; }
  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 12px 16px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1rem; }
  .legend .row { display: flex; gap: 14px; padding: 5px 0; border-bottom: 0.5px solid var(--border); }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 150px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  table.scale { border-collapse: collapse; width: 100%; font-size: 13px; }
  table.scale th, table.scale td { text-align: left; padding: 6px 12px 6px 0; border-bottom: 0.5px solid var(--border); font-variant-numeric: tabular-nums; vertical-align: top; }
  table.scale th { color: var(--text-secondary); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
  code.tok { font-family: var(--mono); font-size: 12px; color: var(--accent); }
  .swatch-row { display: flex; align-items: center; gap: 10px; }
  .dim-bar { height: 8px; background: var(--accent); border-radius: 2px; }
  .radius-box { width: 72px; height: 72px; background: var(--accent-bg); border: 1.5px solid var(--accent); flex-shrink: 0; }
  .shadow-box { width: 72px; height: 44px; background: var(--bg-card); border-radius: 8px; flex-shrink: 0; margin: 8px; }
  .ctx { color: var(--text-secondary); font-size: 12px; white-space: nowrap; }
  .table-wrap { overflow-x: auto; }
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("layout")}
  </nav>
  <main>
    <h1>Layout — spacing, radius, z-index</h1>
    <p class="sub">tokens/primitives/dimension.tokens.json + radius.tokens.json + z-index.tokens.json · generated</p>

    <h3 class="sub-section">Spacing</h3>
    <div class="legend">
      ${spacingLegend.map(([k, v]) => `<div class="row"><b>${k}</b><span>${v}</span></div>`).join("\n      ")}
    </div>
    <table class="scale">
      <tr><th>Token</th><th>Value</th><th style="width:40%">Preview</th></tr>
      ${spacingRows
        .map(([k, v]) => {
          const d = v.$value;
          const barWidth = Math.min(d.value, 240);
          return `<tr><td><code class="tok">--spacing-${k}</code></td><td>${px(d)}</td><td><div class="dim-bar" style="width:${barWidth}px"></div></td></tr>`;
        })
        .join("\n      ")}
    </table>

    <h3 class="sub-section">Radius</h3>
    <div class="legend">
      ${radiusLegend.map(([k, v]) => `<div class="row"><b>${k}</b><span>${v}</span></div>`).join("\n      ")}
    </div>
    <table class="scale">
      <tr><th>Token</th><th>Aliases</th><th>Value</th><th>Preview</th></tr>
      ${radiusRows
        .map(([k, v]) => {
          const d = resolveDim(v.$value);
          return `<tr><td><code class="tok">--radius-${k}</code></td><td class="ctx">${v.$value}</td><td>${px(d)}</td><td><div class="radius-box" style="border-radius:${d.value}px"></div></td></tr>`;
        })
        .join("\n      ")}
    </table>

    <h3 class="sub-section">Z-index</h3>
    <div class="legend">
      <div class="row"><b>Not one flat scale</b><span>Floating UI (dropdown/popover/tooltip) picks whichever tier's "-floating" (or base) token matches the topmost context it's currently mounted inside — page, drawer, modal level 1, or modal level 2 — rather than carrying one fixed value. See each row's context below.</span></div>
    </div>
    <div class="table-wrap">
    <table class="scale">
      <tr><th>Token</th><th>Value</th><th>Context</th></tr>
      ${zRows.map(([k, v]) => `<tr><td><code class="tok">--z-${k}</code></td><td>${v.$value}</td><td class="ctx">${zContext[k] || ""}</td></tr>`).join("\n      ")}
    </table>
    </div>

    <h3 class="sub-section">Elevation</h3>
    <div class="legend">
      <div class="row"><b>Floating UI only</b><span>Composite box-shadows for Tooltip/Popover/Drawer/Modal/Menu/Listbox only — every other surface (Input/Select/Search fields, Card) separates with an outline hairline, never a shadow. Colour is the page colour (surface-0) at raised alpha for the dark theme. The shadow.* semantic group is a separate thing (just shadow colours); this is the geometry.</span></div>
    </div>
    <div class="table-wrap">
    <table class="scale">
      <tr><th>Token</th><th>Used by</th><th>CSS</th><th>Preview</th></tr>
      ${elevationRows
        .map(([k, v]) => {
          const used = { sm: "Tooltip, Popover", md: "Drawer", lg: "Modal" }[k] || "";
          return `<tr><td><code class="tok">--elevation-${k}</code></td><td class="ctx">${used}</td><td class="ctx">${shadowCss(v.$value)}</td><td><div class="shadow-box" style="box-shadow:${shadowCss(v.$value)}"></div></td></tr>`;
        })
        .join("\n      ")}
    </table>
    </div>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/layout.html"), html);
console.log("wrote docs/layout.html");
