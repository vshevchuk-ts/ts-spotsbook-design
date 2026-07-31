// Regenerates docs/toast.html from tokens/components/toast.tokens.json.
// Transient top-docked notification — floating surface-6 pill (elevation.sm), a
// status icon, a semibold heading and an OPTIONAL second line. Two axes: content
// (one / two lines) × trailing control (none / close / Undo / timer, timer combines
// with a button). The Undo action reuses the real Button primary (base) tokens.
// Colours become --tok-* CSS custom properties; the generated <style> IS the
// printed "CSS". Run: node tools/build-toast-doc.mjs
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
const elevationPrim = load("tokens/primitives/elevation.tokens.json").elevation;
const typo = load("tokens/primitives/typography.tokens.json");
const textStyle = load("tokens/primitives/text-styles.tokens.json")["text-style"];
const semantic = load("tokens/semantic/color.tokens.json");
const toast = load("tokens/components/toast.tokens.json").component.toast;
const button = load("tokens/components/button.tokens.json").component.button;

const registry = {
  color: colorPrim, spacing: dim, radius: radiusPrim, elevation: elevationPrim,
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
// resolve a colour token's ROLE straight from its node — never hardcode a role name.
const cvOf = (node) => cv(node.$value.replace(/[{}]/g, ""));

const colorPaths = [
  "surface.floating",
  "text.default", "text.secondary", "text.forActiveBg", "text.contrast",
  "icon.positive", "icon.warning", "icon.negative", "icon.secondary", "icon.contrast",
  "fill.positive", "fill.warning", "fill.negative", "fill.neutral", "fill.neutralHover",
  "fill.active", "fill.activeHover",
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
const headingCss = typoCss(toast.heading);
const secondaryCss = typoCss(toast.secondary);
const closeBox = px(resolve(toast.close.box.$value));
const closeIcon = px(resolve(toast.close.iconSize.$value));
const closeRadius = px(resolve(toast.close.radius.$value));
const sh = resolveToken(toast.shadow);
const shadowCss = `${px(sh.offsetX)} ${px(sh.offsetY)} ${px(sh.blur)} ${px(sh.spread)} ${sh.color}`;

// --- Undo action = the real Button primary at base size, resolved from button.tokens.json ---
const bp = button.primary;
const actHeight = px(resolve(bp.size.base.height.$value));
const actPadX = px(resolve(bp.size.base.paddingX.$value));
const actRadius = px(resolve(bp.radius.$value));
const actLabel = typoCss(bp.size.base.label);

const roles = ["success", "warning", "negative", "neutral"];
const roleCss = roles.map((r) => `.toast--${r} .toast__icon { color: ${cv(toast.role[r].icon.$value.replace(/[{}]/g, ""))}; }
.toast--${r} .toast__progress-fill { background: ${cv(toast.role[r].accent.$value.replace(/[{}]/g, ""))}; }`).join("\n");

const css = `${rootVars}

.toast { position: relative; display: flex; align-items: center; gap: ${gap}; min-width: 300px; max-width: 420px; padding: ${padY} ${padX}; background: ${cvOf(toast.bg)}; border-radius: ${radius}; box-shadow: ${shadowCss}; overflow: hidden; font-family: ${cv("family.sans")}; }
.toast * { box-sizing: border-box; }
.toast__icon { flex-shrink: 0; align-self: center; width: ${iconSize}; height: ${iconSize}; }
.toast__icon svg { display: block; width: 100%; height: 100%; }
.toast__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.toast__heading { margin: 0; color: ${cv("text.default")}; ${headingCss} }
.toast__secondary { margin: 0; color: ${cv("text.secondary")}; ${secondaryCss} }

/* trailing Undo action — Button / primary / base (resolved from button.tokens.json) */
.toast__action { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; height: ${actHeight}; padding: 0 ${actPadX}; border: none; border-radius: ${actRadius}; background: ${cv("fill.active")}; color: ${cv("text.forActiveBg")}; ${actLabel} cursor: pointer; white-space: nowrap; font-family: inherit; }
.toast__action:hover { background: ${cv("fill.activeHover")}; }

/* trailing close */
.toast__close { flex-shrink: 0; width: ${closeBox}; height: ${closeBox}; display: inline-grid; place-items: center; padding: 0; border: none; background: none; border-radius: ${closeRadius}; color: ${cvOf(toast.close.color)}; cursor: pointer; }
.toast__close:hover { background: ${cvOf(toast.close.hoverFill)}; color: ${cvOf(toast.close.hoverColor)}; }
.toast__close svg { display: block; width: ${closeIcon}; height: ${closeIcon}; }

/* auto-dismiss timer bar */
.toast__progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: ${cv("lighten.2")}; }
.toast__progress-fill { position: absolute; left: 0; top: 0; bottom: 0; }

${roleCss}

@keyframes toast-countdown { from { width: 100%; } to { width: 0%; } }

/* enter / exit motion — a toast slides IN from above with a fade; on dismiss it
   slides back UP and fades out. Enter is the default (a toast animates when it
   mounts); exit is triggered by adding .is-leaving before removal. */
@keyframes toast-enter { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes toast-exit  { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-16px); } }

@media (prefers-reduced-motion: no-preference) {
  .toast__progress-fill.is-running { animation: toast-countdown 5s linear forwards; }
  .toast { animation: toast-enter 260ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .toast.is-leaving { animation: toast-exit 180ms cubic-bezier(0.4, 0, 1, 1) both; }
}

/* global — the solid full-bleed app-wide bar (warning only this pass) */
.toast--global { width: 100%; max-width: none; box-shadow: none; }
.toast--global.toast--warning { background: ${cv("fill.warning")}; }
.toast--global.toast--warning .toast__heading, .toast--global.toast--warning .toast__secondary { color: ${cv("text.contrast")}; }
.toast--global.toast--warning .toast__icon { color: ${cv("icon.contrast")}; }
.toast--global.toast--warning .toast__close { color: ${cv("icon.contrast")}; }
.toast--global.toast--warning .toast__close:hover { background: rgba(0,0,0,0.12); color: ${cv("icon.contrast")}; }

/* stacked toasts */
.toast-stack { display: flex; flex-direction: column; gap: 10px; }`;

// ---- inline icons ----
const glyph = {
  check: fs.readFileSync(path.join(root, "assets/icons/ui/check-circle.svg"), "utf8").replace(/\n/g, ""),
  warning: fs.readFileSync(path.join(root, "assets/icons/ui/warning.svg"), "utf8").replace(/\n/g, ""),
  bolt: fs.readFileSync(path.join(root, "assets/icons/ui/quick-bet.svg"), "utf8").replace(/\n/g, ""),
  boltOff: fs.readFileSync(path.join(root, "assets/icons/ui/quick-bet-exit.svg"), "utf8").replace(/\n/g, ""),
  close: fs.readFileSync(path.join(root, "assets/icons/ui/close.svg"), "utf8").replace(/\n/g, ""),
};

// ---- markup ----
// opts: role, icon, heading, secondary?, action?, close?, progress?, progressPct?, global?
function toastEl(o) {
  const cls = ["toast", `toast--${o.role}`, o.secondary ? "" : "toast--oneline", o.global ? "toast--global" : ""].filter(Boolean).join(" ");
  return `<div class="${cls}" role="status">
  <span class="toast__icon">${glyph[o.icon]}</span>
  <div class="toast__body">
    <p class="toast__heading">${o.heading}</p>
    ${o.secondary ? `<p class="toast__secondary">${o.secondary}</p>` : ""}
  </div>
  ${o.action ? `<button class="toast__action">${o.action}</button>` : ""}
  ${o.close ? `<button class="toast__close" aria-label="Dismiss">${glyph.close}</button>` : ""}
  ${o.progress ? `<div class="toast__progress"><div class="toast__progress-fill" style="width:${o.progressPct ?? 62}%"></div></div>` : ""}
</div>`;
}
function toastCode(o) {
  const ic = "<svg><!-- icon --></svg>";
  const cls = ["toast", `toast--${o.role}`, o.secondary ? "" : "toast--oneline", o.global ? "toast--global" : ""].filter(Boolean).join(" ");
  return `<div class="${cls}" role="status">
  <span class="toast__icon">${ic}</span>
  <div class="toast__body">
    <p class="toast__heading">${o.heading}</p>
${o.secondary ? `    <p class="toast__secondary">${o.secondary}</p>\n` : ""}  </div>${o.action ? `\n  <button class="toast__action">${o.action}</button>` : ""}${o.close ? `\n  <button class="toast__close" aria-label="Dismiss">${ic}</button>` : ""}${o.progress ? `\n  <div class="toast__progress"><div class="toast__progress-fill"></div></div>` : ""}
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
const story = (t, o, note) => storyCard(t, toastEl(o), toastCode(o), note);

const stackLive = `<div class="toast-stack">
  ${toastEl({ role: "success", icon: "check", heading: "Share link copied" })}
  ${toastEl({ role: "success", icon: "check", heading: "Share code copied" })}
</div>`;
const stackCode = `<div class="toast-stack">
  <div class="toast toast--success toast--oneline" role="status">…</div>
  <div class="toast toast--success toast--oneline" role="status">…</div>
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
  .story-preview { min-height: 72px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .demo-btn { font-family: var(--sans); font-size: 12.5px; font-weight: 600; color: var(--text-primary); background: var(--bg-card-hover); border: 0.5px solid var(--border-strong); border-radius: 8px; padding: 8px 14px; cursor: pointer; }
  .demo-btn:hover { border-color: var(--accent); color: var(--accent); }

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
      <div class="row"><b>Surface</b><span>surface-6 (a sanctioned surface-6-as-background exception) lifted off the page by elevation.sm — a toast floats, so it carries a shadow, not a border. radius.md.</span></div>
      <div class="row"><b>Two axes</b><span><em>Content</em>: one line (heading only) or two lines (heading + secondary). Most messages fit one line — the second line is optional, not a default. <em>Trailing control</em>: none · close × · Undo action · auto-dismiss timer — and the timer combines with either button.</span></div>
      <div class="row"><b>Heading</b><span>text-style.heading-base — 14px semibold, the standard heading style. On a one-line toast it is the whole message; the 12px secondary line is regular body.</span></div>
      <div class="row"><b>Roles</b><span>success (green) · warning (gold) · negative (red) · neutral (grey). The role colours the leading icon and the timer tint; each status uses its own glyph — success → check, warning/negative → triangle. The glyph is still passed per toast so non-status contexts (Quick Bet) can supply their own.</span></div>
      <div class="row"><b>Undo action</b><span>The trailing button <em>is</em> <a href="button.html">Button</a> / primary / base (40px) — its size, label and colours resolve from button.tokens.json, so it's a real primary button, not a shrunk-down lookalike.</span></div>
      <div class="row"><b>Timer</b><span>A 3px auto-dismiss meter along the bottom, tinted to the role over a faint lighten.2 track; animates to zero and respects prefers-reduced-motion. Combines with a close or an Undo.</span></div>
      <div class="row"><b>Motion</b><span>On mount a toast slides in from above with a fade (<code class="tok">toast-enter</code>, 260ms ease-out); on dismiss add <code class="tok">.is-leaving</code> and it slides back up and fades out (<code class="tok">toast-exit</code>, 180ms ease-in). Both are gated by prefers-reduced-motion.</span></div>
      <div class="row"><b>Quick Bet toasts</b><span>Two dedicated toasts (activated / deactivated) — not the status roles but the mode's own bolt language: a filled gold bolt vs a grey crossed-out bolt. Built on the plain toast + close.</span></div>
      <div class="row"><b>Global bar</b><span><code class="tok">--global</code>: the solid, full-bleed app-wide notification (moved here from Alert — it is a docked toast, not an inline banner). Warning only this pass.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Content — one line vs two</h2>
    <p class="section-desc">The heading alone carries most messages; add a second line only when there's genuinely more to say. Both are vertically centred in the pill.</p>
    <div class="story-grid">
      ${story("One line", { role: "success", icon: "check", heading: "Betslip loaded" })}
      ${story("Two lines", { role: "success", icon: "check", heading: "Betslip loaded", secondary: "Your bets have been added to the betslip" })}
    </div>

    <h2 class="big-section">Trailing control</h2>
    <p class="section-desc">None, a close ×, an Undo button, or an auto-dismiss timer — and the timer combines with either button.</p>
    <div class="story-grid">
      ${story("With close", { role: "neutral", icon: "check", heading: "Odds settings updated", secondary: "Your preference has been saved", close: true })}
      ${story("With Undo (primary button)", { role: "success", icon: "check", heading: "Betslip cleared", secondary: "All bets have been removed", action: "Undo" })}
      ${story("With timer", { role: "success", icon: "check", heading: "Betslip loaded", secondary: "Your bets have been added to the betslip", progress: true })}
      ${story("Timer + Undo", { role: "success", icon: "check", heading: "Betslip cleared", secondary: "All bets have been removed", action: "Undo", progress: true }, "The timer runs while Undo is still available — it cancels the dismissal if tapped in time.")}
    </div>

    <h2 class="big-section">Motion — enter / exit</h2>
    <p class="section-desc">A toast slides in from above with a fade on mount, and slides back up and fades out on dismiss. Click to play it live.</p>
    <div class="story-grid" style="grid-template-columns:1fr; max-width:460px;">
      <div class="story">
        <h3>Enter / exit — live</h3>
        <div class="story-preview" id="motion-stage" style="min-height:96px;"></div>
        <div style="display:flex; gap:8px;">
          <button class="demo-btn" id="motion-dismiss">Dismiss ↑</button>
          <button class="demo-btn" id="motion-replay">Replay ↓</button>
        </div>
        <p class="story-note"><em>Dismiss</em> adds <code class="tok">.is-leaving</code> (slide up + fade) and removes the element on <code class="tok">animationend</code>. <em>Replay</em> re-mounts it, which re-fires <code class="tok">toast-enter</code>.</p>
      </div>
    </div>

    <h2 class="big-section">Roles</h2>
    <p class="section-desc">Each status carries its own icon in the role colour: success → check (green), warning → triangle (gold), negative → triangle (red). (Negative reuses the warning triangle for now — the UI icon set has no error-circle glyph yet; the red colour differentiates it.)</p>
    <div class="story-grid">
      ${story("success", { role: "success", icon: "check", heading: "Bet placed", secondary: "Added to My Bets", close: true })}
      ${story("warning", { role: "warning", icon: "warning", heading: "Odds have changed", secondary: "Review before placing", close: true })}
      ${story("negative", { role: "negative", icon: "warning", heading: "Bet not processed", secondary: "Please try again", close: true })}
    </div>

    <h2 class="big-section">Quick Bet</h2>
    <p class="section-desc">Two dedicated toasts for the quick-bet mode, using the bolt glyph rather than a status icon: <em>activated</em> (filled gold bolt) and <em>deactivated</em> (grey crossed-out bolt). Otherwise plain toasts with a close.</p>
    <div class="story-grid">
      ${story("Activated", { role: "warning", icon: "bolt", heading: "Quick Bet mode is active with $10 bet", close: true }, "Filled gold bolt (quick-bet) on the warning role.")}
      ${story("Deactivated", { role: "neutral", icon: "boltOff", heading: "Quick Bet mode deactivated", close: true }, "Grey crossed-out bolt (quick-bet-exit) on the neutral role.")}
    </div>

    <h2 class="big-section">Global bar</h2>
    <p class="section-desc">The app-wide solid notification, docked full-bleed above the page. Dark text/icon on the bright fill.</p>
    <div class="story-grid" style="grid-template-columns:1fr;">
      ${story("Global — warning", { role: "warning", global: true, icon: "warning", heading: "Global Warning", secondary: "Scheduled maintenance tonight 02:00–03:00 UTC — betting may be briefly unavailable.", close: true }, "Warning is the only solid role this pass; solid negative/positive await the deferred text.forLabelBg.")}
    </div>

    <h2 class="big-section">Stacked</h2>
    <p class="section-desc">Multiple toasts stack vertically with a consistent gap — e.g. copying a share link then a code fires two one-line toasts.</p>
    <div class="story-grid" style="grid-template-columns:1fr; max-width:460px;">
      ${storyCard("Two toasts", stackLive, stackCode)}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
<script>
  (function () {
    var stage = document.getElementById("motion-stage");
    if (!stage) return;
    var markup = ${JSON.stringify(toastEl({ role: "success", icon: "check", heading: "Betslip loaded", secondary: "Your bets have been added to the betslip", close: true }))};
    function mount() { stage.innerHTML = markup; }
    mount();
    document.getElementById("motion-dismiss").addEventListener("click", function () {
      var t = stage.querySelector(".toast");
      if (!t || t.classList.contains("is-leaving")) return;
      t.classList.add("is-leaving");
      t.addEventListener("animationend", function () { t.remove(); }, { once: true });
    });
    document.getElementById("motion-replay").addEventListener("click", mount);
  })();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/toast.html"), html);
console.log("wrote docs/toast.html");
