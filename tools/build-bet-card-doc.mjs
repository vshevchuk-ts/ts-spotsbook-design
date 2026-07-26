// Regenerates docs/bet-card.html from tokens/components/bet-card.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// The betslip selection card — one bet (event + market + outcome + odds), the
// core repeating block of the betslip. Two densities off one anatomy: `compact`
// (Combo/System — odds inline right of the outcome) and `amount` (Single — a
// Bet-amount field right of the outcome column). Colours become --tok-* CSS
// custom properties, never literal hex; the generated <style> block IS the code
// shown in the "CSS" section (one source, preview and snippet can't drift).
// First pass: static, no odds movement / badges / suspended-error states.
// Run: node tools/build-bet-card-doc.mjs
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
const bc = load("tokens/components/bet-card.tokens.json").component.betCard;

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

// ---- colours this page uses, emitted as :root --tok-* vars ----
const colorPaths = [
  "surface.card", "surface.page",
  "outline.default", "outline.active",
  "text.default", "text.secondary",
  "icon.secondary", "icon.warning",
  "lighten.2",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

// ---- dimensions & type (resolved from tokens) ----
const radius = px(resolve(bc.radius.$value));
const padding = px(resolve(bc.padding.$value));
const sectionGap = px(resolve(bc.sectionGap.$value));
const lineGap = px(resolve(bc.lineGap.$value));
const headerGap = px(resolve(bc.header.gap.$value));
const iconSize = px(resolve(bc.header.icon.size.$value));
const removeBox = px(resolve(bc.header.remove.box.$value));
const removeIcon = px(resolve(bc.header.remove.iconSize.$value));
const removeRadius = px(resolve(bc.header.remove.radius.$value));
const infoSize = px(resolve(bc.market.info.size.$value));
const amtRadius = px(resolve(bc.amount.radius.$value));
const amtPadX = px(resolve(bc.amount.paddingX.$value));
const amtPadY = px(resolve(bc.amount.paddingY.$value));

// typography → CSS. `text-style.*` refs can carry a textDecoration in
// $extensions that resolveToken() drops, so read it straight off the node.
function typoOf(node) {
  const t = resolveToken(node);
  let css = `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
  const ref = node.$value;
  if (typeof ref === "string" && ref.startsWith("{")) {
    const ext = get(ref).$extensions?.["turbo.sportsbook/text"];
    if (ext?.textDecoration) css += ` text-decoration: ${ext.textDecoration};`;
    if (ext?.textTransform) css += ` text-transform: ${ext.textTransform};`;
  }
  return css;
}
const eventType = typoOf(bc.header.event.type);
const marketType = typoOf(bc.market.type);
const outcomeType = typoOf(bc.outcome.type);
const oddsType = typoOf(bc.odds.type);
const amtLabelType = typoOf(bc.amount.labelType);
const amtValueType = typoOf(bc.amount.valueType);

// ---- the stylesheet — printed as code AND used to render the live previews ----
const css = `${rootVars}

.betcard { box-sizing: border-box; background: ${cv("surface.card")}; border: 1px solid ${cv("outline.default")}; border-radius: ${radius}; padding: ${padding}; font-family: ${cv("family.sans")}; }
.betcard * { box-sizing: border-box; }

/* header: leading discipline icon · event link · remove × */
.betcard__header { display: flex; align-items: center; gap: ${headerGap}; }
.betcard__icon { width: ${iconSize}; height: ${iconSize}; flex-shrink: 0; color: ${cv("icon.secondary")}; }
.betcard__icon svg { display: block; width: 100%; height: 100%; }
.betcard__event { flex: 1; min-width: 0; color: ${cv("text.secondary")}; ${eventType} white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: none; border: none; padding: 0; text-align: left; cursor: pointer; font-family: inherit; }
.betcard__remove { flex-shrink: 0; width: ${removeBox}; height: ${removeBox}; display: inline-grid; place-items: center; padding: 0; border: none; background: none; border-radius: ${removeRadius}; color: ${cv("icon.secondary")}; cursor: pointer; }
.betcard__remove:hover { background: ${cv("lighten.2")}; color: ${cv("text.default")}; }
.betcard__remove svg { width: ${removeIcon}; height: ${removeIcon}; }

/* market line (+ optional settlement-rules info icon) */
.betcard__market { display: flex; align-items: center; gap: ${lineGap}; color: ${cv("text.secondary")}; ${marketType} }
.betcard__market-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.betcard__info { flex-shrink: 0; width: ${infoSize}; height: ${infoSize}; color: ${cv("icon.warning")}; }

/* outcome + odds */
.betcard__outcome { color: ${cv("text.default")}; ${outcomeType} }
.betcard__odds { color: ${cv("text.default")}; ${oddsType} font-variant-numeric: tabular-nums; white-space: nowrap; }

/* --- compact density (Combo / System): odds inline, no stake field --- */
.betcard--compact .betcard__market { margin-top: ${sectionGap}; }
.betcard--compact .betcard__line { display: flex; align-items: baseline; justify-content: space-between; gap: ${px(resolve("spacing.3"))}; margin-top: ${lineGap}; }

/* --- amount density (Single): outcome column + Bet-amount field --- */
.betcard--amount .betcard__body { display: flex; gap: ${px(resolve("spacing.3"))}; margin-top: ${sectionGap}; }
.betcard--amount .betcard__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: ${lineGap}; }
.betcard__amount { flex-shrink: 0; width: 150px; display: flex; flex-direction: column; justify-content: center; gap: 2px; background: ${cv("surface.page")}; border: 1px solid ${cv("outline.default")}; border-radius: ${amtRadius}; padding: ${amtPadY} ${amtPadX}; }
.betcard__amount:focus-within { border-color: ${cv("outline.active")}; }
.betcard__amount-label { color: ${cv("text.secondary")}; ${amtLabelType} }
.betcard__amount-input { width: 100%; background: none; border: none; outline: none; color: ${cv("text.default")}; ${amtValueType} font-variant-numeric: tabular-nums; font-family: inherit; }
.betcard__amount-input::placeholder { color: ${cv("text.secondary")}; font-weight: 400; }`;

// ---- inline icons (currentColor) ----
const iClose = fs.readFileSync(path.join(root, "assets/icons/ui/close.svg"), "utf8").replace(/\n/g, "");
const iInfo = fs.readFileSync(path.join(root, "assets/icons/ui/info-outline.svg"), "utf8").replace(/\n/g, "");
const disc = (name) => fs.readFileSync(path.join(root, `assets/icons/sports/${name}.svg`), "utf8").replace(/\n/g, "");

// ---- markup builders ----
function header(sport, event) {
  return `<div class="betcard__header">
    <span class="betcard__icon">${disc(sport)}</span>
    <button class="betcard__event">${event}</button>
    <button class="betcard__remove" aria-label="Remove selection">${iClose}</button>
  </div>`;
}
function marketLine(market, info) {
  return `<div class="betcard__market">
    ${info ? `<span class="betcard__info">${iInfo}</span>` : ""}
    <span class="betcard__market-name">${market}</span>
  </div>`;
}
function compactCard({ sport, event, market, info, outcome, odds }) {
  return `<div class="betcard betcard--compact">
  ${header(sport, event)}
  ${marketLine(market, info)}
  <div class="betcard__line">
    <span class="betcard__outcome">${outcome}</span>
    <span class="betcard__odds">${odds}</span>
  </div>
</div>`;
}
function amountCard({ sport, event, market, info, outcome, odds, amount }) {
  return `<div class="betcard betcard--amount">
  ${header(sport, event)}
  <div class="betcard__body">
    <div class="betcard__main">
      ${marketLine(market, info)}
      <span class="betcard__outcome">${outcome}</span>
      <span class="betcard__odds">${odds}</span>
    </div>
    <label class="betcard__amount">
      <span class="betcard__amount-label">Bet amount</span>
      <input class="betcard__amount-input" value="${amount}" inputmode="decimal" aria-label="Bet amount" />
    </label>
  </div>
</div>`;
}
// short, readable code sample (icon path dumps replaced with a comment)
function sampleCode(kind, d) {
  const ic = "<svg><!-- icon --></svg>";
  const hdr = `  <div class="betcard__header">
    <span class="betcard__icon">${ic}</span>
    <button class="betcard__event">${d.event}</button>
    <button class="betcard__remove" aria-label="Remove selection">${ic}</button>
  </div>`;
  const mkt = `<div class="betcard__market">${d.info ? `\n      <span class="betcard__info">${ic}</span>` : ""}
      <span class="betcard__market-name">${d.market}</span>
    </div>`;
  if (kind === "compact") {
    return `<div class="betcard betcard--compact">
${hdr}
  ${mkt}
  <div class="betcard__line">
    <span class="betcard__outcome">${d.outcome}</span>
    <span class="betcard__odds">${d.odds}</span>
  </div>
</div>`;
  }
  return `<div class="betcard betcard--amount">
${hdr}
  <div class="betcard__body">
    <div class="betcard__main">
      ${mkt}
      <span class="betcard__outcome">${d.outcome}</span>
      <span class="betcard__odds">${d.odds}</span>
    </div>
    <label class="betcard__amount">
      <span class="betcard__amount-label">Bet amount</span>
      <input class="betcard__amount-input" value="${d.amount}" />
    </label>
  </div>
</div>`;
}

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

// sample data
const dCompact = { sport: "football", event: "Fulham - Manchester City", market: "Handicap", info: false, outcome: "Manchester City -5.5", odds: "19.53" };
const dCompactInfo = { sport: "tennis", event: "Cocciaretto Elisabetta - Efstathiou Menelaos", market: "Winner. Set 3. Game 2", info: true, outcome: "Efstathiou Menelaos", odds: "2.83" };
const dAmount = { sport: "cs2", event: "CYBERSHOKE Esports - Inner Circle", market: "Match winner", info: false, outcome: "CYBERSHOKE Esports", odds: "1.84", amount: "$100" };
const dAmountInfo = { sport: "football", event: "Fulham - Manchester City", market: "Handicap market name that is very long", info: true, outcome: "Manchester City -5.5", odds: "19.53", amount: "$100" };

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Bet selection card</title>
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

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 64px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-preview .betcard { width: 100%; max-width: 340px; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("bet-card")}
  </nav>
  <main>
    <h1>Bet selection card</h1>
    <p class="sub">tokens/components/bet-card.tokens.json · the core repeating block of the betslip — one bet: event, market, outcome and odds. Two densities share one anatomy. Generated — the CSS below is resolved from the same tokens driving every preview; colours are <code class="tok">--tok-*</code> custom properties, never literal hex.</p>

    <div class="legend">
      <div class="row"><b>Anatomy</b><span>Header (discipline icon · event link · remove ×) → market name (with an optional settlement-rules info icon) → outcome → odds. Built on <a href="card.html">Card</a>'s surface/border language (surface.card + outline.default) but a dedicated layout.</span></div>
      <div class="row"><b>Densities</b><span><code class="tok">--compact</code> (Combo / System): odds sits inline to the right of the outcome, no stake field. <code class="tok">--amount</code> (Single): a Bet-amount field to the right of the outcome column. Header/market/outcome roles are byte-for-byte the same across both.</span></div>
      <div class="row"><b>Sizing</b><span>radius.md (12px) · 8px padding · 8px header↔body, 4px between market/outcome/odds lines (per Figma). Outcome 14px bold, odds 16px bold — both weight.bold (the odds/team-name strong step), odds a hair larger so the number reads first. Odds use tabular-nums.</span></div>
      <div class="row"><b>Event & remove</b><span>The event is an underlined link (text.secondary, link-sm) — tapping opens the event; it truncates with ellipsis. Remove × is a 24px hit target, icon.secondary, lighten.2 (12% white) on hover.</span></div>
      <div class="row"><b>Settlement info</b><span>The gold info icon (icon.warning) appears only on markets with special settlement rules; tapping it opens the rich tooltip. Plain markets omit it.</span></div>
      <div class="row"><b>Out of this pass</b><span>Odds <em>movement</em> (up/down/changed, struck-through old value) → the separate Odds component. LIVE / FB / BB badges → Badge variants. Suspended (lock) and per-card error strip → card states. The Bet-amount field's ticket-notch silhouette → Input's bet-amount variant. This pass ships the static anatomy the rest hangs off.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">One <code class="tok">:root</code> of colour custom properties, a shared <code class="tok">.betcard</code> base + header/market/outcome/odds elements, then the two density modifiers. Dimensions stay literal px — baked layout per Figma, not runtime-themed the way colours are.</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Compact — Combo / System</h2>
    <p class="section-desc">The dense variant: no per-selection stake (the stake is set once for the whole slip). Odds sits inline to the right of the outcome, baseline-aligned.</p>
    <div class="story-grid">
      ${storyCard("Plain market", compactCard(dCompact), sampleCode("compact", dCompact))}
      ${storyCard("With settlement-rules info", compactCard(dCompactInfo), sampleCode("compact", dCompactInfo), "The event name truncates when it overflows; the gold info icon flags special settlement rules.")}
    </div>

    <h2 class="big-section">With amount — Single</h2>
    <p class="section-desc">Single-bet density: each selection carries its own Bet-amount field, to the right of the outcome column. The field is an inset well (surface.page, darker than the card) with a floating label; focus turns the border to outline.active.</p>
    <div class="story-grid">
      ${storyCard("Bet-amount field", amountCard(dAmount), sampleCode("amount", dAmount))}
      ${storyCard("Long market + info", amountCard(dAmountInfo), sampleCode("amount", dAmountInfo), "Outcome column flexes and truncates; the stake field keeps a fixed width so a column of cards lines up.")}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/bet-card.html"), html);
console.log("wrote docs/bet-card.html");
