// Regenerates docs/alert.html from tokens/components/alert.tokens.json.
// Inline status banner — contextual messaging inside a flow (betslip footer) plus
// a solid full-bleed global bar. Two styles (outline / solid) × four roles
// (warning/negative/positive/info). Colours become --tok-* CSS custom properties,
// never literal hex; the generated <style> block IS the printed "CSS" snippet.
// Run: node tools/build-alert-doc.mjs
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
const alert = load("tokens/components/alert.tokens.json").component.alert;

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
  "text.default",
  "bg.warning", "bg.negative", "bg.positive", "bg.accent",
  "outline.warning", "outline.negative", "outline.positive", "outline.accent",
  "icon.warning", "icon.negative", "icon.positive", "icon.accent", "icon.secondary",
  "lighten.2",
];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

function typoCss(node) { const t = resolveToken(node); return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`; }
const radius = px(resolve(alert.radius.$value));
const padX = px(resolve(alert.paddingX.$value));
const padY = px(resolve(alert.paddingY.$value));
const gap = px(resolve(alert.gap.$value));
const iconSize = px(resolve(alert.iconSize.$value));
const closeBox = px(resolve(alert.close.box.$value));
const closeIcon = px(resolve(alert.close.iconSize.$value));
const closeRadius = px(resolve(alert.close.radius.$value));
const messageCss = typoCss(alert.message);

const roles = ["warning", "negative", "positive", "info"];
const roleCss = roles.map((r) => `.alert--${r} { background: ${cv(alert.role[r].bg.$value.replace(/[{}]/g, ""))}; border-color: ${cv(alert.role[r].border.$value.replace(/[{}]/g, ""))}; }
.alert--${r} .alert__icon { color: ${cv(alert.role[r].icon.$value.replace(/[{}]/g, ""))}; }`).join("\n");

const css = `${rootVars}

.alert { display: flex; align-items: center; gap: ${gap}; padding: ${padY} ${padX}; border: 1px solid transparent; border-radius: ${radius}; font-family: ${cv("family.sans")}; color: ${cv("text.default")}; }
.alert * { box-sizing: border-box; }
.alert__icon { flex-shrink: 0; width: ${iconSize}; height: ${iconSize}; }
.alert__icon svg { display: block; width: 100%; height: 100%; }
.alert__body { flex: 1; min-width: 0; }
.alert__message { margin: 0; color: inherit; ${messageCss} }
.alert__close { flex-shrink: 0; width: ${closeBox}; height: ${closeBox}; display: inline-grid; place-items: center; padding: 0; border: none; background: none; border-radius: ${closeRadius}; color: ${cv("icon.secondary")}; cursor: pointer; }
.alert__close:hover { background: ${cv("lighten.2")}; color: ${cv("text.default")}; }
.alert__close svg { display: block; width: ${closeIcon}; height: ${closeIcon}; }

${roleCss}`;

// ---- inline icons ----
const icons = {
  warning: fs.readFileSync(path.join(root, "assets/icons/ui/warning.svg"), "utf8").replace(/\n/g, ""),
  positive: fs.readFileSync(path.join(root, "assets/icons/ui/check-circle.svg"), "utf8").replace(/\n/g, ""),
  info: fs.readFileSync(path.join(root, "assets/icons/ui/info-outline.svg"), "utf8").replace(/\n/g, ""),
  close: fs.readFileSync(path.join(root, "assets/icons/ui/close.svg"), "utf8").replace(/\n/g, ""),
};
// negative reuses the warning triangle (no dedicated error-circle glyph in the UI set yet) — colour differentiates it.
const roleIcon = { warning: icons.warning, negative: icons.warning, positive: icons.positive, info: icons.info };

// ---- markup ----
function alertEl({ role, message, close }) {
  return `<div class="alert alert--${role}" role="alert">
  <span class="alert__icon">${roleIcon[role]}</span>
  <div class="alert__body"><p class="alert__message">${message}</p></div>
  ${close ? `<button class="alert__close" aria-label="Dismiss">${icons.close}</button>` : ""}
</div>`;
}
function alertCode({ role, message, close }) {
  const ic = "<svg><!-- icon --></svg>";
  return `<div class="alert alert--${role}" role="alert">
  <span class="alert__icon">${ic}</span>
  <div class="alert__body"><p class="alert__message">${message}</p></div>${close ? `\n  <button class="alert__close" aria-label="Dismiss">${ic}</button>` : ""}
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
const story = (t, d, note) => storyCard(t, alertEl(d), alertCode(d), note);

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Alert</title>
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
  .story-preview { min-height: 56px; display: flex; align-items: center; justify-content: stretch; padding: 12px 0; }
  .story-preview .alert { width: 100%; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("alert")}
  </nav>
  <main>
    <h1>Alert</h1>
    <p class="sub">tokens/components/alert.tokens.json · inline status banner for contextual messaging inside a flow — the betslip's 'cannot include suspended outcome', 'odds have changed', 'balance too low', 'log in to place your bet'. New component. Generated — colours are <code class="tok">--tok-*</code> custom properties, never literal hex.</p>

    <div class="legend">
      <div class="row"><b>Style</b><span>A 12% colored tint (bg.*) + a colored 1px border (outline.*) + a status icon, message in white. Sits inline in the flow (e.g. the betslip footer), not docked.</span></div>
      <div class="row"><b>Four roles</b><span>warning · negative · positive · info — mapped to the semantic status colours (warning/negative/positive) plus accent for info. The betslip uses <em>warning</em> for almost everything; Alert carries all four so it's reusable elsewhere.</span></div>
      <div class="row"><b>Anatomy</b><span>Status icon → a single message line → optional close ×. No title — an Alert is one line of text in a status colour. radius.md, 12px padding, 8px gap, 20px icon.</span></div>
      <div class="row"><b>Negative icon</b><span>Reuses the warning triangle for now (the UI icon set has no error-circle glyph yet); the red colour differentiates it. A dedicated glyph is a later swap.</span></div>
      <div class="row"><b>vs. Toast</b><span>Alert is a persistent in-flow banner tied to state. The solid, full-bleed app-wide bar is a <a href="toast.html">Toast</a> (<code class="tok">--global</code>), not an Alert.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Four roles</h2>
    <p class="section-desc">Message text stays white on all four; only the tint, border and icon change with the role.</p>
    <div class="story-grid">
      ${story("warning", { role: "warning", message: "Your Betslip cannot include suspended or closed outcome." })}
      ${story("negative", { role: "negative", message: "Bet not processed. Please try again." })}
      ${story("positive", { role: "positive", message: "Odds accepted — your bet is ready to place." })}
      ${story("info", { role: "info", message: "Potential max bet is $2,717 on this selection." })}
    </div>

    <h2 class="big-section">Dismissible</h2>
    <p class="section-desc">The same four roles with a close × for banners the user can dismiss. That's the only other axis — an Alert is either dismissible or not.</p>
    <div class="story-grid">
      ${story("warning · close", { role: "warning", message: "Odds have changed — review before placing.", close: true })}
      ${story("info · close", { role: "info", message: "Log in to place your bet.", close: true })}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/alert.html"), html);
console.log("wrote docs/alert.html");
