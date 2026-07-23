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
// Run: node tools/build-button-doc.mjs
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
const button = load("tokens/components/button.tokens.json").component.button;
const counter = load("tokens/components/counter.tokens.json").component.counter;

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

// ---- color tokens this page uses, as CSS custom properties ----
// (`cv` = "css var" — returns var(--x); shares the exact same name-mangling
// as the :root block below, via cssVarName, so they can't drift apart.)
const colorPaths = [
  "fill.active", "fill.activeHover", "fill.activePressed", "text.onFill", "icon.onFill", "text.forActiveBg", "icon.forActiveBg",
  "fill.neutral", "fill.neutralHover", "fill.neutralPressed", "text.default", "icon.default",
  "text.secondary", "icon.secondary",
  "fill.disabled", "text.disabled", "icon.disabled",
  "outline.active", "color.white", "text.active",
  "color.base.secondary", "text.contrast",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans"); // e.g. "Rubik"
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

// ---- resolve shared size grid (asserted identical across variants) ----
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
const sizes = primarySizes; // identical across all three variants, asserted above — one shared size grid
const btnRadius = px(resolve(button.primary.radius.$value));

const focusWidth = resolve(button.primary.state.focused.ringWidth.$value);
const focusOffset = resolve(button.primary.state.focused.ringOffset.$value);
// var(--bg-card) here is this docs page's own card background, not a design
// token — the ring's inner box-shadow has to match whatever surface the button
// actually sits on, which is inherently contextual. Called out explicitly in
// the printed comment below so nobody copies --bg-card expecting it to exist.
const ringShadow = `box-shadow: 0 0 0 ${px(focusOffset)} var(--bg-card) /* substitute your own surface color */, 0 0 0 calc(${px(focusOffset)} + ${px(focusWidth)}) ${cv("outline.active")};`;

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
  onPrimary: { inactiveBg: "color.base.secondary", inactiveLabel: "text.contrast" },
  onNeutral: { inactiveBg: "color.base.secondary", inactiveLabel: "text.contrast" },
};

// ---- icons (placeholders for the preview only) ----
const iconAdd = fs.readFileSync(path.join(root, "assets/icons/material-filled/add.svg"), "utf8").replace("<svg ", '<svg class="btn__icon" ');
const iconArrow = fs.readFileSync(path.join(root, "assets/icons/material-filled/arrow_forward.svg"), "utf8").replace("<svg ", '<svg class="btn__icon" ');

// ---- variant color mapping ----
// fill: null means "no fill token — literal transparent", used by ghost (no
// background at rest, and disabled shouldn't suddenly gain one it never had).
const variants = {
  primary: { label: "Primary", fill: "fill.active", fillHover: "fill.activeHover", fillActive: "fill.activePressed", text: "text.forActiveBg", icon: "icon.forActiveBg" },
  secondary: { label: "Secondary", fill: "fill.neutral", fillHover: "fill.neutralHover", fillActive: "fill.neutralPressed", text: "text.default", icon: "icon.default" },
  ghost: { label: "Ghost", fill: null, fillHover: "fill.neutralHover", fillActive: "fill.neutralPressed", text: "text.secondary", icon: "icon.secondary" },
};

function variantCss(key) {
  const v = variants[key];
  const restBg = v.fill ? cv(v.fill) : "transparent";
  const disabledBg = v.fill ? cv("fill.disabled") : "transparent";
  return `.btn--${key} { background: ${restBg}; color: ${cv(v.text)}; }
.btn--${key} .btn__icon { color: ${cv(v.icon)}; }
.btn--${key}:not(:disabled):hover { background: ${cv(v.fillHover)}; }
.btn--${key}:not(:disabled):active { background: ${cv(v.fillActive)}; }
.btn--${key}:not(:disabled):focus-visible { outline: none; ${ringShadow} }
.btn--${key}:disabled { background: ${disabledBg}; color: ${cv("text.disabled")}; cursor: not-allowed; }
.btn--${key}:disabled .btn__icon { color: ${cv("icon.disabled")}; }`;
}

// ---- the actual stylesheet — printed as code AND used to render the live preview ----
const css = `${rootVars}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  font-family: ${cv("family.sans")};
}
.btn__icon { flex-shrink: 0; }

${sizes
  .map(
    (s) => `.btn--${s.key} {
  height: ${px(s.height)};
  padding: 0 ${px(s.paddingX)};
  gap: ${px(s.gap)};
  border-radius: ${btnRadius};
  font-weight: ${s.label.fontWeight};
  font-size: ${px(s.label.fontSize)};
  line-height: ${s.label.lineHeight};
}
.btn--${s.key}.btn--icon-only { width: ${px(s.height)}; padding: 0; }
.btn--${s.key} .btn__icon { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }`
  )
  .join("\n\n")}

${variantCss("primary")}

${variantCss("secondary")}

${variantCss("ghost")}

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
  .join("\n")}`;

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
      return `${ic(iconAdd, "add")}\n  Label\n  <span class="counter counter--${"__SIZE__"} counter--${surface} counter--inactive">3</span>`;
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
  const html = `<button class="btn btn--${variant} btn--base"${disabled ? " disabled" : ""} style="${extraStyle}">${iconAdd}\n    Label</button>`;
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
      <div class="row"><b>States</b><span>default → variant's fill (or transparent, for ghost) · hover → fillHover · pressed → fillActive · focused → additive ${px(focusWidth)} ring (border.focus) with ${px(focusOffset)} offset, composes on top of any of the three · disabled → fill.disabled + text.disabled + icon.disabled (ghost stays transparent, no fill to lose).</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">One <code class="tok">:root</code> block of color custom properties, then a shared <code class="tok">.btn</code> base + <code class="tok">--sm/--base/--lg</code> size modifiers (used by all three variants — sizes are identical), then <code class="tok">.btn--primary</code> / <code class="tok">.btn--secondary</code> / <code class="tok">.btn--ghost</code> color modifiers. States are plain pseudo-classes, not separate classes. Dimensions (height/padding/gap/font-size) stay literal px in the size modifiers — those are baked layout decisions per size, not values a consumer re-themes at runtime the way colors are.</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    ${variantSection("primary")}
    ${variantSection("secondary")}
    ${variantSection("ghost")}

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/button.html"), html);
console.log("wrote docs/button.html");
