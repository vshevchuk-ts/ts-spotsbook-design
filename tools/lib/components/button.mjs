// The real Button component — CSS + markup, lifted verbatim out of
// tools/build-button-doc.mjs per logs/handoff-shared-components.md so any page
// that needs a button (Input's trailing Max action, Summary's Max chip, a
// future composed page) imports the byte-identical real component instead of
// re-deriving its own subset of button.tokens.json by hand.
//
// Scope: primary/secondary/ghost core + the twoRow/roundIcon/betslip
// sportsbook variants. Counter (used alongside Button on the standalone Button
// doc page) is NOT part of this module — it's a separate component, resolved
// page-locally by build-button-doc.mjs same as before.

// refP: "{x.y}" -> "x.y"; walks a token subtree collecting every semantic
// color ref, so the sportsbook variants' :root vars stay derived from the
// tokens, not hand-listed — add a role in the JSON and it registers itself.
function collectColorRefs(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (node.$type === "color" && typeof node.$value === "string" && node.$value.startsWith("{")) {
    out.add(node.$value.replace(/[{}]/g, ""));
  }
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$")) continue;
    if (v && typeof v === "object") collectColorRefs(v, out);
  }
  return out;
}

export function colorPaths(ctx) {
  const button = ctx.tokens.button;
  const sportsbookColorRefs = collectColorRefs(button.twoRow, collectColorRefs(button.roundIcon, collectColorRefs(button.betslip)));
  return [...new Set([
    "fill.active", "fill.activeHover", "fill.activePressed", "text.onFill", "icon.onFill", "text.forActiveBg", "icon.forActiveBg",
    "fill.neutral", "fill.neutralHover", "fill.neutralPressed", "text.default", "icon.default",
    "text.secondary", "icon.secondary",
    "fill.disabled", "text.disabled", "icon.disabled",
    "outline.accent", "color.white", "text.active",
    ...sportsbookColorRefs,
  ])];
}

// ---- variant color mapping (fill: null = no fill token, literal transparent — ghost) ----
export const variants = {
  primary: { label: "Primary", fill: "fill.active", fillHover: "fill.activeHover", fillActive: "fill.activePressed", text: "text.forActiveBg", icon: "icon.forActiveBg" },
  secondary: { label: "Secondary", fill: "fill.neutral", fillHover: "fill.neutralHover", fillActive: "fill.neutralPressed", text: "text.default", icon: "icon.default", iconHover: "text.default" },
  ghost: { label: "Ghost", fill: null, fillHover: "fill.neutralHover", fillActive: "fill.neutralPressed", text: "text.default", icon: "icon.secondary", iconHover: "text.default" },
};

// ---- shared size grid (asserted identical across primary/secondary/ghost) ----
export function sizes(ctx) {
  const { tokens, resolve, resolveToken, get } = ctx;
  const button = tokens.button;
  function resolveSize(variantToken) {
    return ["sm", "base", "lg"].map((key) => {
      const s = variantToken.size[key];
      return {
        key,
        height: resolve(s.height.$value),
        paddingX: resolve(s.paddingX.$value),
        gap: resolve(s.gap.$value),
        iconSize: resolve(s.iconSize.$value),
        label: resolveToken(get(s.label.$value)),
      };
    });
  }
  const primarySizes = resolveSize(button.primary);
  const secondarySizes = resolveSize(button.secondary);
  const ghostSizes = resolveSize(button.ghost);
  primarySizes.forEach((p, i) => {
    for (const [label, sizes_] of [["secondary", secondarySizes], ["ghost", ghostSizes]]) {
      const s = sizes_[i];
      const same = JSON.stringify(p) === JSON.stringify(s);
      if (!same) throw new Error(`button.primary.size.${p.key} and button.${label}.size.${s.key} were expected to be identical but diverged — update the shared .btn--${p.key} CSS generation to handle them separately.`);
    }
  });
  return primarySizes; // identical across all three variants, asserted above
}

export function btnRadius(ctx) {
  return ctx.px(ctx.resolve(ctx.tokens.button.primary.radius.$value));
}

// var(--bg-card) is the CONSUMING page's own surface background, not a design
// token — the ring's inner box-shadow has to match whatever surface the
// button actually sits on, which is inherently contextual to the page.
export function ringShadow(ctx) {
  const button = ctx.tokens.button;
  const focusWidth = ctx.resolve(button.primary.state.focused.ringWidth.$value);
  const focusOffset = ctx.resolve(button.primary.state.focused.ringOffset.$value);
  return `box-shadow: 0 0 0 ${ctx.px(focusOffset)} var(--bg-card) /* substitute your own surface color */, 0 0 0 calc(${ctx.px(focusOffset)} + ${ctx.px(focusWidth)}) ${ctx.cv("outline.accent")};`;
}

function variantCss(ctx, key) {
  const v = variants[key];
  const cv = ctx.cv;
  const restBg = v.fill ? cv(v.fill) : "transparent";
  return `.btn--${key} { background: ${restBg}; color: ${cv(v.text)}; }
.btn--${key} .btn__icon { color: ${cv(v.icon)}; }
.btn--${key}:not(:disabled):hover { background: ${cv(v.fillHover)}; }
${v.iconHover ? `.btn--${key}:not(:disabled):hover .btn__icon, .btn--${key}:not(:disabled):active .btn__icon { color: ${cv(v.iconHover)}; }\n` : ""}.btn--${key}:not(:disabled):active { background: ${cv(v.fillActive)}; }
.btn--${key}:not(:disabled):focus-visible { outline: none; ${ringShadow(ctx)} }
.btn--${key}:disabled { opacity: 0.5; cursor: not-allowed; }`;
}

// ---- sportsbook variants CSS (twoRow / roundIcon / betslip) ----
export function sbCss(ctx) {
  const { tokens, cv, resolve, px } = ctx;
  const button = tokens.button;
  const refP = (node) => node.$value.replace(/[{}]/g, "");
  const cvT = (node) => cv(refP(node));
  const dimT = (node) => px(resolve(node.$value));
  const typoCss = (node) => { const t = resolve(node.$value); return { weight: t.fontWeight, size: px(t.fontSize) }; };
  const tr = button.twoRow, ri = button.roundIcon, bs = button.betslip;
  const trP = { top: typoCss(tr.primary.topLabel), bottom: typoCss(tr.primary.bottomLabel) };
  const trS = { top: typoCss(tr.secondary.topLabel), bottom: typoCss(tr.secondary.bottomLabel) };
  const bsLabel = typoCss(bs.label);
  return `/* ---- sportsbook variants (from tokens/components/button.tokens.json: twoRow / roundIcon / betslip) ---- */
/* twoRow: a layout+typography modifier on top of .btn--primary / .btn--secondary — fill and hover/pressed come from those variants; only the rows, per-row type, and the secondary bottom color are twoRow-specific. */
.btn--tworow { flex-direction: column; align-items: center; justify-content: center; gap: ${dimT(tr.gap)}; padding: 0 ${dimT(tr.paddingX)}; border-radius: ${dimT(tr.radius)}; line-height: 1.2; }
.btn--tworow.btn--primary { height: ${dimT(tr.primary.height)}; }
.btn--tworow.btn--secondary { height: ${dimT(tr.secondary.height)}; }
.btn--tworow.btn--primary .btn__top { font-weight: ${trP.top.weight}; font-size: ${trP.top.size}; }
.btn--tworow.btn--primary .btn__bottom { font-weight: ${trP.bottom.weight}; font-size: ${trP.bottom.size}; }
.btn--tworow.btn--secondary .btn__top { font-weight: ${trS.top.weight}; font-size: ${trS.top.size}; }
.btn--tworow.btn--secondary .btn__bottom { font-weight: ${trS.bottom.weight}; font-size: ${trS.bottom.size}; color: ${cvT(tr.secondary.bottomLabelColor)}; }

/* roundIcon: circular icon-only, two sizes (base / xs) × two fills (outline / filled-neutral). */
.btn--round { border-radius: ${dimT(ri.radius)}; padding: 0; gap: 0; }
.btn--round-base { width: ${dimT(ri.size.base.box)}; height: ${dimT(ri.size.base.box)}; }
.btn--round-base .btn__icon { width: ${dimT(ri.size.base.iconSize)}; height: ${dimT(ri.size.base.iconSize)}; }
.btn--round-xs { width: ${dimT(ri.size.xs.box)}; height: ${dimT(ri.size.xs.box)}; }
.btn--round-xs .btn__icon { width: ${dimT(ri.size.xs.iconSize)}; height: ${dimT(ri.size.xs.iconSize)}; }
.btn--outline { background: transparent; border: 1px solid ${cvT(ri.outline.state.default.border)}; color: ${cvT(ri.outline.state.default.icon)}; }
.btn--outline:not(:disabled):hover { background: ${cvT(ri.outline.state.hover.fill)}; color: ${cvT(ri.outline.state.hover.icon)}; }
.btn--outline:not(:disabled):active { background: ${cvT(ri.outline.state.pressed.fill)}; color: ${cvT(ri.outline.state.pressed.icon)}; }
.btn--filled-neutral { background: ${cvT(ri.filledNeutral.state.default.fill)}; color: ${cvT(ri.filledNeutral.state.default.icon)}; }
.btn--filled-neutral:not(:disabled):hover { background: ${cvT(ri.filledNeutral.state.hover.fill)}; color: ${cvT(ri.filledNeutral.state.hover.icon)}; }
.btn--filled-neutral:not(:disabled):active { background: ${cvT(ri.filledNeutral.state.pressed.fill)}; color: ${cvT(ri.filledNeutral.state.pressed.icon)}; }

/* betslip: fully-rounded outline pill with a trailing counter (counter.onNeutral). */
.btn--betslip { box-sizing: border-box; border-radius: ${dimT(bs.radius)}; background: ${cvT(bs.state.default.fill)}; border: 1px solid ${cvT(bs.state.default.border)}; color: ${cvT(bs.state.default.label)}; gap: ${dimT(bs.gap)}; height: ${dimT(bs.height)}; padding: 0 ${dimT(bs.paddingX)}; font-weight: ${bsLabel.weight}; font-size: ${bsLabel.size}; }
.btn--betslip:not(:disabled):hover { background: ${cvT(bs.state.hover.fill)}; }
.btn--betslip:not(:disabled):active { background: ${cvT(bs.state.pressed.fill)}; }
.btn--tworow:disabled, .btn--round:disabled, .btn--betslip:disabled { opacity: 0.5; cursor: not-allowed; }`;
}

// ---- the core .btn stylesheet: base + size grid + primary/secondary/ghost —
// everything except the sportsbook variants (kept separate so a consumer that
// needs to interleave its own CSS between the core and sbCss can, same as the
// standalone Button doc page does with Counter). ----
export function coreCss(ctx) {
  const s = sizes(ctx);
  const radius = btnRadius(ctx);
  const cv = ctx.cv;
  return `.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  font-family: ${cv("family.sans")};
}
.btn__icon { flex-shrink: 0; }

${s
  .map(
    (sz) => `.btn--${sz.key} {
  height: ${ctx.px(sz.height)};
  padding: 0 ${ctx.px(sz.paddingX)};
  gap: ${ctx.px(sz.gap)};
  border-radius: ${radius};
  font-weight: ${sz.label.fontWeight};
  font-size: ${ctx.px(sz.label.fontSize)};
  line-height: ${sz.label.lineHeight};
}
.btn--${sz.key}.btn--icon-only { width: ${ctx.px(sz.height)}; padding: 0; }
.btn--${sz.key} .btn__icon { width: ${ctx.px(sz.iconSize)}; height: ${ctx.px(sz.iconSize)}; }`
  )
  .join("\n\n")}

${variantCss(ctx, "primary")}

${variantCss(ctx, "secondary")}

${variantCss(ctx, "ghost")}`;
}

// ---- the full real .btn stylesheet (core + sportsbook variants) — for a
// composing page that just wants "the whole real Button", no interleaving. ----
export function css(ctx) {
  return `${coreCss(ctx)}\n\n${sbCss(ctx)}`;
}

// ---- markup: the secondary two-row button (e.g. Input's trailing Max action,
// Summary's Max chip) — the same real .btn classes, never redrawn per caller. ----
export function twoRowSecondary({ top = "Max", bottom = "$1,000.50" } = {}) {
  return `<button class="btn btn--secondary btn--tworow"><span class="btn__top">${top}</span><span class="btn__bottom">${bottom}</span></button>`;
}

export { variantCss };
