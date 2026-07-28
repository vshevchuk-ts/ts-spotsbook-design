// Regenerates docs/summary.html from tokens/components/summary.tokens.json.
// The betslip footer totals — a key-value row list, plus the three footer layouts
// (Single / Combo / System) composed from the real components: the stake field is
// Input (lg) + a Max chip, the System-Combination is Select (lg), total-odds is the
// Odds component, and the rows are Summary's own. Colours become --tok-* vars; the
// generated <style> IS the printed "CSS". Run: node tools/build-summary-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";
import { createCtx } from "./lib/resolve.mjs";
import * as Input from "./lib/components/input.mjs";
import * as Select from "./lib/components/select.mjs";
import * as Button from "./lib/components/button.mjs";
import * as Odds from "./lib/components/odds.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const ctx = createCtx(["summary", "input", "select", "odds", "button"]);
const { resolve, resolveToken, get, px, cv, cvOf, typoOf, renderRootVars } = ctx;
const summary = ctx.tokens.summary;
const oddsComp = ctx.tokens.odds;
const button = ctx.tokens.button;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// True composition: the stake field, System-Combination select, Max button and
// total-odds are the REAL components (their full CSS from ./lib/components/*),
// not a hand-tailored subset — so every var they reference must be declared.
// colorPaths = Summary's own roles ∪ each embedded component's colorPaths.
const summaryOwnPaths = [
  "surface.page", "surface.raised",
  "outline.strong", "outline.active",
  "text.default", "text.secondary", "text.positive", "text.negative", "text.active",
  "icon.active", "icon.secondary", "icon.default",
  "fill.neutral", // Button secondary fill (Max)
];
const colorPaths = [...new Set([
  ...summaryOwnPaths,
  ...Input.colorPaths,
  ...Select.colorPaths,
  ...Button.colorPaths(ctx),
  ...Odds.colorPaths,
])];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

// ---- summary rows ----
const sGap = px(resolve(summary.gap.$value));
const sBlockGap = px(resolve(summary.blockGap.$value));
const sRowGap = px(resolve(summary.rowGap.$value));
const sLabel = typoOf(summary.label);
const sLabelGap = px(resolve(summary.labelGap.$value));
const sValue = typoOf(summary.value);
const sInfoSize = px(resolve(summary.info.size.$value));
const sTurboIcon = px(resolve(summary.turbo.iconSize.$value));
const sTurboGap = px(resolve(summary.turbo.gap.$value));
const sHint = typoOf(summary.hint.type);

// ---- Odds (total odds movement) — the embedded Odds component owns its CSS/script;
// this page only needs the demo loop cadence for the replay interval. ----
const oddsLoopMs = Odds.durationMs(ctx) + 2000;

const css = `${rootVars}

/* footer container — blocks (stake / select / hint / rows) stacked */
.sum-foot { display: flex; flex-direction: column; gap: ${sBlockGap}; font-family: ${cv("family.sans")}; max-width: 360px; }

/* summary rows (label + value) */
.summary { display: flex; flex-direction: column; gap: ${sGap}; }
.summary__row { display: flex; align-items: baseline; justify-content: space-between; gap: ${sRowGap}; }
.summary__label { display: inline-flex; align-items: center; gap: ${sLabelGap}; color: ${cvOf(summary.labelColor)}; ${sLabel} }
.summary__info { flex-shrink: 0; width: ${sInfoSize}; height: ${sInfoSize}; color: ${cvOf(summary.info.color)}; }
.summary__info svg { display: block; width: 100%; height: 100%; }
.summary__value { color: ${cvOf(summary.valueColor)}; ${sValue} font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.summary__row--win .summary__value { color: ${cvOf(summary.win.valueColor)}; }
.summary__row--turbo .summary__value { display: inline-flex; align-items: center; gap: ${sTurboGap}; color: ${cvOf(summary.turbo.valueColor)}; }
.summary__rocket { flex-shrink: 0; width: ${sTurboIcon}; height: ${sTurboIcon}; color: ${cvOf(summary.turbo.iconColor)}; }
.summary__rocket svg { display: block; width: 100%; height: 100%; }

/* stake field = the real Input component (--action variant: field + trailing Max
   button). The full .input CSS from ./lib/components/input.mjs — byte-identical to
   the Input page, not a hand-tailored subset (true composition). */
${Input.css(ctx)}

/* the Max button IS the real Button component (twoRow / secondary) — the full .btn
   CSS from ./lib/components/button.mjs. */
${Button.css(ctx)}

/* System Combination = the real Select component (lg) — the full .select CSS from
   ./lib/components/select.mjs. */
${Select.css(ctx)}

/* hint line with an inline link */
.sum-hint { color: ${cvOf(summary.hint.color)}; ${sHint} margin: 0; }
.sum-hint a { color: ${cv("text.active")}; text-decoration: underline; }

/* Odds (total-odds movement) — the full .odds CSS from ./lib/components/odds.mjs. */
${Odds.css(ctx)}`;

// ---- icons ----
const iRocket = fs.readFileSync(path.join(root, "assets/icons/ui/turbo-combo.svg"), "utf8").replace(/\n/g, "");
const iInfo = fs.readFileSync(path.join(root, "assets/icons/ui/info-outline.svg"), "utf8").replace(/\n/g, "");
const iChevron = fs.readFileSync(path.join(root, "assets/icons/ui/arrow-down.svg"), "utf8").replace(/\n/g, "").replace("<svg ", '<svg class="select__chevron" ');

// ---- markup helpers ----
function row(label, valueHtml, { win, turbo, info } = {}) {
  const cls = ["summary__row", win ? "summary__row--win" : "", turbo ? "summary__row--turbo" : ""].filter(Boolean).join(" ");
  const lbl = `<span class="summary__label">${label}${info ? `<span class="summary__info">${iInfo}</span>` : ""}</span>`;
  return `<div class="${cls}">${lbl}<span class="summary__value">${valueHtml}</span></div>`;
}
const turboVal = (mult) => `<span class="summary__rocket">${iRocket}</span>${mult}`;
const oddsMove = (value, prev) => `<span class="odds odds--up odds--prev-left" data-dir="up"><span class="odds__value">${value}</span><span class="odds__prev">${prev}</span></span>`;

const maxButton = (max) => `<button class="btn btn--secondary btn--tworow" type="button"><span class="btn__top">Max</span><span class="btn__bottom">${max}</span></button>`;
// Input / lg / --action — empty (placeholder) or populated (floating label + $value), + the Max button.
const stakeEmpty = (label, max) => `<div class="input input--lg input--action">
      <div class="input__stack"><span class="input__placeholder">${label}</span></div>
      ${maxButton(max)}
    </div>`;
const stakeValue = (label, value, max) => `<div class="input input--lg input--action">
      <div class="input__stack"><span class="input__label">${label}</span><span class="input__value"><span class="input__prefix">$</span>${value}</span></div>
      ${maxButton(max)}
    </div>`;
const systemSelect = () => `<div class="select select--lg" role="button" tabindex="0">
      <div class="select__stack"><span class="select__label">System Combination</span><span class="select__value">3/4</span></div>
      ${iChevron}
    </div>`;

const MAX = "$1,000.50";
const footSingle = `<div class="sum-foot">
    ${stakeEmpty("Set amount for all bets", MAX)}
    <div class="summary">
      ${row("Total bet amount", "$500.00")}
      ${row("Possible win", "$1,060.00", { win: true })}
    </div>
  </div>`;
const footCombo = `<div class="sum-foot">
    ${stakeValue("Bet amount", "10", MAX)}
    <p class="sum-hint">Potential max bet $2,717, <a href="#">Deposit Now</a> to bet higher</p>
    <div class="summary">
      ${row("Turbo combo", turboVal("×1.08"), { turbo: true, info: true })}
      ${row("Total odds", oddsMove("270.5", "180.60"))}
      ${row("Possible win", "$1,060.00", { win: true })}
    </div>
  </div>`;
const footSystem = `<div class="sum-foot">
    ${systemSelect()}
    ${stakeValue("Bet amount", "10", MAX)}
    <div class="summary">
      ${row("Total odds", "7.02-10.00", { info: true })}
      ${row("Possible win", "$70.20-100.00", { win: true })}
    </div>
  </div>`;

function storyCard(title, liveHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

const rowsDemo = `<div class="summary" style="max-width:360px;">
      ${row("Total bet amount", "$500.00")}
      ${row("Total odds", "7.02-10.00", { info: true })}
      ${row("Turbo combo", turboVal("×1.08"), { turbo: true, info: true })}
      ${row("Possible win", "$1,060.00", { win: true })}
    </div>`;

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Summary</title>
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
  .sub { font-size: 14px; color: var(--text-secondary); margin: 0 0 2.5rem; max-width: 72ch; line-height: 1.6; }
  h2.big-section { font-size: 24px; font-weight: 700; margin: 5.5rem 0 1.5rem; letter-spacing: -0.01em; padding-top: 2.5rem; border-top: 1px solid var(--border); }
  h2.big-section:first-of-type { margin-top: 3rem; padding-top: 0; border-top: none; }
  .section-desc { font-size: 13.5px; color: var(--text-secondary); margin: -0.5rem 0 1.5rem; max-width: 70ch; line-height: 1.6; }

  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 14px 18px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1rem; line-height: 1.6; }
  .legend .row { display: flex; gap: 14px; padding: 6px 0; border-bottom: 0.5px solid var(--border); }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 150px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  code.tok { font-family: var(--mono); font-size: 12px; color: var(--accent); }

  pre.code { background: var(--code-bg); color: var(--code-text); border-radius: 10px; padding: 16px 18px; margin: 0; overflow-x: auto; font-family: var(--mono); font-size: 12px; line-height: 1.7; }
  pre.code code { font-family: inherit; }

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 22px; display: flex; flex-direction: column; gap: 12px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { padding: 8px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("summary")}
  </nav>
  <main>
    <h1>Summary</h1>
    <p class="sub">tokens/components/summary.tokens.json · the betslip footer totals — a key-value row list, and the three footer layouts (Single / Combo / System) composed from it plus the real Input, Select and Odds components. Generated — colours are <code class="tok">--tok-*</code> custom properties, never literal hex.</p>

    <div class="legend">
      <div class="row"><b>Row</b><span>The reusable part — <code class="tok">.summary__row</code>: label (text.secondary) left, value (bold, tabular-nums) right. <code class="tok">--win</code> = positive/green value; <code class="tok">--turbo</code> = active/orange value with the rocket; an optional info icon on the label opens a <a href="tooltip.html">Tooltip</a>.</span></div>
      <div class="row"><b>Values</b><span>Plain ($500.00), a range (7.02-10.00), or the <a href="odds.html">Odds</a> component (total-odds movement — struck-through old + new, prev-left).</span></div>
      <div class="row"><b>Composed, not restyled</b><span>The stake field is <a href="input.html">Input</a> (lg) with the <strong>Max = the real <a href="button.html">Button</a> (twoRow / secondary)</strong> inside it; the System-Combination is <a href="select.html">Select</a> (lg); total-odds is <a href="odds.html">Odds</a>. Summary owns only the rows; everything else is its own component (real <code class="tok">.btn</code>/<code class="tok">.odds</code> classes, resolved from their token files).</span></div>
      <div class="row"><b>Three footers</b><span>Single (stake-for-all + total/​win) · Combo (stake + max-bet hint + turbo row + total-odds movement + win) · System (System-Combination select + stake + range total-odds/win). The Place-bet button and footer icon buttons are separate.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Rows</h2>
    <p class="section-desc">The building block — default, info (tooltip trigger), turbo (rocket + ×N), win (green).</p>
    <div class="story">
      <div class="story-preview">${rowsDemo}</div>
    </div>

    <h2 class="big-section">Footers</h2>
    <p class="section-desc">The three betslip footers, composed. Total-odds movement replays on a loop (Odds component); in the product the app triggers it per price change.</p>
    <div class="story-grid">
      ${storyCard("Single", footSingle, "Stake once for all bets (Input, empty + Max chip), then Total bet amount and Possible win.")}
      ${storyCard("Combo", footCombo, "Stake + a max-bet hint (Deposit Now link), the turbo-combo multiplier row, total-odds with the boost movement, and Possible win.")}
      ${storyCard("System", footSystem, "A System-Combination Select, the stake, then total-odds and possible-win as ranges — the info icon opens a tooltip explaining why they are ranges.")}
    </div>
  </main>
</div>
<script>
${Odds.script(ctx, { loopMs: oddsLoopMs })}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/summary.html"), html);
console.log("wrote docs/summary.html");
