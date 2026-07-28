// The real Input component — CSS + markup, lifted out of tools/build-input-doc.mjs.
// The `.input` field (fill/border/sizes/states/floating-label) + the input--action
// variant (field + a trailing Max Button, composed from button.mjs). Summary's
// stake field and (under true composition) any composed page import css()/markup
// here instead of re-deriving a subset of input.tokens.json by hand.
import * as Button from "./button.mjs";

export const colorPaths = [
  "surface.page", "surface.raised", "surface.disabled", "outline.strong", "outline.default", "outline.active", "outline.negative",
  "text.secondary", "text.default", "text.disabled", "text.active", "text.negative", "fill.neutral", "outline.accent",
];

// var(--bg-card) is the CONSUMING page's own surface — the ring's inner gap must
// match whatever surface the field sits on, inherently contextual to the page.
export function ringShadow(ctx) {
  const input = ctx.tokens.input;
  const ringWidth = ctx.px(ctx.resolve(input.state.focused.ringWidth.$value));
  const ringOffset = ctx.px(ctx.resolve(input.state.focused.ringOffset.$value));
  return `box-shadow: 0 0 0 ${ringOffset} var(--bg-card) /* substitute your own surface color */, 0 0 0 calc(${ringOffset} + ${ringWidth}) ${ctx.cv("outline.accent")};`;
}

export function css(ctx) {
  const { tokens, resolve, resolveToken, px, cv } = ctx;
  const input = tokens.input;
  const fieldRadius = px(resolve(input.radius.$value));
  const sizes = ["sm", "base", "lg"].map((key) => {
    const s = input.size[key];
    const base = { key, height: resolve(s.height.$value), paddingX: resolve(s.paddingX.$value), value: resolveToken(s.value) };
    if (key !== "sm") {
      base.label = resolveToken(s.label);
      base.labelGap = resolve(s.labelGap.$value);
    }
    return base;
  });
  const errorTextSize = px(resolve("{size.sm}"));
  const errorGap = px(resolve("{spacing.1}"));
  const prefixGap = px(resolve(input.prefix.gap.$value));
  const typoCss = (t) => `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
  const ring = ringShadow(ctx);

  return `.input {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  background: ${cv("surface.page")};
  border: 1px solid ${cv("outline.strong")};
  border-radius: ${fieldRadius};
  font-family: ${cv("family.sans")};
  cursor: text;
}
.input__placeholder { color: ${cv("text.secondary")}; }
.input__value { color: ${cv("text.default")}; }
.input__prefix { color: ${cv("text.secondary")}; margin-right: ${prefixGap}; }
.input__stack { display: flex; flex-direction: column; justify-content: center; }
.input__label { color: ${cv("text.secondary")}; }
/* trailing action (e.g. a Max two-row button): value grows, button pinned right.
   .input.input--action (two classes) outweighs the .input--lg size shorthand so
   the tight right inset actually applies — the button sits 4px from the edge, matching
   its 4px top/bottom inset (a 40px button in the 48px lg field) for a symmetric look. */
.input.input--action { justify-content: space-between; padding-right: ${prefixGap}; gap: ${prefixGap}; }
.input--action .input__stack { flex: 1; min-width: 0; }
.input--action > .btn { flex-shrink: 0; }

${sizes
  .map((s) => {
    const lines = [
      `.input--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; }`,
      `.input--${s.key} .input__placeholder, .input--${s.key} .input__value { ${typoCss(s.value)} }`,
    ];
    if (s.label) {
      lines.push(`.input--${s.key} .input__stack { gap: ${px(s.labelGap)}; }`);
      lines.push(`.input--${s.key} .input__label { ${typoCss(s.label)} }`);
    }
    return lines.join("\n");
  })
  .join("\n\n")}

/* hover fills to surface-4 — but NOT when the field is active/focused/error (those own their look) or disabled */
.input:not(.input--disabled):not(.input--active):not(.input--focused):not(.input--error):hover, .input--hover { background: ${cv("surface.raised")}; border-color: ${cv("surface.raised")}; }
/* active = pointer/editing focus: accent border + blinking caret. Label stays grey. */
.input--active { border-color: ${cv("outline.active")}; }
/* focused = keyboard focus (:focus-visible): the active look + an additive ring */
.input--focused { border-color: ${cv("outline.active")}; ${ring} }
.input__caret { display: inline-block; width: 1.5px; height: 1.1em; margin-left: 1px; vertical-align: -0.16em; background: ${cv("text.active")}; animation: input-caret 1.05s step-end infinite; }
@keyframes input-caret { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
.input--disabled { opacity: 0.5; background: ${cv("surface.disabled")}; border-color: ${cv("outline.default")}; cursor: not-allowed; }
.input--disabled .input__placeholder, .input--disabled .input__value, .input--disabled .input__label { color: ${cv("text.disabled")}; }
.input--error { border-color: ${cv("outline.negative")}; }
.input-field { display: inline-flex; flex-direction: column; gap: ${errorGap}; }
.input__error { color: ${cv("text.negative")}; font-family: ${cv("family.sans")}; font-size: ${errorTextSize}; line-height: 1.4; }`;
}

// ---- markup builders (the real .input classes) ----
export function restingMarkup(size, { placeholder = "Enter" } = {}) {
  return `<div class="input input--${size}"><span class="input__placeholder">${placeholder}</span></div>`;
}
// single-line filled field (sm — no floating label, value shown directly)
export function filledMarkup(size, { value = "Entered value" } = {}) {
  return `<div class="input input--${size}"><span class="input__value">${value}</span></div>`;
}
export function floatedMarkup(size, { label = "Enter", value = "Entered value", prefix = "", caret = false, cls = "" } = {}) {
  const car = caret ? `<span class="input__caret"></span>` : "";
  const pre = prefix ? `<span class="input__prefix">${prefix}</span>` : "";
  return `<div class="input input--${size}${cls}"><div class="input__stack"><span class="input__label">${label}</span><span class="input__value">${pre}${value}${car}</span></div></div>`;
}
// error state wraps the field with a helper line below it
export function errorMarkup(size, { label = "Enter", value = "Entered value", message = "Error text" } = {}) {
  const field = floatedMarkup(size, { label, value }).replace('class="input input--' + size + '"', 'class="input input--' + size + ' input--error"');
  return `<div class="input-field">${field}<span class="input__error">${message}</span></div>`;
}
// trailing action: field (currency prefix) + the secondary two-row Button pinned right
export function actionMarkup(size, { label = "Bet amount", value = "10", prefix = "$", max } = {}) {
  const btn = Button.twoRowSecondary(max);
  return `<div class="input input--${size} input--action"><div class="input__stack"><span class="input__label">${label}</span><span class="input__value"><span class="input__prefix">${prefix}</span>${value}</span></div>${btn}</div>`;
}
