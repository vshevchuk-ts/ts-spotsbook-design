// The real Bet selection card — CSS + a compact-card markup helper, lifted out of
// tools/build-bet-card-doc.mjs so the card doc page AND the mobile-betslip
// prototype share ONE source for the card's CSS (the drift-prone part), instead
// of the screen redrawing a lookalike.
//
// css() returns ONLY the card's own rules (header / market / bc-tt tooltip /
// outcome / the compact·amount·betbuilder densities / the bespoke stake field).
// The header badges and the odds value are the real Badge / Odds components — the
// consuming page imports those modules and unions their css()/colorPaths.
//
// Two bits stay bespoke by design (they resolve real Input/Tooltip token values
// but are NOT the display-only DS components): the editable `.betcard__amount`
// stake <input>, and the content-wrapping `.bc-tt` tooltip.

export const colorPaths = [
  "surface.raised", "surface.page", "surface.card",
  "outline.strong", "outline.active", "outline.default",
  "text.default", "text.active", "text.secondary",
  "icon.secondary", "icon.warning",
  "fill.neutralHover",
  "text.onFill", // bespoke tooltip bubble text
];

export function css(ctx) {
  const { tokens, resolve, resolveToken, get, px, cv, cvOf } = ctx;
  const bc = tokens["bet-card"];
  const input = tokens.input;
  const tooltip = tokens.tooltip;

  // typography → CSS (reads $extensions textDecoration/textTransform off the node)
  const typoOf = ctx.typoOf;

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
  const amtWidth = px(resolve(bc.amount.width.$value));
  const inLg = input.size.lg;
  const amtHeight = px(resolve(inLg.height.$value));
  const amtPadX = px(resolve(inLg.paddingX.$value));
  const amtLabelGap = px(resolve(inLg.labelGap.$value));
  const amtRadius = px(resolve(input.radius.$value));
  const amtPrefixGap = px(resolve(input.prefix.gap.$value));
  const bb = bc.betbuilder;
  const bbRadius = px(resolve(bb.innerRadius.$value));
  const bbRowPadX = px(resolve(bb.rowPaddingX.$value));
  const bbRowPadY = px(resolve(bb.rowPaddingY.$value));
  const bbRowGap = px(resolve(bb.rowGap.$value));
  const ttRadius = px(resolve(tooltip.radius.$value));
  const ttPadX = px(resolve(tooltip.paddingX.$value));
  const ttPadY = px(resolve(tooltip.paddingY.$value));
  const ttGap = px(resolve(tooltip.gap.$value));
  const ttArrow = px(resolve(tooltip.arrowSize.$value));
  const ttSh = resolveToken(tooltip.shadow);
  const ttShadow = `${px(ttSh.offsetX)} ${px(ttSh.offsetY)} ${px(ttSh.blur)} ${px(ttSh.spread)} ${ttSh.color}`;
  const eventType = typoOf(bc.header.event.type);
  const marketType = typoOf(bc.market.type);
  const outcomeType = typoOf(bc.outcome.type);
  const outcomeSingleType = typoOf(bc.outcome.singleType);
  const amtLabelType = typoOf(inLg.label);
  const amtValueType = typoOf(inLg.value);
  const bbOddLabelType = typoOf(bb.oddLabel.type);
  const ttLabel = typoOf(tooltip.label);

  return `.betcard { box-sizing: border-box; background: ${cv("surface.raised")}; border-radius: ${radius}; padding: ${padding}; font-family: ${cv("family.sans")}; }
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

/* market line (+ optional settlement-rules info icon) */
.betcard__market { display: flex; align-items: center; gap: ${marketGap}; color: ${cv("text.secondary")}; ${marketType} }
.betcard__market-name { display: block; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.betcard__info { flex-shrink: 0; width: ${infoSize}; height: ${infoSize}; color: ${cv("icon.warning")}; background: none; border: none; padding: 0; display: inline-flex; cursor: pointer; }
.betcard__info svg { display: block; width: 100%; height: 100%; }

/* Tooltip reveal (info settlement · long market · long outcome) — bespoke .bc-tt:
   wraps arbitrary WRAPPING card content, so it is NOT the nowrap DS Tooltip, but it
   resolves Tooltip's real token values (surface-6 bubble + caret + shadow). */
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

/* --- compact density (Combo / System): odds inline, no stake field --- */
.betcard--compact .betcard__market { margin-top: ${sectionGap}; }
.betcard--compact .betcard__line { display: flex; align-items: baseline; justify-content: space-between; gap: ${px(resolve("spacing.3"))}; margin-top: ${lineGap}; }

/* --- amount density (Single): outcome column + Bet-amount field --- */
.betcard--amount .betcard__body { display: flex; gap: ${px(resolve("spacing.3"))}; margin-top: ${sectionGap}; }
.betcard--amount .betcard__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: ${lineGap}; }
/* Bet-amount field — an editable <input> laid out to Input's lg spec (surface.page
   fill, outline.strong border, 10px floating label over a 16px value, '$' prefix).
   Values from input.tokens.json; only width + bottom-alignment are card layout. */
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
}

// ---- compact-card markup for external consumers (the mobile-betslip screen).
// Icons are passed in (module stays fs-free): { sport, close, info?, badge(name,label) }.
// odds is pre-rendered (the real Odds component markup) by the caller. ----
const BADGE_LABEL = { live: "LIVE", betbuilder: "BB", freebet: "FB" };

export function compactCard({ event, badges = [], market, outcome, oddsHtml, icons }) {
  const badgeTags = badges.length
    ? `<div class="betcard__badges">${badges.map((n) => `<span class="badge badge--sm badge--named-${n}">${BADGE_LABEL[n]}</span>`).join("")}</div>`
    : "";
  const header = `<div class="betcard__header">
    <span class="betcard__icon">${icons.sport}</span>
    <button class="betcard__event">${event}</button>
    ${badgeTags}<button class="betcard__remove" aria-label="Remove selection">${icons.close}</button>
  </div>`;
  return `<div class="betcard betcard--compact">
  ${header}
  <div class="betcard__market"><span class="betcard__market-name">${market}</span></div>
  <div class="betcard__line">
    <span class="betcard__outcome">${outcome}</span>
    ${oddsHtml}
  </div>
</div>`;
}
