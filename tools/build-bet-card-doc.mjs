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
const elevationPrim = load("tokens/primitives/elevation.tokens.json").elevation;
const typo = load("tokens/primitives/typography.tokens.json");
const textStyle = load("tokens/primitives/text-styles.tokens.json")["text-style"];
const semantic = load("tokens/semantic/color.tokens.json");
const bc = load("tokens/components/bet-card.tokens.json").component.betCard;
// The Single stake field IS the Input component (lg + currency prefix) — resolve its
// real values here, never restyle, so a bet-card stake field == a standalone Input.
const input = load("tokens/components/input.tokens.json").component.input;
// Header LIVE/BB/FB pills ARE the Badge component (sm / named) — resolve its real
// size + named colours, emit its real classes, never redraw.
const badge = load("tokens/components/badge.tokens.json").component.badge;
// The settlement-info / long-market / long-outcome reveals ARE the Tooltip component
// (hover/focus, surface-6 bubble + caret, pure CSS) — resolve its real values.
const tooltip = load("tokens/components/tooltip.tokens.json").component.tooltip;
// The odds value IS the Odds component (static value + live up/down movement) —
// resolve its real styling/animation, never restyle.
const oddsComp = load("tokens/components/odds.tokens.json").component.odds;

const registry = {
  color: colorPrim,
  spacing: dim,  radius: radiusPrim,  elevation: elevationPrim,
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
// resolve a colour token's ROLE straight from its node — never hardcode a role name.
const cvOf = (node) => cv(node.$value.replace(/[{}]/g, ""));

// ---- colours this page uses, emitted as :root --tok-* vars ----
const colorPaths = [
  "surface.raised", "surface.page", "surface.card",
  "outline.strong", "outline.active", "outline.default",
  "text.default", "text.active", "text.secondary",
  "icon.secondary", "icon.warning",
  "fill.neutralHover",
  // Badge (sm / named live·betbuilder·freebet) header pills
  "bg.active", "bg.accent", "text.accent",
  // Tooltip (info / market / outcome reveals)
  "text.onFill",
  // Odds component (static + up/down movement)
  "text.positive", "text.negative",
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
const badgeGap = px(resolve(bc.header.badgeGap.$value));
const iconSize = px(resolve(bc.header.icon.size.$value));
const removeBox = px(resolve(bc.header.remove.box.$value));
const removeIcon = px(resolve(bc.header.remove.iconSize.$value));
const removeRadius = px(resolve(bc.header.remove.radius.$value));
const infoSize = px(resolve(bc.market.info.size.$value));
const marketGap = px(resolve(bc.market.gap.$value));
// Bet-amount field = Input / lg + prefix — every value below comes from input.tokens.json.
const amtWidth = px(resolve(bc.amount.width.$value)); // bet-card layout: fixed column width
const inLg = input.size.lg;
const amtHeight = px(resolve(inLg.height.$value));
const amtPadX = px(resolve(inLg.paddingX.$value));
const amtLabelGap = px(resolve(inLg.labelGap.$value));
const amtRadius = px(resolve(input.radius.$value));
const amtPrefixGap = px(resolve(input.prefix.gap.$value));
// betbuilder density
const bb = bc.betbuilder;
const bbRadius = px(resolve(bb.innerRadius.$value));
const bbRowPadX = px(resolve(bb.rowPaddingX.$value));
const bbRowPadY = px(resolve(bb.rowPaddingY.$value));
const bbRowGap = px(resolve(bb.rowGap.$value));
// Badge (sm size + named colours), resolved from badge.tokens.json
const badgeSm = badge.size.sm;
const badgeRadius = px(resolve(badge.radius.$value));
const badgeSmH = px(resolve(badgeSm.height.$value));
const badgeSmPadX = px(resolve(badgeSm.paddingX.$value));
const HEADER_BADGES = ["live", "betbuilder", "freebet"];
// Tooltip (surface-6 bubble + caret), resolved from tooltip.tokens.json
const ttRadius = px(resolve(tooltip.radius.$value));
const ttPadX = px(resolve(tooltip.paddingX.$value));
const ttPadY = px(resolve(tooltip.paddingY.$value));
const ttGap = px(resolve(tooltip.gap.$value));
const ttArrow = px(resolve(tooltip.arrowSize.$value));
const ttSh = resolveToken(tooltip.shadow);
const ttShadow = `${px(ttSh.offsetX)} ${px(ttSh.offsetY)} ${px(ttSh.blur)} ${px(ttSh.spread)} ${ttSh.color}`;

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
const outcomeSingleType = typoOf(bc.outcome.singleType);
// Odds component styling (resolved from odds.tokens.json — the card's odds IS this component)
const oddsType = typoOf(oddsComp.type);
const oddsGap = px(resolve(oddsComp.gap.$value));
const oddsDur = px(resolveToken(oddsComp.movement.duration));
const oddsCountMs = resolveToken(oddsComp.movement.countDuration).value;
const oddsLoopMs = resolveToken(oddsComp.movement.duration).value + 2000;
const amtLabelType = typoOf(inLg.label);
const amtValueType = typoOf(inLg.value);
const bbOddLabelType = typoOf(bb.oddLabel.type);
const badgeSmLabel = typoOf(badgeSm.label);
const ttLabel = typoOf(tooltip.label);

// ---- the stylesheet — printed as code AND used to render the live previews ----
const css = `${rootVars}

.betcard { box-sizing: border-box; background: ${cv("surface.raised")}; border-radius: ${radius}; padding: ${padding}; font-family: ${cv("family.sans")}; }
.betcard * { box-sizing: border-box; }

/* header: leading discipline icon · event link · optional LIVE/BB/FB badges · remove ×.
   Event truncates and shrinks; badges sit right after it; × is pushed to the far right. */
.betcard__header { display: flex; align-items: center; gap: ${headerGap}; }
.betcard__icon { width: ${iconSize}; height: ${iconSize}; flex-shrink: 0; color: ${cv("icon.secondary")}; }
.betcard__icon svg { display: block; width: 100%; height: 100%; }
.betcard__event { flex: 0 1 auto; min-width: 0; color: ${cv("text.secondary")}; ${eventType} white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: none; border: none; padding: 0; text-align: left; cursor: pointer; font-family: inherit; }
.betcard__event:hover { color: ${cv("text.active")}; }
.betcard__badges { display: inline-flex; align-items: center; gap: ${badgeGap}; flex-shrink: 0; }
.betcard__badges .badge { flex-shrink: 0; }
.betcard__remove { flex-shrink: 0; margin-left: auto; width: ${removeBox}; height: ${removeBox}; display: inline-grid; place-items: center; padding: 0; border: none; background: none; border-radius: ${removeRadius}; color: ${cvOf(bc.header.remove.color)}; cursor: pointer; }
.betcard__remove:hover { background: ${cvOf(bc.header.remove.hoverFill)}; color: ${cvOf(bc.header.remove.hoverColor)}; }
.betcard__remove svg { width: ${removeIcon}; height: ${removeIcon}; }

/* header LIVE/BB/FB pills = the Badge component (sm / named), resolved from badge.tokens.json — real .badge classes, not a redraw */
.badge { box-sizing: border-box; display: inline-flex; align-items: center; border-radius: ${badgeRadius}; font-family: ${cv("family.sans")}; white-space: nowrap; }
.badge--sm { height: ${badgeSmH}; padding: 0 ${badgeSmPadX}; ${badgeSmLabel} }
${HEADER_BADGES.map((n) => `.badge--named-${n} { background: ${cvOf(badge.named[n].bg)}; color: ${cvOf(badge.named[n].text)}; }`).join("\n")}

/* market line (+ optional settlement-rules info icon) */
.betcard__market { display: flex; align-items: center; gap: ${marketGap}; color: ${cv("text.secondary")}; ${marketType} }
.betcard__market-name { display: block; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.betcard__info { flex-shrink: 0; width: ${infoSize}; height: ${infoSize}; color: ${cv("icon.warning")}; background: none; border: none; padding: 0; display: inline-flex; cursor: pointer; }
.betcard__info svg { display: block; width: 100%; height: 100%; }

/* Tooltip (info settlement · long market · long outcome reveals) = the Tooltip component,
   resolved from tooltip.tokens.json — surface-6 bubble + caret, shown on hover/focus (pure CSS). */
.bc-tt { position: relative; display: flex; align-items: center; min-width: 0; max-width: 100%; }
.bc-tt--grow { flex: 1; }
.bc-tt__trigger { min-width: 0; }
.bc-tt__bubble { position: absolute; left: 50%; bottom: calc(100% + ${ttGap}); transform: translateX(-50%); z-index: 30; width: max-content; max-width: 240px; padding: ${ttPadY} ${ttPadX}; background: ${cvOf(tooltip.bg)}; color: ${cvOf(tooltip.text)}; border-radius: ${ttRadius}; ${ttLabel} white-space: normal; text-align: center; box-shadow: ${ttShadow}; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.12s ease; }
.bc-tt:hover .bc-tt__bubble, .bc-tt:focus-within .bc-tt__bubble { opacity: 1; visibility: visible; }
.bc-tt__arrow { position: absolute; top: 100%; left: 50%; width: ${ttArrow}; height: ${ttArrow}; background: ${cvOf(tooltip.bg)}; transform: translate(-50%, -50%) rotate(45deg); }
.bc-tt__link { color: inherit; text-decoration: underline; }

/* outcome + odds. Outcome weight is density-specific: emphasised (semibold) in
   compact, stepped down to 12px regular in the amount density where odds leads. */
.betcard__outcome { display: block; min-width: 0; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${cv("text.default")}; ${outcomeType} }
.betcard--amount .betcard__outcome { ${outcomeSingleType} }

/* odds = the Odds component (static value + live up/down movement), resolved from odds.tokens.json — real .odds classes, not a redraw */
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
}

/* --- compact density (Combo / System): odds inline, no stake field --- */
.betcard--compact .betcard__market { margin-top: ${sectionGap}; }
.betcard--compact .betcard__line { display: flex; align-items: baseline; justify-content: space-between; gap: ${px(resolve("spacing.3"))}; margin-top: ${lineGap}; }

/* --- amount density (Single): outcome column + Bet-amount field --- */
.betcard--amount .betcard__body { display: flex; gap: ${px(resolve("spacing.3"))}; margin-top: ${sectionGap}; }
.betcard--amount .betcard__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: ${lineGap}; }
/* Bet-amount field = Input / lg + prefix — surface.page fill, outline.strong border,
   10px floating label over a 16px REGULAR value, '$' prefix (input.prefix). All from
   input.tokens.json; only width + bottom-alignment are bet-card layout. */
.betcard__amount { flex-shrink: 0; align-self: flex-end; width: ${amtWidth}; height: ${amtHeight}; display: flex; flex-direction: column; justify-content: center; gap: ${amtLabelGap}; background: ${cv("surface.page")}; border: 1px solid ${cv("outline.strong")}; border-radius: ${amtRadius}; padding: 0 ${amtPadX}; }
.betcard__amount:focus-within { border-color: ${cv("outline.active")}; }
.betcard__amount-label { color: ${cv("text.secondary")}; ${amtLabelType} }
.betcard__amount-value { display: flex; align-items: baseline; gap: ${amtPrefixGap}; }
.betcard__amount-cur { flex-shrink: 0; color: ${cv("text.secondary")}; ${amtValueType} }
.betcard__amount-input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: ${cv("text.default")}; ${amtValueType} font-variant-numeric: tabular-nums; font-family: inherit; }
.betcard__amount-input::placeholder { color: ${cv("text.secondary")}; }
/* empty state — Input's unpopulated look: no floating label / prefix, the placeholder centred */
.betcard__amount--empty { justify-content: center; }
.betcard__amount--empty .betcard__amount-input { width: 100%; }

/* --- betbuilder density: header + inset legs card + footer (odd + stake field) --- */
.betcard__bb { margin-top: ${sectionGap}; background: ${cv("surface.card")}; border-radius: ${bbRadius}; overflow: hidden; }
.betcard__bb-row { display: flex; align-items: center; gap: ${headerGap}; padding: ${bbRowPadY} ${bbRowPadX}; }
.betcard__bb-row + .betcard__bb-row { border-top: 1px solid ${cv("outline.default")}; }
.betcard__bb-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: ${bbRowGap}; }
.betcard__bb-market { color: ${cv("text.secondary")}; ${marketType} white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.betcard__bb-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: ${px(resolve("spacing.3"))}; margin-top: ${sectionGap}; }
.betcard__bb-odd { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.betcard__bb-odd-label { color: ${cv("text.secondary")}; ${bbOddLabelType} }`;

// ---- inline icons (currentColor) ----
const iClose = fs.readFileSync(path.join(root, "assets/icons/ui/close.svg"), "utf8").replace(/\n/g, "");
const iInfo = fs.readFileSync(path.join(root, "assets/icons/ui/info-outline.svg"), "utf8").replace(/\n/g, "");
const disc = (name) => fs.readFileSync(path.join(root, `assets/icons/sports/${name}.svg`), "utf8").replace(/\n/g, "");

// ---- markup builders ----
// header badges are the real Badge component (sm / named). Optional — pass none, one,
// or several of live/betbuilder/freebet.
const BADGE_LABEL = { live: "LIVE", betbuilder: "BB", freebet: "FB" };
const headerBadges = (badges) =>
  badges && badges.length
    ? `<div class="betcard__badges">${badges.map((n) => `<span class="badge badge--sm badge--named-${n}">${BADGE_LABEL[n]}</span>`).join("")}</div>`
    : "";
function header(sport, event, badges) {
  return `<div class="betcard__header">
    <span class="betcard__icon">${disc(sport)}</span>
    <button class="betcard__event">${event}</button>
    ${headerBadges(badges)}<button class="betcard__remove" aria-label="Remove selection">${iClose}</button>
  </div>`;
}
// Tooltip helpers — hover/focus reveal, the real Tooltip component's surface-6 bubble.
const settlementTip = `Special settlement rules for event. More information at &ldquo;<span class="bc-tt__link">Terms and Conditions</span>&rdquo; in the discipline description.`;
const ttBubble = (html) => `<span class="bc-tt__bubble" role="tooltip">${html}<span class="bc-tt__arrow"></span></span>`;
// settlement-info icon → button + tooltip
const infoTip = () => `<span class="bc-tt betcard__info-tt"><button class="betcard__info" aria-label="Settlement rules">${iInfo}</button>${ttBubble(settlementTip)}</span>`;
// a truncating text (market / outcome) → tooltip revealing the full string. grow = flex:1 (row contexts).
const textTip = (cls, text, grow) => `<span class="bc-tt${grow ? " bc-tt--grow" : ""}"><span class="${cls} bc-tt__trigger" tabindex="0">${text}</span>${ttBubble(text)}</span>`;

function marketLine(market, info) {
  return `<div class="betcard__market">
    ${info ? infoTip() : ""}
    ${textTip("betcard__market-name", market, true)}
  </div>`;
}
// the odds value = the Odds component. Static, or live (dir up/down + previous price).
// prevLeft puts the struck-through previous value to the LEFT (odds pinned to a right edge).
function oddsEl(value, dir, prev, prevLeft) {
  if (!dir) return `<span class="odds"><span class="odds__value">${value}</span></span>`;
  const cls = ["odds", `odds--${dir}`, prevLeft ? "odds--prev-left" : ""].filter(Boolean).join(" ");
  return `<span class="${cls}" data-dir="${dir}"><span class="odds__value">${value}</span><span class="odds__prev">${prev}</span></span>`;
}
function compactCard({ sport, event, badges, market, info, outcome, odds, oddsDir, oddsPrev }) {
  return `<div class="betcard betcard--compact">
  ${header(sport, event, badges)}
  ${marketLine(market, info)}
  <div class="betcard__line">
    ${textTip("betcard__outcome", outcome, true)}
    ${oddsEl(odds, oddsDir, oddsPrev, true)}
  </div>
</div>`;
}
// the Bet-amount field (Input / lg + prefix). Empty state = Input's unpopulated look
// (placeholder centred, no floating label / prefix); populated = label + $ + value.
function amountField(amount) {
  if (amount == null || amount === "") {
    return `<label class="betcard__amount betcard__amount--empty">
      <input class="betcard__amount-input" placeholder="Bet amount" inputmode="decimal" aria-label="Bet amount" />
    </label>`;
  }
  return `<label class="betcard__amount">
      <span class="betcard__amount-label">Bet amount</span>
      <span class="betcard__amount-value">
        <span class="betcard__amount-cur">$</span>
        <input class="betcard__amount-input" value="${amount}" inputmode="decimal" aria-label="Bet amount" />
      </span>
    </label>`;
}
function amountCard({ sport, event, badges, market, info, outcome, odds, oddsDir, oddsPrev, amount }) {
  return `<div class="betcard betcard--amount">
  ${header(sport, event, badges)}
  <div class="betcard__body">
    <div class="betcard__main">
      ${marketLine(market, info)}
      ${textTip("betcard__outcome", outcome, false)}
      ${oddsEl(odds, oddsDir, oddsPrev)}
    </div>
    ${amountField(amount)}
  </div>
</div>`;
}
function betbuilderCard({ sport, event, badges, legs, odd, amount }) {
  const rows = legs.map((l) => `<div class="betcard__bb-row">
      <div class="betcard__bb-main">
        <span class="betcard__outcome">${l.outcome}</span>
        <span class="betcard__bb-market">${l.market}</span>
      </div>
      <button class="betcard__remove" aria-label="Remove leg">${iClose}</button>
    </div>`).join("\n    ");
  return `<div class="betcard betcard--betbuilder">
  ${header(sport, event, badges)}
  <div class="betcard__bb">
    ${rows}
  </div>
  <div class="betcard__bb-foot">
    <div class="betcard__bb-odd">
      <span class="betcard__bb-odd-label">Betbuilder Odd</span>
      ${oddsEl(odd)}
    </div>
    ${amountField(amount)}
  </div>
</div>`;
}
// short, readable code sample (icon path dumps replaced with a comment)
function sampleCode(kind, d) {
  const ic = "<svg><!-- icon --></svg>";
  const badgeTags = (d.badges && d.badges.length)
    ? `\n    <div class="betcard__badges">${d.badges.map((n) => `<span class="badge badge--sm badge--named-${n}">${BADGE_LABEL[n]}</span>`).join("")}</div>`
    : "";
  const hdr = `  <div class="betcard__header">
    <span class="betcard__icon">${ic}</span>
    <button class="betcard__event">${d.event}</button>${badgeTags}
    <button class="betcard__remove" aria-label="Remove selection">${ic}</button>
  </div>`;
  // market / outcome are wrapped in the Tooltip reveal (.bc-tt) so the truncated text
  // shows in full on hover/focus; the info icon carries the settlement tooltip.
  const codeTip = (trigger, full) => `<span class="bc-tt bc-tt--grow">${trigger}<span class="bc-tt__bubble" role="tooltip">${full}<span class="bc-tt__arrow"></span></span></span>`;
  const infoCode = d.info ? `\n      <span class="bc-tt"><button class="betcard__info">${ic}</button><span class="bc-tt__bubble" role="tooltip">Special settlement rules…<span class="bc-tt__arrow"></span></span></span>` : "";
  const mkt = `<div class="betcard__market">${infoCode}
      ${codeTip(`<span class="betcard__market-name">${d.market}</span>`, d.market)}
    </div>`;
  const outcomeCode = codeTip(`<span class="betcard__outcome">${d.outcome}</span>`, d.outcome);
  const oddsCode = d.oddsDir
    ? `<span class="odds odds--${d.oddsDir}${kind === "compact" ? " odds--prev-left" : ""}"><span class="odds__value">${d.odds}</span><span class="odds__prev">${d.oddsPrev}</span></span>`
    : `<span class="odds"><span class="odds__value">${d.odds}</span></span>`;
  if (kind === "compact") {
    return `<div class="betcard betcard--compact">
${hdr}
  ${mkt}
  <div class="betcard__line">
    ${outcomeCode}
    ${oddsCode}
  </div>
</div>`;
  }
  return `<div class="betcard betcard--amount">
${hdr}
  <div class="betcard__body">
    <div class="betcard__main">
      ${mkt}
      ${outcomeCode}
      ${oddsCode}
    </div>
    <label class="betcard__amount">
      <span class="betcard__amount-label">Bet amount</span>
      <span class="betcard__amount-value">
        <span class="betcard__amount-cur">$</span>
        <input class="betcard__amount-input" value="${d.amount}" />
      </span>
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
const dCompactInfo = { sport: "tennis", event: "Cocciaretto Elisabetta - Efstathiou Menelaos", badges: ["live", "betbuilder", "freebet"], market: "Winner. Set 3. Game 2", info: true, outcome: "Efstathiou Menelaos", odds: "2.83" };
const dAmount = { sport: "cs2", event: "CYBERSHOKE Esports - Inner Circle", market: "Match winner", info: false, outcome: "CYBERSHOKE Esports", odds: "1.84", amount: "100" };
const dAmountInfo = { sport: "football", event: "Fulham - Manchester City", badges: ["freebet"], market: "Handicap market name that is very long", info: true, outcome: "Manchester City -5.5", odds: "19.53", amount: "100" };
const dTrunc = { sport: "football", event: "Fulham - Manchester City", market: "Handicap market name that I tried to make as long as I can make it", info: true, outcome: "Manchester City -5.5 Super puper outcome also very long", odds: "19.53" };
const dLive = { sport: "football", event: "Arsenal - Chelsea", badges: ["live"], market: "Match Result — 1X2", info: false, outcome: "Arsenal to win", odds: "2.10", oddsDir: "up", oddsPrev: "1.95" };
const dBetbuilder = { sport: "football", event: "Borussia Dortmund - AC Milan", badges: ["betbuilder", "live"], odd: "5.09", amount: "", legs: [
  { outcome: "Borussia Dortmund", market: "Match Winner" },
  { outcome: "2-1", market: "Correct Score" },
  { outcome: "Borussia Dortmund", market: "Match Winner" },
  { outcome: "2-1", market: "Correct Score" },
  { outcome: "Borussia Dortmund", market: "Match Winner" },
] };
const betbuilderCode = `<div class="betcard betcard--betbuilder">
  <div class="betcard__header">
    <span class="betcard__icon"><svg><!-- sport --></svg></span>
    <button class="betcard__event">Borussia Dortmund - AC Milan</button>
    <div class="betcard__badges">
      <span class="badge badge--sm badge--named-betbuilder">BB</span>
      <span class="badge badge--sm badge--named-live">LIVE</span>
    </div>
    <button class="betcard__remove" aria-label="Remove selection"><svg><!-- × --></svg></button>
  </div>
  <div class="betcard__bb">
    <div class="betcard__bb-row">
      <div class="betcard__bb-main">
        <span class="betcard__outcome">Borussia Dortmund</span>
        <span class="betcard__bb-market">Match Winner</span>
      </div>
      <button class="betcard__remove" aria-label="Remove leg"><svg><!-- × --></svg></button>
    </div>
    <!-- …one .betcard__bb-row per leg… -->
  </div>
  <div class="betcard__bb-foot">
    <div class="betcard__bb-odd">
      <span class="betcard__bb-odd-label">Betbuilder Odd</span>
      <span class="odds"><span class="odds__value">5.09</span></span>
    </div>
    <label class="betcard__amount betcard__amount--empty">
      <input class="betcard__amount-input" placeholder="Bet amount" />
    </label>
  </div>
</div>`;

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
      <div class="row"><b>Anatomy</b><span>Header (discipline icon · event link · remove ×) → market name (with an optional settlement-rules info icon) → outcome → odds. Sits on surface.raised (surface-4), one step above the page, with <em>no border</em> — the surface step alone separates it (unlike <a href="card.html">Card</a>'s hairline).</span></div>
      <div class="row"><b>Densities</b><span><code class="tok">--compact</code> (Combo / System): odds sits inline to the right of the outcome, no stake field. <code class="tok">--amount</code> (Single): a Bet-amount field to the right of the outcome column. Header/market/outcome roles are byte-for-byte the same across both.</span></div>
      <div class="row"><b>Sizing</b><span>radius.md (12px) · 8px padding (20px sport icon / × flush 8px from the edges) · 8px header↔body, 4px between lines. Market 12px. Odds 14px semibold (heading-base) in both densities, tabular-nums. Outcome is density-specific: 14px semibold in Combo/System (it leads), 12px regular white in Single (the odds leads there). Settlement info icon 16px, 8px gap to the market name.</span></div>
      <div class="row"><b>Event & remove</b><span>The event is an underlined link (text.secondary, link-sm) — tapping opens the event; it truncates with ellipsis, and brightens to the active colour on hover. Remove × is a 20px ghost icon button — the Button ghost treatment: icon.secondary → text.default, transparent → fill.neutralHover on hover, flush 8px from the card edge.</span></div>
      <div class="row"><b>Header badges</b><span>Optional LIVE / BB / FB pills after the event — the <a href="badge.html">Badge</a> component at <code class="tok">sm</code> (16px), <code class="tok">named</code> variants (live/betbuilder = active tint, freebet = accent tint), resolved from badge.tokens.json (real <code class="tok">.badge</code> classes, not redrawn). Any combination, or none. The event shrinks/truncates before them; the × is pushed to the far right.</span></div>
      <div class="row"><b>Tooltips</b><span>All the <a href="tooltip.html">Tooltip</a> component (surface-6 bubble + caret, hover/focus, from tooltip.tokens.json). The gold info icon (icon.warning, optional per card) reveals the settlement-rules note; a long market name and a long outcome truncate to an ellipsis and reveal in full on hover/focus/tap.</span></div>
      <div class="row"><b>Odds</b><span>The odds value <em>is</em> the <a href="odds.html">Odds</a> component — static, or live: it flashes text.positive/negative on a price change and shows the struck-through previous price, then eases back (see the "Live odds" card). Resolved from odds.tokens.json, real <code class="tok">.odds</code> classes.</span></div>
      <div class="row"><b>Out of this pass</b><span>Suspended (lock) and per-card error strip → card states. The Bet-amount field's ticket-notch silhouette → Input's bet-amount variant.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">One <code class="tok">:root</code> of colour custom properties, a shared <code class="tok">.betcard</code> base + header/market/outcome/odds elements, then the two density modifiers. Dimensions stay literal px — baked layout per Figma, not runtime-themed the way colours are.</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Compact — Combo / System</h2>
    <p class="section-desc">The dense variant: no per-selection stake (the stake is set once for the whole slip). Odds sits inline to the right of the outcome, baseline-aligned.</p>
    <div class="story-grid">
      ${storyCard("Plain market", compactCard(dCompact), sampleCode("compact", dCompact))}
      ${storyCard("3 badges + settlement info", compactCard(dCompactInfo), sampleCode("compact", dCompactInfo), "All three header badges (LIVE + BB + FB, 4px apart) and the 16px gold settlement-info icon at once — hover the gold icon for the settlement-rules tooltip. The event truncates before the badge cluster.")}
      ${storyCard("Live odds (movement)", compactCard(dLive), sampleCode("compact", dLive), "The odds here is the Odds component with a live up-movement — it flashes green and shows the struck-through previous price, then eases back. The demo replays on a loop.")}
    </div>

    <h2 class="big-section">Tooltips — settlement rules · truncated text</h2>
    <p class="section-desc">Three reveals, all the <a href="tooltip.html">Tooltip</a> component (surface-6 bubble + caret, hover/focus, resolved from tooltip.tokens.json): the gold <strong>settlement-info</strong> icon shows the special-rules note; a <strong>long market name</strong> and a <strong>long outcome</strong> both truncate to an ellipsis and reveal in full on hover or focus (tap on mobile). Hover the icon, the market line, or the outcome below.</p>
    <div class="story-grid">
      ${storyCard("Long market + outcome + info", compactCard(dTrunc), sampleCode("compact", dTrunc), "Market and outcome truncate; hover/focus each to reveal the full string. The gold info icon carries the settlement-rules text.")}
    </div>

    <h2 class="big-section">With amount — Single</h2>
    <p class="section-desc">Single-bet density: each selection carries its own Bet-amount field. That field <em>is</em> the <a href="input.html">Input</a> component — the lg (48px) floating-label variant with a currency prefix, resolved straight from input.tokens.json (10px label over a 16px <strong>regular</strong> value, "$" prefix, surface.page fill + outline.strong border, outline.active on focus). Nothing about it is restyled here; the only bet-card additions are the fixed 160px width and bottom-alignment to the outcome column.</p>
    <div class="story-grid">
      ${storyCard("Bet-amount field", amountCard(dAmount), sampleCode("amount", dAmount))}
      ${storyCard("Long market + info", amountCard(dAmountInfo), sampleCode("amount", dAmountInfo), "Outcome column flexes and truncates; the stake field keeps a fixed width so a column of cards lines up.")}
    </div>

    <h2 class="big-section">Betbuilder</h2>
    <p class="section-desc">One bet made of several same-event legs (a same-game multi). The header and footer are the bet-card's own; the legs live in an <strong>inset surface-2 card</strong> (one step darker than the surface-4 outer), each an outcome-over-market row — note the order is inverted vs. compact: <strong>outcome above, market below</strong> — with its own remove ×, split by hairline dividers. Footer: the combined <code class="tok">Betbuilder Odd</code> and the stake field (the <a href="input.html">Input</a>, shown empty here). Badges (BB / LIVE) come once Badge is reworked, then to every bet card.</p>
    <div class="story-grid" style="grid-template-columns:1fr; max-width:440px;">
      ${storyCard("5-leg betbuilder", betbuilderCard(dBetbuilder), betbuilderCode, "Inset card surface.card (surface-2), 8px leg padding (all edges), 4px outcome↔market, 20px remove ×, 8px from the card to header/footer.")}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
<script>
  // Odds movement = the Odds component's behaviour: colour flash (CSS) + a number
  // count-up (this rAF tween, no library). In production the app calls oddsPlay(el)
  // once per price change; here the demo loops it. (Same script as the Odds page.)
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

fs.writeFileSync(path.join(root, "docs/bet-card.html"), html);
console.log("wrote docs/bet-card.html");
