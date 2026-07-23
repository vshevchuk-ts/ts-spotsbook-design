// Regenerates docs/tabs.html from tokens/components/tabs.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Two styles (segmented pill-track, underline) share one size grid and one set
// of content variants. The counter variant reuses tokens/components/counter.tokens.json's
// onNeutral surface directly rather than defining new counter colors.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-tabs-doc.mjs
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
const tabs = load("tokens/components/tabs.tokens.json").component.tabs;
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
const colorPaths = [
  "text.secondary", "text.default", "text.disabled", "fill.neutralHover", "fill.neutralPressed", "surface.raised", "surface.card",
  "outline.default", "outline.active", "text.onFill", "text.forActiveBg", "fill.active", "icon.default", "icon.disabled", "color.base.secondary", "text.contrast", "color.white", "bg.active",
  "bg.active",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

// ---- shared item + size grid ----
const itemGap = px(resolve(tabs.item.gap.$value));
const itemLabel = resolveToken(tabs.item.label);
const activeWeightSegmented = resolve(tabs.segmented.state.active.fontWeight.$value);
const sizes = ["sm", "base"].map((key) => {
  const s = tabs.size[key];
  return { key, height: resolve(s.height.$value), paddingX: resolve(s.paddingX.$value), iconSize: resolve(s.iconSize.$value) };
});

// ---- segmented ----
const seg = {
  trackBg: resolve("surface.raised"),
  trackRadius: px(resolve(tabs.segmented.trackRadius.$value)),
  trackPadding: px(resolve(tabs.segmented.trackPadding.$value)),
  pillRadius: px(resolve(tabs.segmented.pillRadius.$value)),
};

// ---- underline ----
const und = { gap: px(resolve(tabs.underline.gap.$value)) };

// ---- counter (reused from component.counter.onNeutral — resolved from that
// token's own state values, not retyped by hand, so it can't silently drift) ----
const counterRadius = px(resolve(counter.radius.$value));
const counterSizes = ["sm", "base"].map((key) => {
  const s = counter.size[key];
  return { key, height: resolve(s.height.$value), minWidth: resolve(s.minWidth.$value), paddingX: resolve(s.paddingX.$value), label: resolveToken(s.label) };
});
// $value on each of these is itself a path string like "{fill.neutralPressed}" —
// read as-is (not resolved to hex) so it can be fed straight into cv() below.
const stripBraces = (s) => s.replace(/[{}]/g, "");
const counterOnNeutralPaths = {
  inactiveBg: stripBraces(counter.onNeutral.state.inactive.bg.$value),
  inactiveLabel: stripBraces(counter.onNeutral.state.inactive.label.$value),
  activeBg: stripBraces(counter.onNeutral.state.active.bg.$value),
  activeLabel: stripBraces(counter.onNeutral.state.active.label.$value),
};

const iconInbox = fs.readFileSync(path.join(root, "assets/icons/material-filled/mail.svg"), "utf8").replace("<svg ", '<svg class="tab__icon" ');

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.tab { display: inline-flex; align-items: center; justify-content: center; gap: ${itemGap}; border: none; background: transparent; cursor: pointer; white-space: nowrap; color: ${cv("text.secondary")}; font-family: ${cv("family.sans")}; ${typoCss(itemLabel)} }
.tab__icon { flex-shrink: 0; color: ${cv("icon.default")}; }

${sizes
  .map((s) => `.tab--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; }
.tab--${s.key} .tab__icon { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }`)
  .join("\n")}

.tabs--segmented { display: inline-flex; align-items: center; gap: ${seg.trackPadding}; background: ${cv("surface.raised")}; border-radius: ${seg.trackRadius}; padding: ${seg.trackPadding}; max-width: 100%; overflow-x: auto; }
.tabs--segmented .tab { border-radius: ${seg.pillRadius}; }
.tabs--segmented .tab:not(.tab--active):not(.tab--disabled):hover { background: ${cv("fill.neutralHover")}; color: ${cv("text.default")}; }
.tabs--segmented .tab--active { background: ${cv("bg.active")}; border: 1px solid ${cv("outline.active")}; color: ${cv("text.default")}; font-weight: ${activeWeightSegmented}; }
.tabs--segmented .tab--disabled { color: ${cv("text.disabled")}; cursor: not-allowed; }
.tabs--segmented .tab--disabled .tab__icon, .tabs--underline .tab--disabled .tab__icon { color: ${cv("icon.disabled")}; }

.tabs--underline { display: inline-flex; align-items: stretch; gap: ${und.gap}; border-bottom: 1px solid ${cv("outline.default")}; max-width: 100%; overflow-x: auto; }
.tabs--underline .tab { border-bottom: 2px solid transparent; margin-bottom: -1px; border-radius: ${seg.pillRadius} ${seg.pillRadius} 0 0; }
.tabs--underline .tab:not(.tab--active):not(.tab--disabled):hover { background: ${cv("fill.neutralHover")}; color: ${cv("text.default")}; }
.tabs--underline .tab--active { color: ${cv("text.default")}; font-weight: ${activeWeightSegmented}; border-bottom-color: ${cv("outline.active")}; }
.tabs--underline .tab--disabled { color: ${cv("text.disabled")}; cursor: not-allowed; }

.counter { display: inline-flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums; font-family: ${cv("family.sans")}; font-weight: 700; border-radius: ${counterRadius}; }
${counterSizes.map((cs) => `.counter--${cs.key} { height: ${px(cs.height)}; min-width: ${px(cs.minWidth)}; padding: 0 ${px(cs.paddingX)}; font-size: ${px(cs.label.fontSize)}; line-height: ${cs.label.lineHeight}; }`).join("\n")}
.counter--onNeutral.counter--inactive { background: ${cv(counterOnNeutralPaths.inactiveBg)}; color: ${cv(counterOnNeutralPaths.inactiveLabel)}; }
.counter--onNeutral.counter--active { background: ${cv(counterOnNeutralPaths.activeBg)}; color: ${cv(counterOnNeutralPaths.activeLabel)}; }`;

// ---- markup ----
function tabItem({ style, size, state = "default", content = "text", label = "Label", count = "4", live = true }) {
  const classes = ["tab", `tab--${style}`, `tab--${size}`];
  if (state === "active") classes.push("tab--active");
  if (state === "disabled") classes.push("tab--disabled");
  const attrs = [state === "active" ? ' aria-selected="true"' : "", state === "disabled" ? " disabled" : ""].join("");
  const hasIcon = content === "icon-left" || content === "icon-counter" || content === "icon-only";
  const hasCounter = content === "counter" || content === "icon-counter";
  const hasLabel = content !== "icon-only";
  const icon = hasIcon ? (live ? iconInbox : `<svg class="tab__icon"><!-- icon: mail --></svg>`) : "";
  const labelHtml = hasLabel ? `<span class="tab__label">${label}</span>` : "";
  const counterState = state === "active" ? "active" : "inactive";
  const counterHtml = hasCounter ? `<span class="counter counter--${size} counter--onNeutral counter--${counterState}">${count}</span>` : "";
  if (content === "icon-only") return `<button class="${classes.join(" ")}"${attrs} aria-label="${label}">${icon}</button>`;
  return `<button class="${classes.join(" ")}"${attrs}>${icon}${labelHtml}${counterHtml}</button>`;
}
function tabBar(style, size, items, live) {
  return `<div class="tabs tabs--${style} tabs--${size}">${items.map((it) => tabItem({ style, size, live, ...it })).join("")}</div>`;
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

const styleStories = [
  storyCard(
    "Segmented",
    tabBar("segmented", "base", [{ label: "Inbox", content: "counter", state: "default" }, { label: "Resolved", state: "active" }], true),
    tabBar("segmented", "base", [{ label: "Inbox", content: "counter", state: "default" }, { label: "Resolved", state: "active" }], false),
    "Active tab raised on a white pill (surface.default) over the sunken track."
  ),
  storyCard(
    "Underline",
    tabBar("underline", "base", [{ label: "Inbox", state: "active" }, { label: "Archived", state: "default" }], true),
    tabBar("underline", "base", [{ label: "Inbox", state: "active" }, { label: "Archived", state: "default" }], false),
    "Active tab marked by a 2px border.focus bar over the 1px baseline."
  ),
].join("\n");

const sizeStories = sizes
  .map((s) => storyCard(`${s.key} — ${px(s.height)}`, tabBar("segmented", s.key, [{ label: "Inbox", content: "icon-left", state: "default" }, { label: "Resolved", state: "active" }], true), tabBar("segmented", s.key, [{ label: "Inbox", content: "icon-left", state: "default" }, { label: "Resolved", state: "active" }], false)))
  .join("\n");

const contentVariants = [
  { key: "text", label: "Text only", content: "text" },
  { key: "icon-left", label: "Icon left + text", content: "icon-left" },
  { key: "counter", label: "With counter", content: "counter" },
  { key: "icon-counter", label: "Icon + counter", content: "icon-counter" },
  { key: "icon-only", label: "Icon only", content: "icon-only" },
].map((v) => storyCard(v.label, tabItem({ style: "segmented", size: "base", content: v.content, label: "Inbox", state: "active", live: true }), tabItem({ style: "segmented", size: "base", content: v.content, label: "Inbox", state: "active", live: false })))
  .join("\n");

const stateDefs = [
  { key: "default", label: "default" },
  { key: "hover", label: "hover" },
  { key: "active", label: "active (selected)" },
  { key: "disabled", label: "disabled" },
];
// A bare .tab renders no background/indicator of its own — the hover/active
// rules are all scoped as descendant selectors (.tabs--segmented .tab, etc),
// and segmented's track fill only exists on the .tabs--segmented parent, so
// every example needs the real wrapper or it's invisible text on white.
function styleStateStories(style) {
  const wrap = (inner) => `<div class="tabs tabs--${style} tabs--base">${inner}</div>`;
  return stateDefs
    .map((s) => {
      const opts = { style, size: "base", content: "text", label: "Inbox", state: s.key === "hover" ? "default" : s.key };
      const baseClass = `tab tab--${style} tab--base`;
      const finalClass = s.key === "hover" ? `tab tab--${style} tab--base tab--hover-demo` : baseClass;
      const live = wrap(tabItem({ ...opts, live: true }).replace(`class="${baseClass}"`, `class="${finalClass}"`));
      const code = wrap(tabItem({ ...opts, live: false }).replace(`class="${baseClass}"`, `class="${finalClass}"`));
      return storyCard(s.label, live, code);
    })
    .join("\n");
}
const stateStories = styleStateStories("segmented");
const underlineStateStories = styleStateStories("underline");

const manyTabs = tabBar(
  "underline",
  "base",
  ["Overview", "Analytics", "Reports", "Notifications", "Team", "Billing", "Integrations", "Settings"].map((label) => ({ label, state: label === "Overview" ? "active" : "default" })),
  true
);

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Tabs</title>
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

  .full-bar-demo { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 16px; max-width: 480px; }
  .full-bar-demo .story-preview { justify-content: flex-start; padding: 4px 0; }

  /* .tab.tab--hover-demo (compound, not a single class) so this beats the
     later-defined, equal-specificity .tab base rule on source order alone —
     the actual bug: a single-class .tab--hover-demo lost that tie silently. */
  .tab.tab--hover-demo { background: ${cv("fill.neutralHover")}; color: ${cv("text.default")}; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("tabs")}
  </nav>
  <main>
    <h1>Tabs</h1>
    <p class="sub">tokens/components/tabs.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Two styles</b><span>Segmented (pill track, active tab raised on a white pill) and underline (plain text, active tab marked by a 2px bottom bar) — per the two reference screenshots.</span></div>
      <div class="row"><b>Sizes</b><span>sm 32px / base 40px (no lg — a two-size control, unlike button/input/select/search). Label text stays a flat 14px at both sizes; only icon size and padding scale.</span></div>
      <div class="row"><b>Counter</b><span>Reuses component.counter's onNeutral surface as-is — inactive tab → quiet gray, active tab → pops blue. Same tokens already built for the secondary button, repurposed for tab-selection instead of notification-freshness.</span></div>
      <div class="row"><b>Tab count</b><span>No hard limit enforced by the component — a content decision, not a design token. The tab list scrolls horizontally (overflow-x: auto) if it overflows its container. Practical guideline: 5-7 tabs is comfortable in one row; beyond that, expect scrolling or consider a different pattern (a "more" menu, a select).</span></div>
      <div class="row"><b>States</b><span>default → text.secondary · hover → darker text (+ bg on segmented) · active (selected) → text.default + semibold + the style's own indicator · disabled → text.disabled, no hover.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Styles</h2>
    <div class="story-grid">
      ${styleStories}
    </div>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">Segmented style shown at both sizes — underline scales identically (same size grid).</p>
    <div class="story-grid">
      ${sizeStories}
    </div>

    <h2 class="big-section">Content variants</h2>
    <p class="section-desc">Base size, segmented, active tab — same 5 variants apply to underline and to inactive tabs identically.</p>
    <div class="story-grid">
      ${contentVariants}
    </div>

    <h2 class="big-section">States — segmented</h2>
    <p class="section-desc">Base size, text-only. Wrapped in the real track — a bare .tab has no background of its own.</p>
    <div class="story-grid">
      ${stateStories}
    </div>

    <h2 class="big-section">States — underline</h2>
    <p class="section-desc">Base size, text-only. Hover gets the same fill.neutralHover pill segmented uses — darkening the text alone (the first draft of this) was hard to notice, so hover now gets a background too, matching common practice (GitHub, Notion, Linear all give underline-style tab hover a light background, reserving the colored bar for the active tab only).</p>
    <div class="story-grid">
      ${underlineStateStories}
    </div>

    <h2 class="big-section">Many tabs</h2>
    <p class="section-desc">8 tabs in a 480px-wide container — demonstrates the horizontal-scroll fallback rather than a hard cap.</p>
    <div class="full-bar-demo">
      <div class="story-preview">${manyTabs}</div>
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/tabs.html"), html);
console.log("wrote docs/tabs.html");
