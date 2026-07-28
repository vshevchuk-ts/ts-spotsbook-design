// Regenerates docs/mobile-betslip.html — the first page of the "Designs" section
// (product prototypes for real app tasks, as opposed to the DS component docs).
//
// This is a SCREEN prototype assembled STRICTLY from the real design-system
// components (tools/lib/components/*): each selection is a real Bet card, the
// footer totals are the real Summary rows, the stake field is the real Input
// (--action, with the real Max Button), the odds are the real Odds component, the
// LIVE pill is the real Badge, Place bet / Clear all / quick-bet are real Buttons.
// The screen adds ONLY layout scaffolding (the phone frame + header/tabs/list/
// footer arrangement) — that arrangement is the prototype's job, not a component.
// Every colour still resolves to a --tok-* var; layout dims are literal px.
// Run: node tools/build-mobile-betslip-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";
import { createCtx } from "./lib/resolve.mjs";
import * as BetCard from "./lib/components/bet-card.mjs";
import * as Badge from "./lib/components/badge.mjs";
import * as Odds from "./lib/components/odds.mjs";
import * as Input from "./lib/components/input.mjs";
import * as Button from "./lib/components/button.mjs";
import * as Summary from "./lib/components/summary.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const ctx = createCtx(["bet-card", "input", "badge", "tooltip", "odds", "button", "summary"]);
const { resolve, px, cv, renderRootVars } = ctx;

// ---- colours: union of every embedded component's colorPaths + the screen's own
// chrome roles (header / tabs / list / footer scaffolding). ----
const screenOwnPaths = [
  "surface.page", "surface.card", "surface.raised",
  "outline.default", "outline.active",
  "text.default", "text.secondary", "text.forActiveBg",
  "fill.active", "fill.neutralHover",
  "icon.secondary", "icon.active",
];
const colorPaths = [...new Set([
  ...screenOwnPaths,
  ...BetCard.colorPaths,
  ...Badge.colorPaths(ctx),
  ...Odds.colorPaths,
  ...Input.colorPaths,
  ...Button.colorPaths(ctx),
  ...Summary.colorPaths,
])];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const oddsLoopMs = Odds.durationMs(ctx) + 2000;

// ---- inline icons (stripped to currentColor) ----
const icon = (name) => fs.readFileSync(path.join(root, `assets/icons/ui/${name}.svg`), "utf8").replace(/\n/g, "");
const disc = (name) => fs.readFileSync(path.join(root, `assets/icons/sports/${name}.svg`), "utf8").replace(/\n/g, "");
const iClose = icon("close");
const iDeleteAll = icon("delete-all").replace("<svg ", '<svg class="btn__icon" ');
const iQuickBet = icon("quick-bet").replace("<svg ", '<svg class="btn__icon" ');
const iInfo = icon("info-outline");

// ---- the screen stylesheet: rootVars + real component CSS + layout scaffolding ----
const componentCss = [
  BetCard.css(ctx),   // .betcard (compact selection cards)
  Badge.css(ctx),     // .badge (LIVE pill + the count pill)
  Odds.css(ctx),      // .odds (per-selection + total odds)
  Input.css(ctx),     // .input (stake field, --action + Max)
  Button.css(ctx),    // .btn (Place bet twoRow-primary, Clear-all ghost, quick-bet round, Max twoRow-secondary)
  Summary.css(ctx),   // .summary rows (footer totals)
].join("\n\n");

const css = `${rootVars}

${componentCss}

/* ===== screen scaffolding (layout only — arrangement of the real components) ===== */
.bs { font-family: ${cv("family.sans")}; background: ${cv("surface.page")}; color: ${cv("text.default")}; width: 100%; display: flex; flex-direction: column; height: 100%; }

/* header */
.bs__head { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 12px; }
.bs__title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; }
.bs__head .btn--ghost { padding: 0 8px; }

/* bet-type tabs (screen chrome — underline strip; not yet a DS component) */
.bs__tabs { display: flex; gap: 4px; padding: 0 16px; border-bottom: 1px solid ${cv("outline.default")}; }
.bs__tab { position: relative; flex: 1; text-align: center; padding: 10px 4px 12px; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; color: ${cv("text.secondary")}; }
.bs__tab .n { color: ${cv("text.secondary")}; font-weight: 700; }
.bs__tab.is-active { color: ${cv("text.default")}; }
.bs__tab.is-active::after { content: ""; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px; border-radius: 2px; background: ${cv("outline.active")}; }

/* scrolling selection list — a column of real Bet cards */
.bs__list { flex: 1; overflow-y: auto; padding: 12px 16px 8px; display: flex; flex-direction: column; gap: 10px; }
.bs__list .betcard { background: ${cv("surface.card")}; }

/* sticky footer — stake row (real Input + quick-bet) + real Summary rows + Place bet */
.bs__foot { border-top: 1px solid ${cv("outline.default")}; background: ${cv("surface.card")}; padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; }
.bs__stake { display: flex; align-items: center; gap: 8px; }
.bs__stake .input { flex: 1; }
.bs__foot .summary { gap: 6px; }
.bs__place { width: 100%; }`;

// ---- markup, composed from the real component modules ----
const oddsEl = (v, dir, prev) =>
  dir
    ? `<span class="odds odds--${dir}" data-dir="${dir}"><span class="odds__value">${v}</span><span class="odds__prev">${prev}</span></span>`
    : `<span class="odds"><span class="odds__value">${v}</span></span>`;

const picks = [
  { sport: "football", event: "Arsenal — Chelsea", badges: ["live"], market: "Match Result — 1X2", outcome: "Arsenal to win", odds: "2.10", dir: "up", prev: "1.95" },
  { sport: "football", event: "Real Madrid — Sevilla", badges: [], market: "Total Goals", outcome: "Over 2.5 goals", odds: "1.72" },
  { sport: "tennis", event: "Alcaraz — Sinner", badges: [], market: "Match Winner", outcome: "C. Alcaraz", odds: "2.33" },
];

const pickCard = (p) =>
  BetCard.compactCard({
    event: p.event,
    badges: p.badges,
    market: p.market,
    outcome: p.outcome,
    oddsHtml: oddsEl(p.odds, p.dir, p.prev),
    icons: { sport: disc(p.sport), close: iClose },
  });

// header count = the real Badge (active solid pill)
const countBadge = `<span class="badge badge--sm badge--role-active badge--solid">${picks.length}</span>`;
// Clear all = the real Button (ghost, sm)
const clearBtn = `<button class="btn btn--ghost btn--sm">${iDeleteAll} Clear all</button>`;
// stake field = the real Input (lg / --action) with the real Max Button inside
const stakeField = Input.actionMarkup("lg", { label: "Stake", value: "20.00", prefix: "$", max: { top: "Max", bottom: "$1,000.50" } });
// quick-bet = the real Button (round / filled-neutral)
const quickBet = `<button class="btn btn--round btn--round-base btn--filled-neutral" aria-label="Quick bet">${iQuickBet}</button>`;
// Place bet = the real Button (twoRow / primary), full width
const placeBtn = `<button class="btn btn--primary btn--tworow bs__place"><span class="btn__top">Place bet</span><span class="btn__bottom">Win $168.40</span></button>`;

const betslip = `
      <div class="bs">
        <div class="bs__head">
          <div class="bs__title">Betslip ${countBadge}</div>
          ${clearBtn}
        </div>

        <div class="bs__tabs">
          <button class="bs__tab">Single</button>
          <button class="bs__tab is-active">Multi <span class="n">×3</span></button>
          <button class="bs__tab">System</button>
        </div>

        <div class="bs__list">
          ${picks.map(pickCard).join("\n")}
        </div>

        <div class="bs__foot">
          <div class="bs__stake">
            ${stakeField}
            ${quickBet}
          </div>

          <div class="summary">
            ${Summary.row("Total odds", Summary.oddsMove("8.42", "7.90"))}
            ${Summary.row("Total stake", "$20.00")}
            ${Summary.row("Potential win", "$168.40", { win: true }, iInfo)}
          </div>

          ${placeBtn}
        </div>
      </div>`;

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Mobile betslip</title>
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
  main { flex: 1; padding: 4rem 4rem 6rem; max-width: 1120px; }

  h1 { font-size: 36px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.02em; }
  .sub { font-size: 14px; color: var(--text-secondary); margin: 0 0 2.5rem; max-width: 70ch; line-height: 1.6; }

  .stage { display: flex; gap: 48px; align-items: flex-start; flex-wrap: wrap; }
  .phone { width: 390px; height: 780px; flex-shrink: 0; border-radius: 44px; padding: 12px; background: #050506; box-shadow: 0 30px 70px -20px rgba(0,0,0,0.6), 0 0 0 1px var(--border); }
  .phone__screen { position: relative; width: 100%; height: 100%; border-radius: 33px; overflow: hidden; background: #000; }
  .phone__notch { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 120px; height: 26px; border-radius: 14px; background: #050506; z-index: 5; }
  .phone__inner { position: absolute; inset: 0; padding-top: 44px; display: flex; }

  .notes { max-width: 360px; }
  .notes h2 { font-size: 15px; font-weight: 600; margin: 0 0 10px; }
  .notes ul { margin: 0 0 1.75rem; padding-left: 18px; }
  .notes li { font-size: 13px; color: var(--text-secondary); line-height: 1.65; margin-bottom: 6px; }
  .notes li b { color: var(--text-primary); font-weight: 600; }
  code.tok { font-family: var(--mono); font-size: 12px; color: var(--accent); }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("mobile-betslip")}
  </nav>
  <main>
    <h1>Mobile betslip</h1>
    <p class="sub">A multi (combo) betslip for the mobile app, assembled <b>strictly from the real design-system components</b> — not a redrawn lookalike. Each selection is the real <a href="bet-card.html">Bet card</a>; the footer totals are the real <a href="summary.html">Summary</a> rows; the stake field is the real <a href="input.html">Input</a> with the real Max <a href="button.html">Button</a>; the odds are the real <a href="odds.html">Odds</a>; the LIVE and count pills are the real <a href="badge.html">Badge</a>. The screen adds only layout scaffolding — that arrangement is the prototype's job.</p>

    <div class="stage">
      <div class="phone">
        <div class="phone__screen">
          <div class="phone__notch"></div>
          <div class="phone__inner">
            ${betslip}
          </div>
        </div>
      </div>

      <div class="notes">
        <h2>Which component is which</h2>
        <ul>
          <li><b>Count pill "3"</b> — Badge <code class="tok">role-active / solid</code>.</li>
          <li><b>Clear all</b> — Button <code class="tok">ghost / sm</code> (icon + label).</li>
          <li><b>Selection cards</b> — Bet card <code class="tok">--compact</code> (sport icon · event · LIVE Badge · remove × · market · outcome + Odds). The first has a live up-movement (flashes green, struck-through prev, count-up).</li>
          <li><b>Stake field</b> — Input <code class="tok">lg / --action</code> with the real Max Button (twoRow / secondary) inside.</li>
          <li><b>Quick-bet bolt</b> — Button <code class="tok">round / filled-neutral</code>.</li>
          <li><b>Total odds / stake / win</b> — Summary rows; total odds is the Odds component (movement), win row in <code class="tok">text.positive</code>.</li>
          <li><b>Place bet</b> — Button <code class="tok">twoRow / primary</code>, full-width.</li>
        </ul>
        <h2>Screen chrome (not components)</h2>
        <ul>
          <li><b>Bet-type tabs</b> — a thin underline strip; Tabs isn't extracted as a component yet.</li>
          <li><b>Phone frame + header/list/footer layout</b> — prototype scaffolding.</li>
        </ul>
        <h2>Open</h2>
        <ul>
          <li>Single-mode per-selection stake (Bet card <code class="tok">--amount</code>).</li>
          <li>Suspended / error selection states.</li>
          <li>Freebet toggle & bonus rows.</li>
        </ul>
      </div>
    </div>
  </main>
</div>
<script>
${Odds.script(ctx, { loopMs: oddsLoopMs })}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/mobile-betslip.html"), html);
console.log("wrote docs/mobile-betslip.html");
