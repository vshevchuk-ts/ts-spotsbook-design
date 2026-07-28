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
import { cssVarName, renderRootVars } from "./lib/css-vars.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const load = (p) => JSON.parse(fs.readFileSync(path.join(root, p)));

const colorPrim = load("tokens/primitives/color.tokens.json").color;
const dim = load("tokens/primitives/dimension.tokens.json").spacing;
const radiusPrim = load("tokens/primitives/radius.tokens.json").radius;
const typo = load("tokens/primitives/typography.tokens.json");
const textStyle = load("tokens/primitives/text-styles.tokens.json")["text-style"];
const semantic = load("tokens/semantic/color.tokens.json");
const summary = load("tokens/components/summary.tokens.json").component.summary;
const input = load("tokens/components/input.tokens.json").component.input;      // stake field
const select = load("tokens/components/select.tokens.json").component.select;   // system combination
const oddsComp = load("tokens/components/odds.tokens.json").component.odds;      // total odds movement
const button = load("tokens/components/button.tokens.json").component.button;    // Max = Button twoRow-secondary

const registry = {
  color: colorPrim, spacing: dim, radius: radiusPrim,
  family: typo.family, weight: typo.weight, size: typo.size,
  leading: typo.leading, tracking: typo.tracking,
  "text-style": textStyle, ...semantic,
};
function get(ref) { const parts = ref.replace(/[{}]/g, "").split("."); let node = registry; for (const p of parts) node = node[p]; return node; }
function resolveValue(v) { if (typeof v === "string" && v.startsWith("{")) return resolveToken(get(v)); return v; }
function resolveToken(node) {
  const v = node.$value;
  if (v && typeof v === "object" && !("value" in v)) { const out = {}; for (const [k, sub] of Object.entries(v)) out[k] = resolveValue(sub); return out; }
  if (v && typeof v === "object" && "value" in v) return v;
  return resolveValue(v);
}
const resolve = (ref) => resolveToken(get(ref));
const px = (d) => `${d.value}${d.unit}`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;
const cvOf = (node) => cv(node.$value.replace(/[{}]/g, ""));
function typoOf(node) {
  const t = resolveToken(node);
  let css = `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
  const ref = node.$value;
  if (typeof ref === "string" && ref.startsWith("{")) {
    const ext = get(ref).$extensions?.["turbo.sportsbook/text"];
    if (ext?.textDecoration) css += ` text-decoration: ${ext.textDecoration};`;
  }
  return css;
}

const colorPaths = [
  "surface.page", "surface.raised",
  "outline.strong", "outline.active",
  "text.default", "text.secondary", "text.positive", "text.negative", "text.active",
  "icon.active", "icon.secondary", "icon.default",
  "fill.neutral", // Button secondary fill (Max)
];
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

// ---- stake field = Input / lg + a Max chip ----
const inLg = input.size.lg;
const inH = px(resolve(inLg.height.$value));
const inPadX = px(resolve(inLg.paddingX.$value));
const inLabelGap = px(resolve(inLg.labelGap.$value));
const inRadius = px(resolve(input.radius.$value));
const inLabel = typoOf(inLg.label);
const inValue = typoOf(inLg.value);
const inPrefixGap = px(resolve(input.prefix.gap.$value));

// ---- System Combination = Select / lg ----
const selLg = select.size.lg;
const selH = px(resolve(selLg.height.$value));
const selPadX = px(resolve(selLg.paddingX.$value));
const selLabelGap = px(resolve(selLg.labelGap.$value));
const selRadius = px(resolve(select.radius.$value));
const selIcon = px(resolve(selLg.iconSize.$value));
const selLabel = typoOf(selLg.label);
const selValue = typoOf(selLg.value);

// ---- Max = Button / twoRow / secondary (resolved from button.tokens.json) ----
const btnSecFill = cvOf(button.secondary.state.default.fill);
const btnSecLabel = cvOf(button.secondary.state.default.label);
const trGap = px(resolve(button.twoRow.gap.$value));
const trPadX = px(resolve(button.twoRow.paddingX.$value));
const trRadius = px(resolve(button.twoRow.radius.$value));
const trSecH = px(resolve(button.twoRow.secondary.height.$value));
const trTop = typoOf(button.twoRow.secondary.topLabel);
const trBottom = typoOf(button.twoRow.secondary.bottomLabel);
const trBottomColor = cvOf(button.twoRow.secondary.bottomLabelColor);

// ---- Odds (total odds movement) ----
const oddsType = typoOf(oddsComp.type);
const oddsGap = px(resolve(oddsComp.gap.$value));
const oddsDur = px(resolveToken(oddsComp.movement.duration));
const oddsCountMs = resolveToken(oddsComp.movement.countDuration).value;
const oddsLoopMs = resolveToken(oddsComp.movement.duration).value + 2000;

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

/* stake field = Input / lg (surface.page well) + a trailing Max chip */
.sum-stake { display: flex; align-items: center; gap: ${px(resolve("spacing.2"))}; height: ${inH}; padding: 0 ${inPadX}; background: ${cv("surface.page")}; border: 1px solid ${cv("outline.strong")}; border-radius: ${inRadius}; }
.sum-stake:focus-within { border-color: ${cv("outline.active")}; }
.sum-stake__field { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: ${inLabelGap}; }
.sum-stake__label { color: ${cv("text.secondary")}; ${inLabel} }
.sum-stake__value { display: flex; align-items: baseline; gap: ${inPrefixGap}; }
.sum-stake__cur { color: ${cv("text.secondary")}; ${inValue} }
.sum-stake__input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: ${cv("text.default")}; ${inValue} font-variant-numeric: tabular-nums; font-family: inherit; }
.sum-stake__input::placeholder { color: ${cv("text.secondary")}; }
.sum-stake--empty .sum-stake__input { width: 100%; }

/* the Max button IS Button / twoRow / secondary, resolved from button.tokens.json — real .btn classes */
.btn { display: inline-flex; align-items: center; justify-content: center; border: none; cursor: pointer; white-space: nowrap; font-family: ${cv("family.sans")}; }
.btn--secondary { background: ${btnSecFill}; color: ${btnSecLabel}; }
.btn--tworow { flex-direction: column; gap: ${trGap}; padding: 0 ${trPadX}; border-radius: ${trRadius}; line-height: 1.2; }
.btn--tworow.btn--secondary { height: ${trSecH}; }
.btn--tworow.btn--secondary .btn__top { ${trTop} }
.btn--tworow.btn--secondary .btn__bottom { ${trBottom} color: ${trBottomColor}; }

/* System Combination = Select / lg (floating label + value + chevron) */
.sum-select { display: flex; align-items: center; gap: ${px(resolve("spacing.2"))}; height: ${selH}; padding: 0 ${selPadX}; background: ${cv("surface.page")}; border: 1px solid ${cv("outline.strong")}; border-radius: ${selRadius}; cursor: pointer; }
.sum-select__field { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: ${selLabelGap}; }
.sum-select__label { color: ${cv("text.secondary")}; ${selLabel} }
.sum-select__value { color: ${cv("text.default")}; ${selValue} }
.sum-select__chevron { flex-shrink: 0; width: ${selIcon}; height: ${selIcon}; color: ${cvOf(select.state.default.chevron)}; }
.sum-select__chevron svg { display: block; width: 100%; height: 100%; }

/* hint line with an inline link */
.sum-hint { color: ${cvOf(summary.hint.color)}; ${sHint} margin: 0; }
.sum-hint a { color: ${cv("text.active")}; text-decoration: underline; }

/* Odds (total-odds movement), resolved from odds.tokens.json */
.odds { display: inline-flex; align-items: baseline; gap: ${oddsGap}; ${oddsType} font-variant-numeric: tabular-nums; white-space: nowrap; color: ${cvOf(oddsComp.color.default)}; }
.odds__value { color: inherit; }
.odds__prev { color: ${cvOf(oddsComp.prev.color)}; text-decoration: line-through; }
.odds--prev-left .odds__prev { order: -1; }
.odds--up .odds__value { color: ${cvOf(oddsComp.color.up)}; }
.odds--down .odds__value { color: ${cvOf(oddsComp.color.down)}; }
@keyframes odds-up { 0%, 60% { color: ${cvOf(oddsComp.color.up)}; } 100% { color: ${cvOf(oddsComp.color.default)}; } }
@keyframes odds-down { 0%, 60% { color: ${cvOf(oddsComp.color.down)}; } 100% { color: ${cvOf(oddsComp.color.default)}; } }
@keyframes odds-prev-out { 0%, 60% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: no-preference) {
  .odds--up .odds__value { animation: odds-up ${oddsDur} ease forwards; }
  .odds--down .odds__value { animation: odds-down ${oddsDur} ease forwards; }
  .odds--up .odds__prev, .odds--down .odds__prev { animation: odds-prev-out ${oddsDur} ease forwards; }
}`;

// ---- icons ----
const iRocket = fs.readFileSync(path.join(root, "assets/icons/ui/turbo-combo.svg"), "utf8").replace(/\n/g, "");
const iInfo = fs.readFileSync(path.join(root, "assets/icons/ui/info-outline.svg"), "utf8").replace(/\n/g, "");
const iChevron = fs.readFileSync(path.join(root, "assets/icons/ui/arrow-down.svg"), "utf8").replace(/\n/g, "");

// ---- markup helpers ----
function row(label, valueHtml, { win, turbo, info } = {}) {
  const cls = ["summary__row", win ? "summary__row--win" : "", turbo ? "summary__row--turbo" : ""].filter(Boolean).join(" ");
  const lbl = `<span class="summary__label">${label}${info ? `<span class="summary__info">${iInfo}</span>` : ""}</span>`;
  return `<div class="${cls}">${lbl}<span class="summary__value">${valueHtml}</span></div>`;
}
const turboVal = (mult) => `<span class="summary__rocket">${iRocket}</span>${mult}`;
const oddsMove = (value, prev) => `<span class="odds odds--up odds--prev-left" data-dir="up"><span class="odds__value">${value}</span><span class="odds__prev">${prev}</span></span>`;

const stakeEmpty = (label, max) => `<label class="sum-stake sum-stake--empty">
      <span class="sum-stake__field"><input class="sum-stake__input" placeholder="${label}" aria-label="${label}" /></span>
      <button class="btn btn--secondary btn--tworow" type="button"><span class="btn__top">Max</span><span class="btn__bottom">${max}</span></button>
    </label>`;
const stakeValue = (label, value, max) => `<label class="sum-stake">
      <span class="sum-stake__field"><span class="sum-stake__label">${label}</span><span class="sum-stake__value"><span class="sum-stake__cur">$</span><input class="sum-stake__input" value="${value}" aria-label="${label}" /></span></span>
      <button class="btn btn--secondary btn--tworow" type="button"><span class="btn__top">Max</span><span class="btn__bottom">${max}</span></button>
    </label>`;
const systemSelect = () => `<div class="sum-select" role="button" tabindex="0">
      <span class="sum-select__field"><span class="sum-select__label">System Combination</span><span class="sum-select__value">3/4</span></span>
      <span class="sum-select__chevron">${iChevron}</span>
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
  // total-odds movement (Odds component) — loop the flash + count-up for the demo.
  (function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function countUp(el, from, to, ms) {
      var f = parseFloat(from), t = parseFloat(to);
      var dp = ((String(to).split('.')[1]) || '').length;
      if (isNaN(f) || isNaN(t)) { el.textContent = to; return; }
      var start = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - start) / ms);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = (f + (t - f) * e).toFixed(dp);
        if (p < 1) requestAnimationFrame(step); else el.textContent = to;
      })(performance.now());
    }
    function oddsPlay(el) {
      var val = el.querySelector('.odds__value'), prev = el.querySelector('.odds__prev');
      if (!val) return;
      var to = val.getAttribute('data-to') || val.textContent;
      val.setAttribute('data-to', to);
      var dir = el.getAttribute('data-dir');
      el.classList.remove('odds--up', 'odds--down'); void el.offsetWidth;
      if (dir) el.classList.add('odds--' + dir);
      if (!reduce && prev) countUp(val, prev.textContent, to, ${oddsCountMs});
    }
    document.querySelectorAll('.odds[data-dir]').forEach(function (el) {
      oddsPlay(el);
      if (!reduce) setInterval(function () { oddsPlay(el); }, ${oddsLoopMs});
    });
  })();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/summary.html"), html);
console.log("wrote docs/summary.html");
