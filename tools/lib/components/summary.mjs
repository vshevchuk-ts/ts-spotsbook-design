// The real Summary component — the betslip footer key-value rows. CSS + markup
// lifted out of tools/build-summary-doc.mjs so the summary doc page AND the
// mobile-betslip prototype compose the same rows instead of redrawing them.
//
// Scope: ONLY Summary's own bits (the .sum-foot container, .summary rows, the
// .sum-hint line). The stake field / Max / System-select / total-odds inside a
// footer are the real Input / Button / Select / Odds components — the consuming
// page imports those modules separately and unions their css()/colorPaths.

export const colorPaths = [
  "text.secondary", "icon.secondary", "text.default",
  "text.positive", "text.active", "icon.active",
];

export function css(ctx) {
  const { tokens, resolve, px, cv, cvOf, typoOf } = ctx;
  const summary = tokens.summary;
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

  return `/* footer container — blocks (stake / select / hint / rows) stacked */
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

/* hint line with an inline link */
.sum-hint { color: ${cvOf(summary.hint.color)}; ${sHint} margin: 0; }
.sum-hint a { color: ${cv("text.active")}; text-decoration: underline; }`;
}

// ---- markup (icons passed in by the caller — modules stay fs-free) ----
export function row(label, valueHtml, { win, turbo, info } = {}, infoIcon = "") {
  const cls = ["summary__row", win ? "summary__row--win" : "", turbo ? "summary__row--turbo" : ""].filter(Boolean).join(" ");
  const lbl = `<span class="summary__label">${label}${info ? `<span class="summary__info">${infoIcon}</span>` : ""}</span>`;
  return `<div class="${cls}">${lbl}<span class="summary__value">${valueHtml}</span></div>`;
}
export const turboVal = (mult, rocketIcon) => `<span class="summary__rocket">${rocketIcon}</span>${mult}`;
export const oddsMove = (value, prev) => `<span class="odds odds--up odds--prev-left" data-dir="up"><span class="odds__value">${value}</span><span class="odds__prev">${prev}</span></span>`;
