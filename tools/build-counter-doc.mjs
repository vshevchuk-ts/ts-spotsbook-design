// Regenerates docs/counter.html from tokens/components/counter.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Two surface variants — onPrimary (sits on the active/orange button fill) and
// onNeutral (sits on a neutral surface) — share one size/radius grid.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-counter-doc.mjs
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
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;
// resolve a colour token's ROLE straight from its node — never hardcode a role name.
const cvOf = (node) => cv(node.$value.replace(/[{}]/g, ""));
const refOf = (node) => node.$value.replace(/[{}]/g, "");
// colour roles this page emits: auto-collected from the surface tokens (bg/label of
// each state) so a token repoint can't leave a var undefined, plus the two demo-box
// fills used to preview each surface.
const surfaceKeys = ["onPrimary", "onNeutral"];
const surfaceRefs = surfaceKeys.flatMap((k) => ["inactive", "active"].flatMap((s) => ["bg", "label"].map((f) => refOf(counter[k].state[s][f]))));
const colorPaths = [...new Set([...surfaceRefs, "fill.active", "fill.neutral"])];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const counterRadius = px(resolve(counter.radius.$value));
const sizes = ["sm", "base", "lg"].map((key) => {
  const s = counter.size[key];
  return { key, height: resolve(s.height.$value), minWidth: resolve(s.minWidth.$value), paddingX: resolve(s.paddingX.$value), label: resolveToken(s.label) };
});

const surfaceLabels = { onPrimary: "On Primary", onNeutral: "On Neutral" };
function surfaceCss(key) {
  const st = counter[key].state;
  return `.counter--${key}.counter--inactive { background: ${cvOf(st.inactive.bg)}; color: ${cvOf(st.inactive.label)}; }
.counter--${key}.counter--active { background: ${cvOf(st.active.bg)}; color: ${cvOf(st.active.label)}; }`;
}

const css = `${rootVars}

.counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  font-family: ${cv("family.sans")};
  font-weight: 700;
  border-radius: ${counterRadius};
}
${sizes
  .map((s) => `.counter--${s.key} { height: ${px(s.height)}; min-width: ${px(s.minWidth)}; padding: 0 ${px(s.paddingX)}; font-size: ${px(s.label.fontSize)}; line-height: ${s.label.lineHeight}; }`)
  .join("\n")}

${surfaceCss("onPrimary")}

${surfaceCss("onNeutral")}`;

function markup(size, surface, state) {
  // inactive = seen/zero count → show 0; active = a meaningful count → show a digit.
  const value = state === "inactive" ? "0" : "3";
  return `<span class="counter counter--${size} counter--${surface} counter--${state}">${value}</span>`;
}

function storyCard(title, liveHtml, codeHtml, note = "", boxClass = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview"><div class="demo-box ${boxClass}">${liveHtml}</div></div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

const sizeStories = sizes.map((s) => storyCard(`${s.key} — ${px(s.height)}`, markup(s.key, "onPrimary", "inactive"), markup(s.key, "onPrimary", "inactive"), "", "demo-box--onPrimary")).join("\n");

function surfaceSection(key) {
  return `
    <h2 class="big-section">${surfaceLabels[key]}</h2>
    <p class="section-desc">For use on <code class="tok">${key === "onPrimary" ? "button.primary" : "button.secondary"}</code>'s fill — the demo box below is coloured to match that surface (orange active fill for onPrimary, the neutral surface-6 for onNeutral), fixed 64×64; see <a href="button.html">the icon+text+counter button variant</a> for how it looks in a real button.</p>
    <div class="story-grid">
      ${storyCard("inactive", markup("base", key, "inactive"), markup("base", key, "inactive"), key === "onPrimary" ? "Seen/zero count — a faint lighten-2 wash over the button's active fill, white text." : "A faint lighten-2 wash over the neutral surface, white text.", `demo-box--${key}`)}
      ${storyCard("active", markup("base", key, "active"), markup("base", key, "active"), key === "onPrimary" ? "A meaningful count — a solid white pill with dark text, pops off the active fill." : "The active colour (orange) pill with dark text, pops against the neutral surface.", `demo-box--${key}`)}
    </div>`;
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Counter</title>
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
  .section-desc { font-size: 13.5px; color: var(--text-secondary); margin: -0.75rem 0 1.75rem; max-width: 68ch; line-height: 1.6; }

  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 14px 18px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1rem; line-height: 1.6; }
  .legend .row { display: flex; gap: 14px; padding: 6px 0; border-bottom: 0.5px solid var(--border); }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 150px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  code.tok { font-family: var(--mono); font-size: 12px; color: var(--accent); }

  pre.code { background: var(--code-bg); color: var(--code-text); border-radius: 10px; padding: 16px 18px; margin: 0; overflow-x: auto; font-family: var(--mono); font-size: 12px; line-height: 1.7; }
  pre.code code { font-family: inherit; }

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 64px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .demo-box { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 8px; background: var(--border-strong); }
  .demo-box--onPrimary { background: var(--tok-fill-active); }
  .demo-box--onNeutral { background: var(--tok-fill-neutral); }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("counter")}
  </nav>
  <main>
    <h1>Counter</h1>
    <p class="sub">tokens/components/counter.tokens.json · onPrimary + onNeutral variants · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Scope</b><span>Two surface variants exist so far — one per <a href="button.html">button</a> variant's fill. A standalone counter for plain page surfaces (nav badges, list rows) is deferred until a real use case needs it.</span></div>
      <div class="row"><b>Sizing</b><span>Shared by both surfaces — mirrors button's sm/base/lg 1:1, height = the same dim step as that size's iconSize (16/20/24px), so the pill lines up with the icon beside it.</span></div>
      <div class="row"><b>On Primary</b><span>On the orange active fill: inactive → lighten-2 (12% white) wash + white text; active → white pill + dark text.</span></div>
      <div class="row"><b>On Neutral</b><span>On a neutral surface: inactive → lighten-2 wash + white text; active → the active colour (orange) pill + dark text, so it pops against the grey.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <p class="section-desc">One base <code class="tok">.counter</code> class, a shared <code class="tok">--sm/--base/--lg</code> size modifier, and <code class="tok">--onPrimary/--onNeutral</code> combined with <code class="tok">--inactive/--active</code> for color.</p>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">Shared across both surface variants — shown here at onPrimary/inactive as the reference.</p>
    <div class="story-grid">
      ${sizeStories}
    </div>

    ${surfaceSection("onPrimary")}
    ${surfaceSection("onNeutral")}

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/counter.html"), html);
console.log("wrote docs/counter.html");
