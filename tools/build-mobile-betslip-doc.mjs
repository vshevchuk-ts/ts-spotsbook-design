// Regenerates docs/mobile-betslip.html — the first page of the "Designs" section
// (product prototypes for real app tasks, as opposed to the DS component docs).
//
// The betslip is a real bottom Drawer (native <dialog>) assembled STRICTLY from
// the design-system components: header count = real Counter, bet-type switcher =
// real underline Tabs (clickable — swaps the card set + footer per tab), each
// selection = real Bet card, footer totals = real Summary rows, stake = real
// Input(--action)+Max Button, System-combination = real Select, odds = real Odds,
// LIVE = real Badge, Place bet = real Button. The only bespoke bits are the
// screen's layout scaffolding (which panel shows which cards) and the editable
// stake <input>. Colours resolve to --tok-* vars; the drawer opens on load and
// via the trigger button. Run: node tools/build-mobile-betslip-doc.mjs
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
import * as Counter from "./lib/components/counter.mjs";
import * as Tabs from "./lib/components/tabs.mjs";
import * as Drawer from "./lib/components/drawer.mjs";
import * as Select from "./lib/components/select.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const ctx = createCtx(["bet-card", "input", "badge", "tooltip", "odds", "button", "summary", "counter", "tabs", "drawer", "select"]);
const { resolve, px, cv, renderRootVars } = ctx;

// ---- colours: union of every embedded component's colorPaths + screen chrome ----
const screenOwnPaths = ["surface.page", "surface.card", "surface.raised", "outline.default", "text.default", "text.secondary"];
const colorPaths = [...new Set([
  ...screenOwnPaths,
  ...BetCard.colorPaths,
  ...Badge.colorPaths(ctx),
  ...Odds.colorPaths,
  ...Input.colorPaths,
  ...Button.colorPaths(ctx),
  ...Summary.colorPaths,
  ...Counter.colorPaths(ctx),
  ...Tabs.colorPaths,
  ...Drawer.colorPaths,
  ...Select.colorPaths,
])];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const oddsLoopMs = Odds.durationMs(ctx) + 2000;

// ---- icons ----
const icon = (name) => fs.readFileSync(path.join(root, `assets/icons/ui/${name}.svg`), "utf8").replace(/\n/g, "");
const disc = (name) => fs.readFileSync(path.join(root, `assets/icons/sports/${name}.svg`), "utf8").replace(/\n/g, "");
const iClose = icon("close");
const iCloseDrawer = icon("close").replace("<svg ", '<svg class="drawer__close-icon" ');
const iDeleteAll = icon("delete-all").replace("<svg ", '<svg class="btn__icon" ');
const iInfo = icon("info-outline");
const iChevron = icon("arrow-down").replace("<svg ", '<svg class="select__chevron" ');

// ---- stylesheet: rootVars + real component CSS + a little screen scaffolding ----
const componentCss = [
  Drawer.css(ctx),    // the bottom sheet container
  Tabs.css(ctx),      // .tabs--underline (bet-type switcher)
  Counter.css(ctx),   // header count pill
  BetCard.css(ctx),   // selection cards (compact + amount)
  Badge.css(ctx),     // LIVE pill
  Odds.css(ctx),      // per-selection + total odds
  Input.css(ctx),     // stake field (--action + Max)
  Button.css(ctx),    // Place bet / Clear all / Max
  Select.css(ctx),    // System-Combination
  Summary.css(ctx),   // footer totals rows
].join("\n\n");

const css = `${rootVars}

${componentCss}

/* ===== screen scaffolding (layout only — arrangement of the real components) ===== */
/* the betslip drawer body sits on the page surface so the raised cards pop */
.bs-drawer .drawer__body { background: ${cv("surface.page")}; display: flex; flex-direction: column; gap: 12px; padding: 12px 16px; }
/* real Counter sits in the drawer title instead of the drawer's built-in pill */
.bs-title { display: inline-flex; align-items: center; gap: 8px; }
/* Clear all lives on the left of the header (the drawer header is centre-aligned) */
.bs-clear { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); }
.bs-clear.btn--ghost { padding: 0 8px; }

/* bet-type tabs — the real underline Tabs, stretched full width */
.bs-tabs { display: flex; }
.bs-tabs .tab { flex: 1; }

/* card panels (only the active tab's panel is shown) */
.bs-panel { display: flex; flex-direction: column; gap: 10px; }
.bs-panel[hidden] { display: none; }

/* footer — the drawer footer, re-flowed to a stacked betslip footer */
.bs-foot { flex-direction: column; align-items: stretch; gap: 12px; }
.bs-foot-panel { display: flex; flex-direction: column; gap: 12px; }
.bs-foot-panel[hidden] { display: none; }
/* the stake field keeps its real Input lg height (48px); in this flex column it
   fills the width via align-items:stretch — NEVER flex-grow, which would stretch
   its height off the token value. */
.bs-foot .input { width: 100%; }
.bs-foot .summary { gap: 6px; }
.bs-place { width: 100%; }`;

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
const icons = (p) => ({ sport: disc(p.sport), close: iClose });

// Multi / System list = compact cards; Single list = amount cards (per-selection stake)
const compactList = picks.map((p) => BetCard.compactCard({ event: p.event, badges: p.badges, market: p.market, outcome: p.outcome, oddsHtml: oddsEl(p.odds, p.dir, p.prev), icons: icons(p) })).join("\n");
const amountList = picks.map((p) => BetCard.amountCard({ event: p.event, badges: p.badges, market: p.market, outcome: p.outcome, oddsHtml: oddsEl(p.odds, p.dir, p.prev), amount: "20", icons: icons(p) })).join("\n");

// footer pieces (real components)
const stakeField = Input.actionMarkup("lg", { label: "Stake", value: "20.00", prefix: "$", max: { top: "Max", bottom: "$1,000.50" } });
const systemSelect = Select.floatedMarkup("lg", iChevron, { label: "System Combination", value: "3/4" });
const placeBtn = (win) => `<button class="btn btn--primary btn--tworow bs-place"><span class="btn__top">Place bet</span><span class="btn__bottom">Win ${win}</span></button>`;

const footMulti = `<div class="bs-foot-panel" data-foot="multi">
        ${stakeField}
        <div class="summary">
          ${Summary.row("Total odds", Summary.oddsMove("8.42", "7.90"))}
          ${Summary.row("Total stake", "$20.00")}
          ${Summary.row("Possible win", "$168.40", { win: true }, iInfo)}
        </div>
        ${placeBtn("$168.40")}
      </div>`;
const footSingle = `<div class="bs-foot-panel" data-foot="single" hidden>
        <div class="summary">
          ${Summary.row("Total stake", "$60.00")}
          ${Summary.row("Possible win", "$402.00", { win: true })}
        </div>
        ${placeBtn("$402.00")}
      </div>`;
const footSystem = `<div class="bs-foot-panel" data-foot="system" hidden>
        ${systemSelect}
        ${stakeField}
        <div class="summary">
          ${Summary.row("Total odds", "7.02–10.00", { info: true }, iInfo)}
          ${Summary.row("Possible win", "$70.20–100.00", { win: true })}
        </div>
        ${placeBtn("$100.00")}
      </div>`;

// header: Clear-all (Button ghost) · centred title + real Counter · close ×
const countPill = Counter.markup("base", "onNeutral", "active", String(picks.length));
const clearBtn = `<button class="btn btn--ghost btn--sm bs-clear">${iDeleteAll} Clear all</button>`;

const drawer = `<dialog class="drawer drawer--bottom bs-drawer" id="betslip-drawer" aria-label="Betslip">
      <div class="drawer__content">
        <div class="drawer__header">
          ${clearBtn}
          <p class="drawer__title bs-title">Betslip ${countPill}</p>
          <form method="dialog"><button class="drawer__close" aria-label="Close">${iCloseDrawer}</button></form>
        </div>

        <div class="drawer__body">
          <div class="tabs tabs--underline tabs--base bs-tabs" role="tablist">
            <button class="tab tab--base" data-tab="single">Single</button>
            <button class="tab tab--base tab--active" data-tab="multi">Multi ×3</button>
            <button class="tab tab--base" data-tab="system">System</button>
          </div>

          <div class="bs-panel" data-panel="single" hidden>
            ${amountList}
          </div>
          <div class="bs-panel" data-panel="multi">
            ${compactList}
          </div>
          <div class="bs-panel" data-panel="system" hidden>
            ${compactList}
          </div>
        </div>

        <div class="drawer__footer bs-foot">
          ${footSingle}
          ${footMulti}
          ${footSystem}
        </div>
      </div>
    </dialog>`;

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
  .open-cta { display: inline-flex; }
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
    <p class="sub">The betslip as a real bottom <a href="drawer.html">Drawer</a>, assembled <b>strictly from the real design-system components</b>. It opens on load; close it (× / Escape / tap outside) and reopen with the button. Switch the <a href="tabs.html">Tabs</a> (Single / Multi / System) to see the different card sets and footers.</p>

    <div class="stage">
      <button class="btn btn--primary btn--base open-cta" data-drawer-open="betslip-drawer">Open betslip</button>

      <div class="notes">
        <h2>Which component is which</h2>
        <ul>
          <li><b>Container</b> — real Drawer (<code class="tok">drawer--bottom</code>, native <code class="tok">&lt;dialog&gt;</code> + backdrop + slide-in).</li>
          <li><b>Count "3"</b> — real Counter (<code class="tok">onNeutral / active</code>) — a rounded pill, not an oval.</li>
          <li><b>Single / Multi / System</b> — real underline Tabs, clickable; each swaps the card set + footer.</li>
          <li><b>Selection cards</b> — Bet card <code class="tok">--compact</code> (Multi / System) and <code class="tok">--amount</code> with a per-selection stake (Single). LIVE = real Badge; odds = real Odds (the first flashes + counts up).</li>
          <li><b>Stake</b> — real Input <code class="tok">lg / --action</code> with the real Max Button inside.</li>
          <li><b>System Combination</b> — real Select <code class="tok">lg</code>.</li>
          <li><b>Total odds / stake / win</b> — Summary rows (total odds = Odds movement).</li>
          <li><b>Place bet</b> — Button <code class="tok">twoRow / primary</code>; Clear all — Button <code class="tok">ghost / sm</code>.</li>
        </ul>
        <h2>Scaffolding (not components)</h2>
        <ul>
          <li>Which panel/footer shows per tab, and the editable stake <code class="tok">&lt;input&gt;</code>.</li>
        </ul>
        <h2>Open</h2>
        <ul>
          <li>Suspended / error selection states; freebet toggle & bonus rows.</li>
        </ul>
      </div>
    </div>

    ${drawer}
  </main>
</div>
<script>
${Odds.script(ctx, { loopMs: oddsLoopMs })}
</script>
<script>
  // Drawer open / light-dismiss (real Drawer component behaviour)
  ${Drawer.script}
  // open on load so the prototype is visible immediately
  var _bs = document.getElementById('betslip-drawer');
  if (_bs && _bs.showModal) _bs.showModal();
  // bet-type tabs → swap the visible card panel + footer
  document.querySelectorAll('.bs-tabs .tab').forEach(function (t) {
    t.addEventListener('click', function () {
      var key = t.getAttribute('data-tab');
      document.querySelectorAll('.bs-tabs .tab').forEach(function (x) { x.classList.toggle('tab--active', x === t); });
      document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== key; });
      document.querySelectorAll('[data-foot]').forEach(function (f) { f.hidden = f.getAttribute('data-foot') !== key; });
    });
  });
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/mobile-betslip.html"), html);
console.log("wrote docs/mobile-betslip.html");
