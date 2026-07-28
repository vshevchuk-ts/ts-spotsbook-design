// The real Select component — CSS + markup, lifted out of tools/build-select-doc.mjs.
// Same box model as Input plus a trailing chevron, always present. Summary's
// System-Combination trigger and (under true composition) any composed page import
// css()/markup here instead of re-deriving a subset of select.tokens.json by hand.

export const colorPaths = [
  "surface.page", "surface.raised", "surface.disabled", "outline.strong", "outline.default", "outline.active", "outline.accent", "outline.negative",
  "text.secondary", "text.default", "text.disabled", "text.negative", "icon.default", "icon.disabled",
];

export function ringShadow(ctx) {
  const select = ctx.tokens.select;
  const ringWidth = ctx.px(ctx.resolve(select.state.focused.ringWidth.$value));
  const ringOffset = ctx.px(ctx.resolve(select.state.focused.ringOffset.$value));
  return `box-shadow: 0 0 0 ${ringOffset} var(--bg-card) /* substitute your own surface color */, 0 0 0 calc(${ringOffset} + ${ringWidth}) ${ctx.cv("outline.accent")};`;
}

export function css(ctx) {
  const { tokens, resolve, resolveToken, px, cv } = ctx;
  const select = tokens.select;
  const fieldRadius = px(resolve(select.radius.$value));
  const sizes = ["sm", "base", "lg"].map((key) => {
    const s = select.size[key];
    const base = { key, height: resolve(s.height.$value), paddingX: resolve(s.paddingX.$value), gap: resolve(s.gap.$value), iconSize: resolve(s.iconSize.$value), value: resolveToken(s.value) };
    if (key !== "sm") {
      base.label = resolveToken(s.label);
      base.labelGap = resolve(s.labelGap.$value);
    }
    return base;
  });
  const errorTextSize = px(resolve("{size.sm}"));
  const errorGap = px(resolve("{spacing.1}"));
  const typoCss = (t) => `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
  const ring = ringShadow(ctx);

  return `.select {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  background: ${cv("surface.page")};
  border: 1px solid ${cv("outline.strong")};
  border-radius: ${fieldRadius};
  font-family: ${cv("family.sans")};
  cursor: pointer;
}
.select__chevron { flex-shrink: 0; margin-left: auto; color: ${cv("icon.default")}; transition: transform 0.12s ease; }
.select__placeholder { color: ${cv("text.secondary")}; }
.select__value { color: ${cv("text.default")}; }
.select__stack { display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0; }
.select__label { color: ${cv("text.secondary")}; }

${sizes
  .map((s) => {
    const lines = [
      `.select--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; gap: ${px(s.gap)}; }`,
      `.select--${s.key} .select__chevron { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }`,
      `.select--${s.key} .select__placeholder, .select--${s.key} .select__value { ${typoCss(s.value)} }`,
    ];
    if (s.label) {
      lines.push(`.select--${s.key} .select__stack { gap: ${px(s.labelGap)}; }`);
      lines.push(`.select--${s.key} .select__label { ${typoCss(s.label)} }`);
    }
    return lines.join("\n");
  })
  .join("\n\n")}

/* hover fills to surface-4 — but NOT when active/focused/error/disabled */
.select:not(.select--disabled):not(.select--active):not(.select--focused):not(.select--error):hover, .select--hover { background: ${cv("surface.raised")}; border-color: ${cv("surface.raised")}; }
/* active = menu open: accent border + chevron flipped up (stays grey) */
.select--active { border-color: ${cv("outline.active")}; }
.select--active .select__chevron { transform: rotate(180deg); }
/* focused = keyboard focus on the closed trigger: active border + accent ring, chevron down */
.select--focused { border-color: ${cv("outline.active")}; ${ring} }
.select--disabled { opacity: 0.5; background: ${cv("surface.disabled")}; border-color: ${cv("outline.default")}; cursor: not-allowed; }
.select--disabled .select__placeholder, .select--disabled .select__value, .select--disabled .select__label { color: ${cv("text.disabled")}; }
.select--disabled .select__chevron { color: ${cv("icon.disabled")}; }
.select--error { border-color: ${cv("outline.negative")}; }
.select-field { display: inline-flex; flex-direction: column; gap: ${errorGap}; }
.select__error { color: ${cv("text.negative")}; font-family: ${cv("family.sans")}; font-size: ${errorTextSize}; line-height: 1.4; }`;
}

// ---- markup builders (the real .select classes). `chevron` is the inlined
// chevron SVG string (with class="select__chevron") — the caller supplies it so
// the module stays free of filesystem/asset concerns. ----
export function restingMarkup(size, chevron, { placeholder = "Select" } = {}) {
  return `<div class="select select--${size}"><span class="select__placeholder">${placeholder}</span>${chevron}</div>`;
}
export function filledMarkup(size, chevron, { value = "Last Added" } = {}) {
  return `<div class="select select--${size}"><span class="select__value">${value}</span>${chevron}</div>`;
}
export function floatedMarkup(size, chevron, { label = "Sort by", value = "Last Added", cls = "" } = {}) {
  return `<div class="select select--${size}${cls}"><div class="select__stack"><span class="select__label">${label}</span><span class="select__value">${value}</span></div>${chevron}</div>`;
}
export function errorMarkup(size, chevron, { label = "Sort by", value = "Last Added", message = "Please choose a value" } = {}) {
  const field = floatedMarkup(size, chevron, { label, value }).replace('class="select select--' + size + '"', 'class="select select--' + size + ' select--error"');
  return `<div class="select-field">${field}<span class="select__error">${message}</span></div>`;
}
