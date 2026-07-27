// Regenerates docs/toast.html from tokens/components/toast.tokens.json.
// Transient top-docked notification — 'Betslip loaded', 'Betslip cleared' (Undo),
// 'Quick Bet mode active', 'Share link copied'. On a raised grey surface, with a
// status icon, bold title + optional subtitle, optional Undo action and/or close,
// and an optional auto-dismiss progress bar tinted to the role. Colours become
// --tok-* CSS custom properties; the generated <style> IS the printed "CSS".
// Run: node tools/build-toast-doc.mjs
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
const toast = load("tokens/components/toast.tokens.json").component.toast;

const registry = {
  color: colorPrim, spacing: dim, radius: radiusPrim,
  family: typo.family, weight: typo.weight, size: typo.size,
  leading: typo.leading, tracking: typo.tracking,
  "text-style": textStyle, ...semantic,
};
function get(ref) { const parts = ref.replace(/[{}]/g, "").split("."); let node = registry; for (const p of parts) node = node[p]; return node; }
function resolveValue(v) { if (typeof v === "string" && v.startsWith("{")) return resolveToken(get(v)); return v; }
function resolveToken(node) {
  const v = node.$value;
  if (v && typeof v === "object" && !("value" in v)) { const out = {}; for (const [k, sub] of Object.entries(v)) out[k] = resolveValue(sub); return out; }
  if (v && typeof v === "object" && "value" in v) return v;
  return resolveValue(v);
}
const resolve = (ref) => resolveToken(get(ref));
const px = (d) => `${d.value}${d.unit}`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;

const colorPaths = [
  "surface.raised", "outline.default",
  "text.default", "text.secondary", "text.forActiveBg",
  "icon.positive", "icon.warning", "icon.secondary",
  "fill.positive", "fill.warning", "fill.neutral", "fill.active", "fill.activeHover",
  "lighten.2",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

function typoCss(node) { const t = resolveToken(node); return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`; }
const radius = px(resolve(toast.radius.$value));
const padX = px(resolve(toast.paddingX.$value));
const padY = px(resolve(toast.paddingY.$value));
const gap = px(resolve(toast.gap.$value));
const iconSize = px(resolve(toast.iconSize.$value));
const titleCss = typoCss(toast.title);
const subtitleCss = typoCss(toast.subtitle);
const actHeight = px(resolve(toast.action.height.$value));
const actPadX = px(resolve(toast.action.paddingX.$value));
const actRadius = px(resolve(toast.action.radius.$value));
const actLabel = typoCss(toast.action.label);
const closeBox = px(resolve(toast.close.box.$value));
const closeIcon = px(resolve(toast.close.iconSize.$value));
const closeRadius = px(resolve(toast.close.radius.$value));

const roles = ["success", "warning", "neutral"];
const roleCss = roles.map((r) => `.toast--${r} .toast__icon { color: ${cv(toast.role[r].icon.$value.replace(/[{}]/g, ""))}; }
.toast--${r} .toast__progress-fill { background: ${cv(toast.role[r].accent.$value.replace(/[{}]/g, ""))}; }`).join("\n");

const css = `${rootVars}

.toast { position: relative; display: flex; align-items: flex-start; gap: ${gap}; min-width: 300px; max-width: 420px; padding: ${padY} ${padX}; padding-bottom: calc(${padY} + 3px); background: ${cv("surface.raised")}; border: 1px solid ${cv("outline.default")}; border-radius: ${radius}; overflow: hidden; font-family: ${cv("family.sans")}; }
.toast * { box-sizing: border-box; }
.toast__icon { flex-shrink: 0; width: ${iconSize}; height: ${iconSize}; }
.toast__icon svg { display: block; width: 100%; height: 100%; }
.toast__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding-top: 1px; }
.toast__title { margin: 0; color: ${cv("text.default")}; ${titleCss} }
.toast__subtitle { margin: 0; color: ${cv("text.secondary")}; ${subtitleCss} }
.toast__action { flex-shrink: 0; align-self: center; height: ${actHeight}; padding: 0 ${actPadX}; border: none; border-radius: ${actRadius}; background: ${cv("fill.active")}; color: ${cv("text.forActiveBg")}; ${actLabel} cursor: pointer; font-family: inherit; }
.toast__action:hover { background: ${cv("fill.activeHover")}; }
.toast__close { flex-shrink: 0; align-self: flex-start; width: ${closeBox}; height: ${closeBox}; display: inline-grid; place-items: center; padding: 0; border: none; background: none; border-radius: ${closeRadius}; color: ${cv("icon.secondary")}; cursor: pointer; }
.toast__close:hover { background: ${cv("lighten.2")}; color: ${cv("text.default")}; }
.toast__close svg { display: block; width: ${closeIcon}; height: ${closeIcon}; }
.toast__progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: ${cv("lighten.2")}; }
.toast__progress-fill { position: absolute; left: 0; top: 0; bottom: 0; }

${roleCss}

/* auto-dismiss animation — a real toast shrinks the fill to 0 over its lifetime */
@keyframes toast-countdown { from { width: 100%; } to { width: 0%; } }
@media (prefers-reduced-motion: no-preference) {
  .toast__progress-fill.is-running { animation: toast-countdown 5s linear forwards; }
}

/* stacked toasts */
.toast-stack { display: flex; flex-direction: column; gap: 10px; }`;

// ---- inline icons ----
const glyph = {
  check: fs.readFileSync(path.join(root, "assets/icons/ui/check-circle.svg"), "utf8").replace(/\n/g, ""),
  bolt: fs.readFileSync(path.join(root, "assets/icons/ui/quick-bet.svg"), "utf8").replace(/\n/g, ""),
  boltOff: fs.readFileSync(path.join(root, "assets/icons/ui/quick-bet-exit.svg"), "utf8").replace(/\n/g, ""),
  close: fs.readFileSync(path.join(root, "assets/icons/ui/close.svg"), "utf8").replace(/\n/g, ""),
};

// ---- markup ----
function toastEl({ role, icon, title, subtitle, action, close, progress, progressPct = 62 }) {
  return `<div class="toast toast--${role}" role="status">
  <span class="toast__icon">${glyph[icon]}</span>
  <div class="toast__body">
    <p class="toast__title">${title}</p>
    ${subtitle ? `<p class="toast__subtitle">${subtitle}</p>` : ""}
  </div>
  ${action ? `<button class="toast__action">${action}</button>` : ""}
  ${close ? `<button class="toast__close" aria-label="Dismiss">${glyph.close}</button>` : ""}
  ${progress ? `<div class="toast__progress"><div class="toast__progress-fill" style="width:${progressPct}%"></div></div>` : ""}
</div>`;
}
function toastCode({ role, title, subtitle, action, close, progress }) {
  const ic = "<svg><!-- icon --></svg>";
  return `<div class="toast toast--${role}" role="status">
  <span class="toast__icon">${ic}</span>
  <div class="toast__body">
    <p class="toast__title">${title}</p>
${subtitle ? `    <p class="toast__subtitle">${subtitle}</p>\n` : ""}  </div>${action ? `\n  <button class="toast__action">${action}</button>` : ""}${close ? `\n  <button class="toast__close" aria-label="Dismiss">${ic}</button>` : ""}${progress ? `\n  <div class="toast__progress"><div class="toast__progress-fill"></div></div>` : ""}
</div>`;
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
const story = (t, d, note) => storyCard(t, toastEl(d), toastCode(d), note);

const stackLive = `<div class="toast-stack">
  ${toastEl({ role: "success", icon: "check", title: "Share link copied", subtitle: "Link copied to clipboard" })}
  ${toastEl({ role: "success", icon: "check", title: "Share code copied", subtitle: "Code copied to clipboard" })}
</div>`;
const stackCode = `<div class="toast-stack">
  <div class="toast toast--success" role="status">…</div>
  <div class="toast toast--success" role="status">…</div>
</div>`;

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Toast</title>
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
  .sub { font-size: 14px; color: var(--text-secondary); margin: 0 0 2.5rem; max-width: 72ch; line-height: 1.6; }
  h2.big-section { font-size: 24px; font-weight: 700; margin: 5.5rem 0 1.5rem; letter-spacing: -0.01em; padding-top: 2.5rem; border-top: 1px solid var(--border); }
  h2.big-section:first-of-type { margin-top: 3rem; padding-top: 0; border-top: none; }
  .section-desc { font-size: 13.5px; color: var(--text-secondary); margin: -0.5rem 0 1.5rem; max-width: 70ch; line-height: 1.6; }

  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 14px 18px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1rem; line-height: 1.6; }
  .legend .row { display: flex; gap: 14px; padding: 6px 0; border-bottom: 0.5px solid var(--border); }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 150px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  code.tok { font-family: var(--mono); font-size: 12px; color: var(--accent); }

  pre.code { background: var(--code-bg); color: var(--code-text); border-radius: 10px; padding: 16px 18px; margin: 0; overflow-x: auto; font-family: var(--mono); font-size: 12px; line-height: 1.7; }
  pre.code code { font-family: inherit; }

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 64px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("toast")}
  </nav>
  <main>
    <h1>Toast</h1>
    <p class="sub">tokens/components/toast.tokens.json · transient top-docked confirmation — 'Betslip loaded', 'Betslip cleared' (with Undo), 'Quick Bet mode active', 'Share link copied'. New component. Generated — colours are <code class="tok">--tok-*</code> custom properties, never literal hex.</p>

    <div class="legend">
      <div class="row"><b>Surface</b><span>surface.raised — a step above a card, so the toast reads as floating over whatever it covers. Hairline outline.default, radius.md.</span></div>
      <div class="row"><b>Roles</b><span>success (green check) · warning (gold bolt — quick-bet) · neutral (grey). The role sets the leading icon colour and the progress-bar tint; the glyph itself is passed per toast (check-circle / quick-bet / quick-bet-exit).</span></div>
      <div class="row"><b>Anatomy</b><span>Status icon → body (bold title + optional subtitle) → optional Undo action and/or close ×. 24px icon, 10px gap, 12px padding.</span></div>
      <div class="row"><b>Action</b><span>The trailing button (Undo) reuses Button's active fill (fill.active + text.forActiveBg) at a compact 36px height.</span></div>
      <div class="row"><b>Progress</b><span>A 3px auto-dismiss meter along the bottom, tinted to the role's fill, over a faint lighten.2 track. Animates the width to 0 over the toast's lifetime; respects prefers-reduced-motion.</span></div>
      <div class="row"><b>vs. Alert</b><span><a href="alert.html">Alert</a> is a persistent in-flow banner tied to state; Toast is a brief, self-dismissing confirmation that stacks.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Roles</h2>
    <p class="section-desc">Success and neutral confirmations, plus the quick-bet warning toast (gold bolt, dismissible).</p>
    <div class="story-grid">
      ${story("Success", { role: "success", icon: "check", title: "Betslip loaded", subtitle: "Your bets have been added to the betslip" })}
      ${story("Warning — dismissible", { role: "warning", icon: "bolt", title: "Quick Bet mode is active with $10 bet", close: true }, "The quick-bet activation toast — gold bolt, no subtitle, closable.")}
      ${story("Neutral — dismissible", { role: "neutral", icon: "boltOff", title: "Quick Bet mode deactivated", close: true }, "Quick-bet off — the bolt-off glyph on the neutral grey role.")}
    </div>

    <h2 class="big-section">With action · with timer</h2>
    <p class="section-desc">An undoable action toast with the auto-dismiss progress meter running.</p>
    <div class="story-grid">
      ${story("Undo + progress", { role: "success", icon: "check", title: "Betslip cleared", subtitle: "All bets have been removed", action: "Undo", progress: true }, "The progress meter is tinted to the role (green) and shrinks to zero; Undo cancels before it elapses.")}
      ${story("Odds settings updated", { role: "success", icon: "check", title: "Odds settings updated", subtitle: "Your odds preference has been saved", progress: true })}
    </div>

    <h2 class="big-section">Stacked</h2>
    <p class="section-desc">Multiple toasts stack vertically with a consistent gap — e.g. copying a share link then a code fires two.</p>
    <div class="story-grid" style="grid-template-columns:1fr; max-width:460px;">
      ${storyCard("Two toasts", stackLive, stackCode)}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/toast.html"), html);
console.log("wrote docs/toast.html");
