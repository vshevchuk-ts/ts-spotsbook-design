// The real Tabs component — segmented + underline styles, shared item/size grid.
// CSS + markup lifted so the betslip's bet-type switcher is the real underline
// Tabs, not a bespoke strip. The in-tab count pill is the separate Counter
// component (./lib/components/counter.mjs) — the consuming page adds Counter.css.

export const colorPaths = [
  "text.secondary", "text.default", "text.disabled", "icon.default", "icon.disabled",
  "lighten.2", "surface.page", "outline.strong", "outline.default", "outline.active", "bg.active",
];

export function css(ctx) {
  const { tokens, resolve, resolveToken, px, cv } = ctx;
  const tabs = tokens.tabs;
  const itemGap = px(resolve(tabs.item.gap.$value));
  const itemLabel = resolveToken(tabs.item.label);
  const activeWeight = resolve(tabs.segmented.state.active.fontWeight.$value);
  const sizes = ["sm", "base"].map((key) => {
    const s = tabs.size[key];
    return { key, height: resolve(s.height.$value), paddingX: resolve(s.paddingX.$value), iconSize: resolve(s.iconSize.$value) };
  });
  const seg = {
    trackRadius: px(resolve(tabs.segmented.trackRadius.$value)),
    trackPadding: px(resolve(tabs.segmented.trackPadding.$value)),
    pillRadius: px(resolve(tabs.segmented.pillRadius.$value)),
  };
  const und = {
    gap: px(resolve(tabs.underline.gap.$value)),
    hoverInset: px(resolve(tabs.underline.state.hover.inset.$value)),
    hoverRadius: px(resolve(tabs.underline.state.hover.radius.$value)),
  };
  const typoCss = (t) => `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;

  return `.tab { display: inline-flex; align-items: center; justify-content: center; gap: ${itemGap}; border: none; background: transparent; cursor: pointer; white-space: nowrap; color: ${cv("text.secondary")}; font-family: ${cv("family.sans")}; ${typoCss(itemLabel)} }
.tab__icon { flex-shrink: 0; color: ${cv("icon.default")}; }

${sizes
  .map((s) => `.tab--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; }
.tab--${s.key} .tab__icon { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }`)
  .join("\n")}

.tabs--segmented { display: inline-flex; align-items: center; gap: ${seg.trackPadding}; background: ${cv("surface.page")}; border: 1px solid ${cv("outline.strong")}; border-radius: ${seg.trackRadius}; padding: ${seg.trackPadding}; max-width: 100%; overflow-x: auto; }
.tabs--segmented .tab { border-radius: ${seg.pillRadius}; }
.tabs--segmented .tab:not(.tab--active):not(.tab--disabled):hover { background: ${cv("lighten.2")}; color: ${cv("text.default")}; }
.tabs--segmented .tab--active { background: ${cv("bg.active")}; border: 1px solid ${cv("outline.active")}; color: ${cv("text.default")}; font-weight: ${activeWeight}; }
.tabs--segmented .tab--disabled { color: ${cv("text.disabled")}; cursor: not-allowed; }
.tabs--segmented .tab--disabled .tab__icon, .tabs--underline .tab--disabled .tab__icon { color: ${cv("icon.disabled")}; }

.tabs--underline { display: inline-flex; align-items: stretch; gap: ${und.gap}; border-bottom: 1px solid ${cv("outline.default")}; max-width: 100%; overflow-x: auto; }
.tabs--underline .tab { position: relative; z-index: 0; border-bottom: 2px solid transparent; margin-bottom: -1px; }
/* hover pill: a 12% lighten rounded rectangle inset 4px top/bottom (::before, behind the label) so it floats clear of the baseline instead of running down to it */
.tabs--underline .tab:not(.tab--active):not(.tab--disabled):hover::before { content: ""; position: absolute; left: 0; right: 0; top: ${und.hoverInset}; bottom: ${und.hoverInset}; background: ${cv("lighten.2")}; border-radius: ${und.hoverRadius}; z-index: -1; }
.tabs--underline .tab:not(.tab--active):not(.tab--disabled):hover { color: ${cv("text.default")}; }
.tabs--underline .tab--active { color: ${cv("text.default")}; font-weight: ${activeWeight}; border-bottom-color: ${cv("outline.active")}; }
.tabs--underline .tab--disabled { color: ${cv("text.disabled")}; cursor: not-allowed; }`;
}
