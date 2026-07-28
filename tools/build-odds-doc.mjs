// Regenerates docs/odds.html from tokens/components/odds.tokens.json.
// The odds value + its live movement. Static = text.default, tabular-nums. On a
// price change the app toggles .odds--up / .odds--down: the value flashes
// positive/negative and the struck-through previous price shows beside it, then a
// single CSS animation eases the highlight back to text.default and fades the old
// value out over movement.duration. Colours become --tok-* vars; the generated
// <style> IS the printed "CSS". A small docs script replays the demo on a loop —
// in production the app adds the class on each tick (that trigger is not part of
// the component). Run: node tools/build-odds-doc.mjs
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
const odds = load("tokens/components/odds.tokens.json").component.odds;

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
const cvOf = (node) => cv(node.$value.replace(/[{}]/g, ""));

const colorPaths = ["text.default", "text.positive", "text.negative", "text.secondary"];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

function typoCss(node) { const t = resolveToken(node); return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`; }
const oddsType = typoCss(odds.type);
const gap = px(resolve(odds.gap.$value));
const dur = px(resolveToken(odds.movement.duration)); // e.g. "3000ms"
const loopMs = resolveToken(odds.movement.duration).value + 2000; // demo replay cadence

const css = `${rootVars}

.odds { display: inline-flex; align-items: baseline; gap: ${gap}; font-family: ${cv("family.sans")}; ${oddsType} font-variant-numeric: tabular-nums; white-space: nowrap; color: ${cvOf(odds.color.default)}; }
.odds__value { color: inherit; }
.odds__prev { color: ${cvOf(odds.prev.color)}; text-decoration: line-through; }

/* static / prefers-reduced-motion: the changed value simply holds its up/down colour */
.odds--up .odds__value { color: ${cvOf(odds.color.up)}; }
.odds--down .odds__value { color: ${cvOf(odds.color.down)}; }

/* live: flash to the movement colour, then ease back to default over movement.duration; the previous value fades out */
@keyframes odds-up { 0%, 60% { color: ${cvOf(odds.color.up)}; } 100% { color: ${cvOf(odds.color.default)}; } }
@keyframes odds-down { 0%, 60% { color: ${cvOf(odds.color.down)}; } 100% { color: ${cvOf(odds.color.default)}; } }
@keyframes odds-prev-out { 0%, 60% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: no-preference) {
  .odds--up .odds__value { animation: odds-up ${dur} ease forwards; }
  .odds--down .odds__value { animation: odds-down ${dur} ease forwards; }
  .odds--up .odds__prev, .odds--down .odds__prev { animation: odds-prev-out ${dur} ease forwards; }
}`;

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}
const oStatic = (v) => `<span class="odds"><span class="odds__value">${v}</span></span>`;
const oMove = (dir, v, prev) => `<span class="odds" data-dir="${dir}"><span class="odds__value">${v}</span><span class="odds__prev">${prev}</span></span>`;
const codeStatic = (v) => `<span class="odds"><span class="odds__value">${v}</span></span>`;
const codeMove = (dir, v, prev) => `<span class="odds odds--${dir}">
  <span class="odds__value">${v}</span>
  <span class="odds__prev">${prev}</span>
</span>`;

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Odds</title>
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

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 22px; display: flex; flex-direction: column; gap: 12px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 44px; display: flex; align-items: center; justify-content: center; padding: 12px 0; font-size: 18px; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .ctx { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 14px 18px; margin-bottom: 1rem; display: flex; align-items: baseline; justify-content: space-between; gap: 16px; max-width: 340px; }
  .ctx .name { font-size: 14px; font-weight: 600; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("odds")}
  </nav>
  <main>
    <h1>Odds</h1>
    <p class="sub">tokens/components/odds.tokens.json · the coefficient value and its live movement. Generated — colours are <code class="tok">--tok-*</code> custom properties, never literal hex. The previews below loop the up/down flash so you can see it; in the product the app adds the modifier once per price change.</p>

    <div class="legend">
      <div class="row"><b>Static</b><span>text.default, <code class="tok">tabular-nums</code>, any string — decimal (2.83) or fractional (199/200). Not a parser.</span></div>
      <div class="row"><b>Movement</b><span>On a new price the app toggles <code class="tok">.odds--up</code> / <code class="tok">.odds--down</code>: the value flashes text.positive / text.negative, the previous price shows struck-through (text.secondary) beside it, then one CSS animation eases the colour back to text.default and fades the old value out over <code class="tok">movement.duration</code> (${dur}).</span></div>
      <div class="row"><b>Trigger vs. component</b><span>The component owns the colours, the strike and the timing; the app owns only the trigger (add the class on each tick, drop the previous-value node on <code class="tok">animationend</code>). The looping in these demos is docs-only script, not part of the component.</span></div>
      <div class="row"><b>Reduced motion</b><span>prefers-reduced-motion: no flash — the changed value simply holds its up/down colour with the previous value shown, so the movement is still legible without animation.</span></div>
      <div class="row"><b>Size</b><span>Contextual — 14px (heading-base) here and on a bet card; override font-size for a larger summary value. The component fixes only the numeric styling + movement.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Static</h2>
    <p class="section-desc">Resting value — decimal and fractional, both tabular-nums.</p>
    <div class="story-grid">
      ${storyCard("Decimal", oStatic("2.83"), codeStatic("2.83"))}
      ${storyCard("Fractional", oStatic("199/200"), codeStatic("199/200"))}
    </div>

    <h2 class="big-section">Movement</h2>
    <p class="section-desc">Up (green) and down (red), each with the struck-through previous price. The demos replay every ${(loopMs / 1000).toFixed(0)}s; watch the highlight ease back to the resting colour and the old value fade.</p>
    <div class="story-grid">
      ${storyCard("Up — decimal", oMove("up", "2.10", "1.95"), codeMove("up", "2.10", "1.95"), "New price higher; flashes text.positive, old value struck-through, eases back to default.")}
      ${storyCard("Down — decimal", oMove("down", "1.72", "1.90"), codeMove("down", "1.72", "1.90"), "New price lower; flashes text.negative.")}
      ${storyCard("Up — fractional", oMove("up", "199/200", "188/199"), codeMove("up", "199/200", "188/199"))}
    </div>

    <h2 class="big-section">In context</h2>
    <p class="section-desc">On a bet-card line — outcome on the left, the live odds on the right.</p>
    <div class="ctx"><span class="name">Manchester City -5.5</span>${oMove("up", "19.53", "18.90")}</div>
    <pre class="code"><code>${esc(`<div class="line">
  <span class="name">Manchester City -5.5</span>
  <span class="odds odds--up"><span class="odds__value">19.53</span><span class="odds__prev">18.90</span></span>
</div>`)}</code></pre>
  </main>
</div>
<script>
  // DOCS ONLY: replay the up/down flash on a loop so the movement is visible.
  // In production the app adds .odds--up/.odds--down once per price change.
  (function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('.odds[data-dir]').forEach(function (el) {
      var cls = 'odds--' + el.dataset.dir;
      function play() { el.classList.remove('odds--up', 'odds--down'); void el.offsetWidth; el.classList.add(cls); }
      play();
      if (!reduce) setInterval(play, ${loopMs});
    });
  })();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/odds.html"), html);
console.log("wrote docs/odds.html");
