// The real Tooltip component — CSS + markup, lifted out of tools/build-tooltip-doc.mjs.
// Pure CSS: :hover/:focus-within on a wrapper + position:absolute, no JS. A surface-6
// (outline.strong) bubble + soft shadow + a rotated-square arrow, four placements.
// Composed pages that reveal a note on hover/focus (bet-card's settlement-info icon,
// truncated market/outcome) import css()/markup here instead of re-deriving it.

export const colorPaths = ["outline.strong", "text.onFill"];

export function css(ctx) {
  const { tokens, resolve, resolveToken, px, cv } = ctx;
  const tooltip = tokens.tooltip;
  const radius = px(resolve(tooltip.radius.$value));
  const paddingX = px(resolve(tooltip.paddingX.$value));
  const paddingY = px(resolve(tooltip.paddingY.$value));
  const gap = px(resolve(tooltip.gap.$value));
  const arrowSize = resolve(tooltip.arrowSize.$value);
  const arrowNeg = `-${arrowSize.value / 2}${arrowSize.unit}`;
  const showDelay = tooltip.showDelay.$value; // literal {value,unit}
  const labelType = resolveToken(tooltip.label);
  const shadow = resolveToken(tooltip.shadow);
  const shadowCss = `${px(shadow.offsetX)} ${px(shadow.offsetY)} ${px(shadow.blur)} ${px(shadow.spread)} ${shadow.color}`;
  const typoCss = (t) => `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;

  return `.tooltip-wrapper { position: relative; display: inline-block; }
.tooltip { position: absolute; z-index: 1; box-sizing: border-box; padding: ${paddingY} ${paddingX}; border-radius: ${radius}; background: ${cv("outline.strong")}; color: ${cv("text.onFill")}; box-shadow: ${shadowCss}; white-space: nowrap; font-family: ${cv("family.sans")}; ${typoCss(labelType)}
  opacity: 0; pointer-events: none; transition: opacity 0.1s ease; }
.tooltip-wrapper:hover .tooltip, .tooltip-wrapper:focus-within .tooltip { opacity: 1; transition-delay: ${showDelay.value}${showDelay.unit}; }
.tooltip::after { content: ""; position: absolute; width: ${px(arrowSize)}; height: ${px(arrowSize)}; background: ${cv("outline.strong")}; transform: rotate(45deg); }

.tooltip--top { bottom: calc(100% + ${gap}); left: 50%; transform: translateX(-50%); }
.tooltip--top::after { bottom: ${arrowNeg}; left: 50%; margin-left: ${arrowNeg}; }
.tooltip--bottom { top: calc(100% + ${gap}); left: 50%; transform: translateX(-50%); }
.tooltip--bottom::after { top: ${arrowNeg}; left: 50%; margin-left: ${arrowNeg}; }
.tooltip--left { right: calc(100% + ${gap}); top: 50%; transform: translateY(-50%); }
.tooltip--left::after { right: ${arrowNeg}; top: 50%; margin-top: ${arrowNeg}; }
.tooltip--right { left: calc(100% + ${gap}); top: 50%; transform: translateY(-50%); }
.tooltip--right::after { left: ${arrowNeg}; top: 50%; margin-top: ${arrowNeg}; }`;
}
