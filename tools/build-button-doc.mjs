// Regenerates docs/button.html from tokens/components/button.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Colors are emitted as CSS custom properties (:root { --fill-primary: ...; })
// and every rule below references var(--x) — never a literal hex — so the
// printed CSS is real, retheme-able code, not a frozen snapshot of today's values.
// primary.size and secondary.size are duplicated in the token JSON (DTCG can't
// alias a whole sub-tree, only leaf values) — this build asserts they resolve
// identically and emits ONE shared `.btn--sm/base/lg` rule set, not two.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// The real .btn CSS/sizes/variants live in tools/lib/components/button.mjs —
// this page only adds its own Counter demo (interleaved between the core
// variants and the sportsbook variants, same order as before the refactor).
// Run: node tools/build-button-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";
import { createCtx } from "./lib/resolve.mjs";
import * as Button from "./lib/components/button.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const ctx = createCtx(["button", "counter"]);
const { resolve, resolveToken, get, px, cv, renderRootVars } = ctx;
const button = ctx.tokens.button;
const counter = ctx.tokens.counter;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- color tokens this page uses, as CSS custom properties ----
// (`cv` = "css var" — returns var(--x); shares the exact same name-mangling
// as the :root block below, via cssVarName, so they can't drift apart.)
const colorPaths = Button.colorPaths(ctx);
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans"); // e.g. "Rubik"
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

// ---- shared size grid (asserted identical across variants, in button.mjs) ----
const sizes = Button.sizes(ctx);
const ringShadow = Button.ringShadow(ctx);

// ---- resolve counter (needed for the icon+text+counter variant) ----
const counterRadius = px(resolve(counter.radius.$value));
const counterSizes = ["sm", "base", "lg"].map((key) => {
  const s = counter.size[key];
  return { key, height: resolve(s.height.$value), minWidth: resolve(s.minWidth.$value), paddingX: resolve(s.paddingX.$value), label: resolveToken(s.label) };
});
// button.primary pairs with counter.onPrimary, button.secondary with counter.onNeutral —
// onPrimary's colors (white "active" pill, dark-navy "inactive") don't work on a
// near-white gray button: the white pill barely shows and the navy reads as loud
// rather than quiet, so each button variant needs its matching counter surface.
const counterSurfaceFor = { primary: "onPrimary", secondary: "onNeutral", ghost: "onNeutral" };
const counterSurfaces = {
  onPrimary: { inactiveBg: "lighten.2", inactiveLabel: "text.forActiveBg" },
  onNeutral: { inactiveBg: "lighten.2", inactiveLabel: "text.default" },
};

// ---- icons (placeholders for the preview only) ----
const iconAdd = fs.readFileSync(path.join(root, "assets/icons/ui/plus.svg"), "utf8").replace("<svg ", '<svg class="btn__icon" ');
const iconArrow = fs.readFileSync(path.join(root, "assets/icons/ui/arrow-right.svg"), "utf8").replace("<svg ", '<svg class="btn__icon" ');
const iconChevronLeft = fs.readFileSync(path.join(root, "assets/icons/ui/arrow-left.svg"), "utf8").replace("<svg ", '<svg class="btn__icon" ');
const iconSwap = '<svg class="btn__icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>';

// ---- variant color mapping (from button.mjs, the single source Button.css() itself builds from) ----
const variants = Button.variants;

// ---- sportsbook token values this page still needs directly (for the "States
// — new variants" preview section's inline demo styles) — the actual sbCss
// CSS TEXT now comes from Button.sbCss(ctx), not re-derived here. ----
const refP = (node) => node.$value.replace(/[{}]/g, "");
const cvT = (node) => cv(refP(node));
const ri = button.roundIcon, bs = button.betslip;

// ---- the actual stylesheet — printed as code AND used to render the live preview ----
const css = `${rootVars}

${Button.coreCss(ctx)}

.counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  font-family: ${cv("family.sans")};
  font-weight: 700;
  border-radius: ${counterRadius};
}
${counterSizes
  .map(
    (cs) => `.counter--${cs.key} { height: ${px(cs.height)}; min-width: ${px(cs.minWidth)}; padding: 0 ${px(cs.paddingX)}; font-size: ${px(cs.label.fontSize)}; line-height: ${cs.label.lineHeight}; }`
  )
  .join("\n")}
${Object.entries(counterSurfaces)
  .map(([key, s]) => `.counter--${key}.counter--inactive { background: ${cv(s.inactiveBg)}; color: ${cv(s.inactiveLabel)}; }`)
  .join("\n")}

${Button.sbCss(ctx)}`;

// ---- markup builders: `live` uses real inline SVGs (for the rendered preview), `code` uses a short placeholder comment (for the printed snippet — a full path data dump isn't useful as a code sample) ----
function content(variant, kind, live) {
  const ic = (svg, name) => (live ? svg : `<svg class="btn__icon"><!-- icon: ${name} --></svg>`);
  switch (kind) {
    case "text":
      return "Label";
    case "icon-left":
      return `${ic(iconAdd, "add")}\n  Label`;
    case "icon-only":
      return ic(iconAdd, "add");
    case "icon-both":
      return `${ic(iconAdd, "add")}\n  Label\n  ${ic(iconArrow, "arrow_forward")}`;
    case "counter": {
      const surface = counterSurfaceFor[variant];
      return `${ic(iconAdd, "add")}\n  Label\n  <span class="counter counter--${"__SIZE__"} counter--${surface} counter--inactive">0</span>`;
    }
  }
}
function markup(variant, size, kind, live) {
  const classes = ["btn", `btn--${variant}`, `btn--${size}`];
  if (kind === "icon-only") classes.push("btn--icon-only");
  const attrs = kind === "icon-only" ? ' aria-label="Icon only"' : "";
  const inner = content(variant, kind, live).replace("__SIZE__", size);
  return live
    ? `<button class="${classes.join(" ")}"${attrs}>${inner}</button>`
    : `<button class="${classes.join(" ")}"${attrs}>\n  ${inner}\n</button>`;
}

const contentVariants = [
  { key: "text", label: "Text only" },
  { key: "icon-left", label: "Icon left + text" },
  { key: "icon-only", label: "Icon only (square)" },
  { key: "icon-both", label: "Icon left + text + icon right" },
  { key: "counter", label: "Icon left + text + counter right" },
];

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

function sizeStories(variant) {
  return sizes.map((s) => storyCard(`${s.key} — ${px(s.height)}`, markup(variant, s.key, "icon-left", true), markup(variant, s.key, "icon-left", false))).join("\n");
}
function variantStories(variant) {
  return contentVariants
    .map((vr) => storyCard(vr.label, markup(variant, "base", vr.key, true), markup(variant, "base", vr.key, false), vr.key === "icon-only" ? "Square — width equals height, no horizontal padding. Needs an <code>aria-label</code> since there's no visible text." : ""))
    .join("\n");
}

function stateSnippets(variant) {
  const v = variants[variant];
  return {
    default: `.btn--${variant} {\n  background: ${v.fill ? cv(v.fill) : "transparent"};\n}`,
    hover: `.btn--${variant}:hover {\n  background: ${cv(v.fillHover)};\n}`,
    pressed: `.btn--${variant}:active {\n  background: ${cv(v.fillActive)};\n}`,
    focused: `.btn--${variant}:focus-visible {\n  outline: none;\n  ${ringShadow}\n}`,
    disabled: `.btn--${variant}:disabled {\n  background: ${v.fill ? cv("fill.disabled") : "transparent"};\n  color: ${cv("text.disabled")};\n}`,
  };
}
function stateStory(variant, name, extraStyle, disabled) {
  const v = variants[variant];
  // the real :hover turns the icon white (v.iconHover) — the forced-state demo uses
  // an inline style, not a real :hover, so inject that same colour onto the icon here
  const icon = (name === "hover" || name === "pressed") && v.iconHover ? iconAdd.replace("<svg ", `<svg style="color:${cv(v.iconHover)}" `) : iconAdd;
  const html = `<button class="btn btn--${variant} btn--base"${disabled ? " disabled" : ""} style="${extraStyle}">${icon}\n    Label</button>`;
  return storyCard(name, html, stateSnippets(variant)[name]);
}
function stateStories(variant) {
  const v = variants[variant];
  return [
    stateStory(variant, "default", ""),
    stateStory(variant, "hover", `background:${cv(v.fillHover)}`),
    stateStory(variant, "pressed", `background:${cv(v.fillActive)}`),
    stateStory(variant, "focused", ringShadow),
    stateStory(variant, "disabled", "", true),
  ].join("\n");
}

function variantSection(key) {
  const v = variants[key];
  return `
    <h2 class="big-section">${v.label}</h2>
    <h3 class="mid-section">Sizes</h3>
    <p class="section-desc">Size and content variant are independent — any of the 5 variants below works at any of these 3 sizes. Shown here with the icon-left+text variant as the reference.</p>
    <div class="story-grid">
      ${sizeStories(key)}
    </div>

    <h3 class="mid-section">Content variants</h3>
    <p class="section-desc">All 5 at base (40px) size. Icons shown (add / arrow_forward) are stand-ins for preview only — the real icon per button is decided when a concrete use case is composed. The counter variant uses <a href="counter.html">counter.${counterSurfaceFor[key]}</a>, matching this button's own fill.</p>
    <div class="story-grid">
      ${variantStories(key)}
    </div>

    <h3 class="mid-section">States</h3>
    <p class="section-desc">Base size, icon-left+text variant. Default/hover/pressed/focused are one shared markup with different pseudo-classes applied — disabled is the one real attribute (<code class="tok">disabled</code>) that also flips the label/icon color and drops the cursor.${key === "secondary" ? " fill.disabled equals fill.neutral (both gray.100), so disabled here only changes the label/icon color, not the background — see the token's own note." : ""}${key === "ghost" ? " Ghost has no background at rest, so disabled stays transparent too — it never had a fill to lose." : ""}</p>
    <div class="story-grid">
      ${stateStories(key)}
    </div>`;
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Button</title>
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
  .sub { font-size: 14px; color: var(--text-secondary); margin: 0 0 2.5rem; }
  h2.big-section { font-size: 24px; font-weight: 700; margin: 5.5rem 0 1.5rem; letter-spacing: -0.01em; padding-top: 2.5rem; border-top: 1px solid var(--border); }
  h2.big-section:first-of-type { margin-top: 3rem; padding-top: 0; border-top: none; }
  h3.mid-section { font-size: 17px; font-weight: 600; margin: 3rem 0 0.6rem; }
  h3.mid-section:first-of-type { margin-top: 1.5rem; }
  .section-desc { font-size: 13.5px; color: var(--text-secondary); margin: -0.5rem 0 1.5rem; max-width: 68ch; line-height: 1.6; }

  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 14px 18px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1rem; line-height: 1.6; }
  .legend .row { display: flex; gap: 14px; padding: 6px 0; border-bottom: 0.5px solid var(--border); }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 150px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  code.tok { font-family: var(--mono); font-size: 12px; color: var(--accent); }

  pre.code { background: var(--code-bg); color: var(--code-text); border-radius: 10px; padding: 16px 18px; margin: 0; overflow-x: auto; font-family: var(--mono); font-size: 12px; line-height: 1.7; }
  pre.code code { font-family: inherit; }

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 64px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }
  .story-note code.tok { font-size: 11px; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("button")}
  </nav>
  <main>
    <h1>Button</h1>
    <p class="sub">tokens/components/button.tokens.json · Primary + Secondary + Ghost variants · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties (<code class="tok">var(--fill-primary)</code> etc.), not literal hex — retune a token, regenerate, and every rule that references it updates together.</p>

    <div class="legend">
      <div class="row"><b>Sizes</b><span>sm 32px / base 40px (default) / lg 48px — shared by all three variants, byte-for-byte identical (asserted at build time). paddingX and iconSize scale with height on the same 4px grid the size step itself moves on; the 8px icon↔label gap is flat at every size, per spec.</span></div>
      <div class="row"><b>Icon size</b><span>16 / 20 / 24px — resolves to exactly 50% of button height at every size, which is why it self-scales instead of needing separate tuning as more sizes get added later.</span></div>
      <div class="row"><b>Icon-only</b><span>Square (width = height), no paddingX/gap — the icon centers directly in the box.</span></div>
      <div class="row"><b>Radius</b><span>radius.default (8px) at every size — constant, doesn't scale with height, so the corner reads the same across sm/base/lg.</span></div>
      <div class="row"><b>Primary vs Secondary vs Ghost</b><span>Same size/state/content-variant grid, three color roles: primary → fill.primary (brand blue, highest emphasis). secondary → fill.neutral (gray fill — fill.neutral's own token description calls it out as the intended secondary-button fill). ghost → no fill or border at rest, the quietest tier — reuses the same transparent→fill.neutralHover→fill.neutralActive progression already established by pagination's page-item and tabs' segmented style.</span></div>
      <div class="row"><b>States</b><span>default → variant's fill (or transparent, for ghost) · hover → fillHover · pressed → fillActive · focused → additive ${px(ctx.resolve(button.primary.state.focused.ringWidth.$value))} ring (border.focus) with ${px(ctx.resolve(button.primary.state.focused.ringOffset.$value))} offset, composes on top of any of the three · disabled → fill.disabled + text.disabled + icon.disabled (ghost stays transparent, no fill to lose).</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">One <code class="tok">:root</code> block of color custom properties, then a shared <code class="tok">.btn</code> base + <code class="tok">--sm/--base/--lg</code> size modifiers (used by all three variants — sizes are identical), then <code class="tok">.btn--primary</code> / <code class="tok">.btn--secondary</code> / <code class="tok">.btn--ghost</code> color modifiers. States are plain pseudo-classes, not separate classes. Dimensions (height/padding/gap/font-size) stay literal px in the size modifiers — those are baked layout decisions per size, not values a consumer re-themes at runtime the way colors are.</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    ${variantSection("primary")}
    ${variantSection("secondary")}
    ${variantSection("ghost")}

    <h2 class="big-section">Sportsbook variants</h2>
    <p class="section-desc">Product-specific buttons from the Figma library, on top of the primary/secondary/ghost core. All share the same state model (default · hover · pressed · disabled = 50% opacity).</p>
    <div class="story-grid">
      ${storyCard("Two-row — primary", `<button class="btn btn--primary btn--tworow"><span class="btn__top">Popular bet $20</span><span class="btn__bottom">Win $941.2!</span></button>`, `<button class="btn btn--primary btn--tworow">\n  <span class="btn__top">Popular bet $20</span>\n  <span class="btn__bottom">Win $941.2!</span>\n</button>`, "A hero bet button — a small top label over a large bold value. Uses the active fill (gradient in themes that define one).")}
      ${storyCard("Two-row — secondary", `<button class="btn btn--secondary btn--tworow"><span class="btn__top">Max</span><span class="btn__bottom">$1,000,99</span></button>`, `<button class="btn btn--secondary btn--tworow">\n  <span class="btn__top">Max</span>\n  <span class="btn__bottom">$1,000,99</span>\n</button>`, "Neutral two-row — e.g. a max-stake shortcut.")}
      ${storyCard("Round icon — outline (base / xs)", `<div style="display:flex; gap:16px; align-items:center;"><button class="btn btn--round btn--round-base btn--outline" aria-label="Back">${iconChevronLeft}</button><button class="btn btn--round btn--round-xs btn--outline" aria-label="Back">${iconChevronLeft}</button></div>`, `<button class="btn btn--round btn--round-base btn--outline" aria-label="Back">\n  <!-- icon: chevron_left -->\n</button>`, "Circular icon button with an outline, transparent fill — back/nav. Two sizes (40 / 24).")}
      ${storyCard("Round icon — filled (widget)", `<button class="btn btn--round btn--round-base btn--filled-neutral" aria-label="Swap">${iconSwap}</button>`, `<button class="btn btn--round btn--round-base btn--filled-neutral" aria-label="Swap">\n  <!-- icon: swap -->\n</button>`, "Circular icon button, filled neutral surface — a betslip/widget toggle.")}
      ${storyCard("Betslip pill", `<button class="btn btn--betslip">Betslip <span class="counter counter--base counter--onNeutral counter--inactive">0</span></button>`, `<button class="btn btn--betslip">\n  Betslip\n  <span class="counter counter--base counter--onNeutral counter--inactive">0</span>\n</button>`, "A fully-rounded pill with a trailing bet-count counter (onNeutral).")}
    </div>

    <h3 class="mid-section">States — new variants</h3>
    <p class="section-desc">These variants differ from primary/secondary/ghost, so their states are shown explicitly: default · hover · pressed · disabled (50% opacity). Left→right in each row.</p>
    <div class="story-grid">
      ${storyCard("Round — outline", `<div style="display:flex; gap:20px; align-items:center;"><button class="btn btn--round btn--round-base btn--outline" aria-label="default">${iconChevronLeft}</button><button class="btn btn--round btn--round-base btn--outline" aria-label="hover" style="background:${cvT(ri.outline.state.hover.fill)}; color:${cvT(ri.outline.state.hover.icon)}">${iconChevronLeft}</button><button class="btn btn--round btn--round-base btn--outline" aria-label="pressed" style="background:${cvT(ri.outline.state.pressed.fill)}; color:${cvT(ri.outline.state.pressed.icon)}">${iconChevronLeft}</button><button class="btn btn--round btn--round-base btn--outline" aria-label="disabled" disabled>${iconChevronLeft}</button></div>`, "default · hover (lighten-2 bg + white icon) · pressed (darken-2) · disabled")}
      ${storyCard("Round — filled", `<div style="display:flex; gap:20px; align-items:center;"><button class="btn btn--round btn--round-base btn--filled-neutral" aria-label="default">${iconSwap}</button><button class="btn btn--round btn--round-base btn--filled-neutral" aria-label="hover" style="background:${cvT(ri.filledNeutral.state.hover.fill)}; color:${cvT(ri.filledNeutral.state.hover.icon)}">${iconSwap}</button><button class="btn btn--round btn--round-base btn--filled-neutral" aria-label="pressed" style="background:${cvT(ri.filledNeutral.state.pressed.fill)}; color:${cvT(ri.filledNeutral.state.pressed.icon)}">${iconSwap}</button><button class="btn btn--round btn--round-base btn--filled-neutral" aria-label="disabled" disabled>${iconSwap}</button></div>`, "default · hover (+white icon) · pressed · disabled")}
      ${storyCard("Betslip pill", `<div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;"><button class="btn btn--betslip">Betslip <span class="counter counter--base counter--onNeutral counter--inactive">0</span></button><button class="btn btn--betslip" style="background:${cvT(bs.state.hover.fill)}">Betslip <span class="counter counter--base counter--onNeutral counter--inactive">0</span></button><button class="btn btn--betslip" style="background:${cvT(bs.state.pressed.fill)}">Betslip <span class="counter counter--base counter--onNeutral counter--inactive">0</span></button><button class="btn btn--betslip" disabled>Betslip <span class="counter counter--base counter--onNeutral counter--inactive">0</span></button></div>`, "default (surface-2 + surface-4 border) · hover (surface-4) · pressed (surface-6) · disabled")}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/button.html"), html);
console.log("wrote docs/button.html");
