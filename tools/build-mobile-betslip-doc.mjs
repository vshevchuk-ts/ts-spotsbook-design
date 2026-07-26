// Regenerates docs/mobile-betslip.html — the first page of the "Designs" section
// (product prototypes for real app tasks, as opposed to the DS component docs).
//
// This is a SCREEN prototype, not a component contract page: it composes a real
// mobile betslip out of the design system. The one hard rule that still applies
// here is the project's colour rule — every colour is resolved from the semantic
// tokens into a `--tok-*` CSS custom property and referenced via var(), never a
// literal hex. Layout dimensions (frame size, paddings, radii) are literal px:
// this is a one-off screen mock, not a re-themeable component with a token API.
// Run: node tools/build-mobile-betslip-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";
import { cssVarName, renderRootVars } from "./lib/css-vars.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const load = (p) => JSON.parse(fs.readFileSync(path.join(root, p)));

const colorPrim = load("tokens/primitives/color.tokens.json").color;
const typo = load("tokens/primitives/typography.tokens.json");
const semantic = load("tokens/semantic/color.tokens.json");

const registry = { color: colorPrim, family: typo.family, ...semantic };
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
  return resolveValue(v);
}
const resolve = (ref) => resolveToken(get(ref));
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;

// ---- semantic colour roles this screen uses, emitted as :root --tok-* vars ----
const colorPaths = [
  "surface.page", "surface.card", "surface.raised", "surface.overlay",
  "fill.active", "fill.activeHover", "fill.neutral", "fill.neutralHover",
  "bg.active", "bg.accent", "bg.positive",
  "outline.default", "outline.strong", "outline.active",
  "text.default", "text.secondary", "text.active", "text.positive", "text.forActiveBg", "text.accent",
  "icon.default", "icon.active", "icon.secondary",
  "label.live",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([
  ...colorPaths.map((p) => [p, colorValue[p]]),
  ["family.sans", `'${fontSans}', sans-serif`],
]);

// ---- inline icons (stripped to currentColor so token colour drives them) ----
const icon = (name) =>
  fs.readFileSync(path.join(root, `assets/icons/ui/${name}.svg`), "utf8").replace(/\n/g, "");
const iClose = icon("close");
const iDeleteAll = icon("delete-all");
const iLive = icon("live");
const iQuickBet = icon("quick-bet");
const iInfo = icon("info-outline");

// ---- the betslip stylesheet (colours via var(--tok-*), layout literal px) ----
const css = `${rootVars}

.bs {
  font-family: ${cv("family.sans")};
  background: ${cv("surface.page")};
  color: ${cv("text.default")};
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* header */
.bs__head { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 12px; }
.bs__title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; }
.bs__count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: ${cv("fill.active")}; color: ${cv("text.forActiveBg")}; font-size: 12px; font-weight: 700; }
.bs__clear { display: inline-flex; align-items: center; gap: 5px; border: none; background: none; cursor: pointer; color: ${cv("icon.secondary")}; font-family: inherit; font-size: 12px; padding: 6px 8px; border-radius: 8px; }
.bs__clear:hover { background: ${cv("fill.neutralHover")}; color: ${cv("text.default")}; }
.bs__clear svg { width: 16px; height: 16px; }

/* bet-type tabs (underline) */
.bs__tabs { display: flex; gap: 4px; padding: 0 16px; border-bottom: 1px solid ${cv("outline.default")}; }
.bs__tab { position: relative; flex: 1; text-align: center; padding: 10px 4px 12px; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; color: ${cv("text.secondary")}; }
.bs__tab .n { color: ${cv("text.secondary")}; font-weight: 700; }
.bs__tab.is-active { color: ${cv("text.default")}; }
.bs__tab.is-active::after { content: ""; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px; border-radius: 2px; background: ${cv("outline.active")}; }

/* scrolling selection list */
.bs__list { flex: 1; overflow-y: auto; padding: 12px 16px 8px; display: flex; flex-direction: column; gap: 10px; }

.pick { background: ${cv("surface.card")}; border: 0.5px solid ${cv("outline.default")}; border-radius: 14px; padding: 12px 14px; }
.pick__top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.pick__live { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px 2px 5px; border-radius: 6px; background: ${cv("bg.accent")}; color: ${cv("text.accent")}; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
.pick__live svg { width: 12px; height: 12px; }
.pick__league { font-size: 11.5px; color: ${cv("text.secondary")}; }
.pick__x { margin-left: auto; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 7px; border: none; background: none; cursor: pointer; color: ${cv("icon.secondary")}; }
.pick__x:hover { background: ${cv("fill.neutralHover")}; color: ${cv("text.default")}; }
.pick__x svg { width: 18px; height: 18px; }
.pick__row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.pick__sel { font-size: 14.5px; font-weight: 600; }
.pick__market { font-size: 12px; color: ${cv("text.secondary")}; margin-top: 2px; }
.pick__match { font-size: 12px; color: ${cv("text.secondary")}; margin-top: 6px; }
.pick__odds { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pick__odds.up { color: ${cv("text.positive")}; }

/* footer summary — sticky combo block */
.bs__foot { border-top: 1px solid ${cv("outline.default")}; background: ${cv("surface.card")}; padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; }
.stake { display: flex; align-items: center; gap: 10px; }
.stake__field { flex: 1; display: flex; align-items: center; gap: 6px; height: 44px; padding: 0 14px; border-radius: 12px; background: ${cv("surface.raised")}; border: 1px solid ${cv("outline.default")}; }
.stake__field:focus-within { border-color: ${cv("outline.active")}; }
.stake__cur { color: ${cv("text.secondary")}; font-size: 15px; }
.stake__input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: ${cv("text.default")}; font-family: inherit; font-size: 16px; font-weight: 600; }
.chips { display: flex; gap: 6px; }
.chip { flex-shrink: 0; padding: 0 12px; height: 44px; border-radius: 12px; background: ${cv("surface.raised")}; border: 1px solid ${cv("outline.default")}; color: ${cv("text.default")}; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.chip:hover { border-color: ${cv("outline.strong")}; }
.chip--bolt { display: inline-flex; align-items: center; justify-content: center; padding: 0; width: 44px; color: ${cv("icon.active")}; }
.chip--bolt svg { width: 18px; height: 18px; }

.summ { display: flex; flex-direction: column; gap: 6px; }
.summ__row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
.summ__row .k { color: ${cv("text.secondary")}; display: inline-flex; align-items: center; gap: 4px; }
.summ__row .k svg { width: 14px; height: 14px; color: ${cv("icon.secondary")}; }
.summ__row .v { font-weight: 600; font-variant-numeric: tabular-nums; }
.summ__row.win .k { color: ${cv("text.default")}; font-weight: 600; font-size: 14px; }
.summ__row.win .v { color: ${cv("text.positive")}; font-weight: 700; font-size: 18px; }

.place { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; width: 100%; height: 54px; border: none; border-radius: 14px; cursor: pointer; font-family: inherit; background: ${cv("fill.active")}; color: ${cv("text.forActiveBg")}; }
.place:hover { background: ${cv("fill.activeHover")}; }
.place__t { font-size: 15px; font-weight: 700; }
.place__s { font-size: 12px; font-weight: 500; opacity: 0.85; }`;

// ---- betslip markup ----
const liveTag = `<span class="pick__live">${iLive} Live</span>`;

const picks = [
  {
    live: true,
    league: "Premier League",
    sel: "Arsenal to win",
    market: "Match Result — 1X2",
    match: "Arsenal — Chelsea",
    odds: "2.10",
    up: true,
  },
  {
    live: false,
    league: "La Liga",
    sel: "Over 2.5 goals",
    market: "Total Goals",
    match: "Real Madrid — Sevilla",
    odds: "1.72",
    up: false,
  },
  {
    live: false,
    league: "NBA",
    sel: "L. Dončić 30+ points",
    market: "Player Props",
    match: "Mavericks — Nuggets",
    odds: "2.33",
    up: false,
  },
];

const pickCard = (p) => `
        <div class="pick">
          <div class="pick__top">
            ${p.live ? liveTag : ""}
            <span class="pick__league">${p.league}</span>
            <button class="pick__x" aria-label="Remove selection">${iClose}</button>
          </div>
          <div class="pick__row">
            <div>
              <div class="pick__sel">${p.sel}</div>
              <div class="pick__market">${p.market}</div>
            </div>
            <div class="pick__odds${p.up ? " up" : ""}">${p.odds}</div>
          </div>
          <div class="pick__match">${p.match}</div>
        </div>`;

const betslip = `
      <div class="bs">
        <div class="bs__head">
          <div class="bs__title">Betslip <span class="bs__count">3</span></div>
          <button class="bs__clear">${iDeleteAll} Clear all</button>
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
          <div class="stake">
            <div class="stake__field">
              <span class="stake__cur">$</span>
              <input class="stake__input" value="20.00" inputmode="decimal" aria-label="Stake" />
            </div>
            <button class="chip">Max</button>
            <button class="chip chip--bolt" aria-label="Quick bet">${iQuickBet}</button>
          </div>

          <div class="summ">
            <div class="summ__row"><span class="k">Total odds</span><span class="v">8.42</span></div>
            <div class="summ__row"><span class="k">Total stake</span><span class="v">$20.00</span></div>
            <div class="summ__row win"><span class="k">Potential win <span aria-hidden="true">${iInfo}</span></span><span class="v">$168.40</span></div>
          </div>

          <button class="place">
            <span class="place__t">Place bet</span>
            <span class="place__s">Win $168.40</span>
          </button>
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

  .notes { max-width: 340px; }
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
    <p class="sub">A multi (combo) betslip for the mobile app — built from the Turbo Sportsbook tokens. Every colour on the screen resolves from <code class="tok">tokens/semantic/color.tokens.json</code> into a <code class="tok">--tok-*</code> variable; nothing is a literal hex. This is a screen prototype for the betslip task, not a component contract — iterate on it here before it goes into the app.</p>

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
        <h2>What's on the screen</h2>
        <ul>
          <li><b>Header</b> — title + live selection count (<code class="tok">fill.active</code> pill), Clear all.</li>
          <li><b>Bet-type tabs</b> — Single / Multi / System, underline style with <code class="tok">outline.active</code>.</li>
          <li><b>Selection cards</b> — <code class="tok">surface.card</code> on <code class="tok">surface.page</code>; live tag uses the accent tint (<code class="tok">bg.accent</code> / <code class="tok">text.accent</code>); odds that drifted up show in <code class="tok">text.positive</code>.</li>
          <li><b>Footer</b> — sticky combo block: stake field + quick chips (Max, quick-bet bolt), total odds / stake, potential win in <code class="tok">text.positive</code>, and the Place bet two-row primary button.</li>
        </ul>
        <h2>Open questions</h2>
        <ul>
          <li>Per-selection stake in Single mode — separate layout, not built yet.</li>
          <li>Errors / suspended markets (<code class="tok">outline.negative</code>, lock icon) — to add.</li>
          <li>Freebet toggle & bonus rows in the summary.</li>
        </ul>
      </div>
    </div>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/mobile-betslip.html"), html);
console.log("wrote docs/mobile-betslip.html");
