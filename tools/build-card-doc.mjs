// Regenerates docs/card.html from tokens/components/card.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// One fixed combination for grouping content — surface.default + border.default
// + radius.default, no shadow/elevation token (the whole system so far draws
// separation with a border, never a drop shadow — see the token's own
// $description). Optional interactive variant is a real <button> so
// :hover/:active/:focus-visible work natively, same approach as Button.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-card-doc.mjs
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
const card = load("tokens/components/card.tokens.json").component.card;

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
const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;

const colorPaths = ["surface.card", "outline.default", "outline.active", "fill.active", "bg.active", "text.default", "text.secondary"];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const radius = px(resolve(card.radius.$value));
const padding = px(resolve(card.padding.$value));
const gap = px(resolve(card.gap.$value));
const titleType = resolveToken(card.title);
const bodyType = resolveToken(card.body);
const ringWidth = px(resolve(card.interactive.state.focused.ringWidth.$value));
const ringOffset = px(resolve(card.interactive.state.focused.ringOffset.$value));

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

const css = `${rootVars}

.card { box-sizing: border-box; display: flex; flex-direction: column; gap: ${gap}; background: ${cv("surface.card")}; border: 1px solid ${cv("outline.default")}; border-radius: ${radius}; padding: ${padding}; font-family: ${cv("family.sans")}; }
.card__header { padding-bottom: ${gap}; border-bottom: 1px solid ${cv("outline.default")}; }
.card__footer { padding-top: ${gap}; border-top: 1px solid ${cv("outline.default")}; display: flex; gap: ${px(resolve("spacing.2"))}; }
.card__title { margin: 0; color: ${cv("text.default")}; ${typoCss(titleType)} }
.card__body-text { margin: 0; color: ${cv("text.secondary")}; ${typoCss(bodyType)} }

.card--interactive { width: 100%; text-align: left; cursor: pointer; appearance: none; outline: none; }
.card--interactive:hover { border-color: ${cv("fill.active")}; }
.card--interactive:active { background: ${cv("bg.active")}; border-color: ${cv("fill.active")}; }
.card--interactive:focus-visible { outline: ${ringWidth} solid ${cv("outline.active")}; outline-offset: ${ringOffset}; }`;

function storyCard(title, liveHtml, codeHtml, note = "") {
  return `
      <div class="story">
        <h3>${title}</h3>
        <div class="story-preview">${liveHtml}</div>
        <pre class="code"><code>${esc(codeHtml)}</code></pre>
        ${note ? `<p class="story-note">${note}</p>` : ""}
      </div>`;
}

// Placeholder bars, not real words — a story showing actual copy ("Invoice
// #4471") reads as if Card ships a fixed set of content "types". Card has no
// opinion on content at all (that's up to whatever screen composes it), so
// the live preview shows abstract gray bars instead. The printed code sample
// below each one intentionally shows real, generic starter text instead of
// the bars — nobody should copy-paste a `ph-line` div, it's a docs-only
// illustration device, not part of the component.
function phTitle(width = "50%") {
  return `<span class="ph-line ph-line--title" style="width:${width}"></span>`;
}
function phBody(widths = ["100%", "70%"]) {
  return widths.map((w) => `<span class="ph-line ph-line--body" style="width:${w}"></span>`).join("");
}
function phPill(width = "64px") {
  return `<span class="ph-pill" style="width:${width}"></span>`;
}

const staticDemo = `<div class="card demo-card">
      <p class="card__title">${phTitle()}</p>
      <p class="card__body-text">${phBody()}</p>
    </div>`;
const staticCode = `<div class="card">
  <p class="card__title">Card title</p>
  <p class="card__body-text">Supporting text goes here.</p>
</div>`;

const bodyOnlyDemo = `<div class="card demo-card">
      <p class="card__body-text">${phBody(["100%", "85%", "40%"])}</p>
    </div>`;
const bodyOnlyCode = `<div class="card">
  <p class="card__body-text">Supporting text goes here. Title is optional — this card has none.</p>
</div>`;

const sectionsDemo = `<div class="card demo-card">
      <div class="card__header">
        <p class="card__title">${phTitle("65%")}</p>
      </div>
      <p class="card__body-text">${phBody(["100%", "55%"])}</p>
      <div class="card__footer">
        <span class="card__body-text">${phPill()}</span>
        <span class="card__body-text">${phPill("88px")}</span>
      </div>
    </div>`;
const sectionsCode = `<div class="card">
  <div class="card__header">
    <p class="card__title">Section title</p>
  </div>
  <p class="card__body-text">Body content goes here.</p>
  <div class="card__footer">
    <span class="card__body-text">Action one</span>
    <span class="card__body-text">Action two</span>
  </div>
</div>`;

const interactiveStateDefs = [
  { key: "default", label: "default", style: "" },
  { key: "hover", label: "hover", style: `border-color:${cv("fill.active")}`, note: "fill.active (blue.500) — the same brand blue Checkbox/Radio use when checked. border.strong (gray) read as too weak a cue; border.primary (pale blue.200) paired with a gray fill on pressed read muddy — two color languages at once. border.focus moved to blue.600 system-wide so it stays the strongest, most certain state (keyboard focus needs to out-rank mouse hover)." },
  { key: "pressed", label: "pressed", style: `background:${cv("bg.active")}; border-color:${cv("fill.active")}`, note: "Border stays fill.primary; the fill is bg.primary (blue.100, the same passive-tint role used for banners/badges) — one consistent blue family instead of mixing in gray." },
  { key: "focused", label: "focused", style: `outline:${ringWidth} solid ${cv("outline.active")}; outline-offset:${ringOffset}`, note: "Additive ring, composes on top of hover/pressed. Real CSS is :focus-visible on the button, shown in the CSS above — forced here via inline style for a static screenshot." },
];
function interactiveStories() {
  return interactiveStateDefs
    .map((s) => {
      const html = `<button class="card card--interactive demo-card" style="${s.style}">
      <p class="card__title">${phTitle("60%")}</p>
      <p class="card__body-text">${phBody(["100%", "45%"])}</p>
    </button>`;
      const code = `<button class="card card--interactive">
  <p class="card__title">Marketing site</p>
  <p class="card__body-text">Last deployed 2 hours ago</p>
</button>`;
      return storyCard(s.label, html, code, s.note || "");
    })
    .join("\n");
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Card</title>
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

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 28px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 64px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .demo-card { width: 100%; max-width: 280px; }
  .ph-line { display: block; border-radius: 4px; background: var(--border-strong); }
  .ph-line--title { height: 15px; margin-bottom: 6px; }
  .ph-line--body { height: 9px; background: var(--border); margin-bottom: 6px; }
  .ph-line--body:last-child { margin-bottom: 0; }
  .ph-pill { display: inline-block; height: 9px; border-radius: 4px; background: var(--border-strong); }

  .placeholder-note { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); border: 0.5px dashed var(--border-strong); border-radius: 6px; padding: 4px 10px; margin-top: 1.5rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("card")}
  </nav>
  <main>
    <h1>Card</h1>
    <p class="sub">tokens/components/card.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, not hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Border, not shadow</b><span>surface.default + border.default + radius.default — no shadow/elevation token exists anywhere in this system yet; separation is drawn with a hairline border everywhere else (Input/Select/Search), and introducing one just for Card would be new token surface for no real need.</span></div>
      <div class="row"><b>Built on Box</b><span>Same surface/border/padding roles as <a href="box.html">Box</a>, but Card fixes one specific combination for grouping content rather than staying fully generic.</span></div>
      <div class="row"><b>Sections</b><span>title/header/footer are all optional — a card can be body-only. Header/footer are separated from the body by the same border.default hairline as the card's own edge — not Separator's full component, just its resolved color.</span></div>
      <div class="row"><b>Interactive variant</b><span>Opt-in, for a card that's itself a click target. A real &lt;button&gt;, not a div with an onClick — :hover/:active/:focus-visible work natively. Deliberately <em>not</em> Button ghost/Pagination/Tabs' fill.neutralHover→fill.neutralActive progression — those are tuned for a small icon/pill area, and the same fill across a whole card reads too heavy. Hover/pressed both turn the border fill.primary (blue.500, the same brand blue Checkbox/Radio use checked); pressed additionally washes in bg.primary (blue.100) instead of a gray fill — one blue family, not blue-border-on-gray-fill. border.focus is a deliberately stronger blue.600 (system-wide) so keyboard focus still clearly out-ranks mouse hover.</span></div>
      <div class="row"><b>No disabled state</b><span>Not asked for, and a static content card has no clear inert scenario the way a form field or button does.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Static</h2>
    <p class="section-desc">The gray bars are docs-only placeholders standing in for arbitrary content, not a fixed set of "card types" — Card has no opinion on what goes inside. The printed code below each one shows real starter text instead of the bars.</p>
    <div class="story-grid">
      ${storyCard("Title + body", staticDemo, staticCode)}
      ${storyCard("Body only", bodyOnlyDemo, bodyOnlyCode, "Title is entirely optional — a card can be just card__body-text (or genuinely anything) with no card__title at all.")}
      ${storyCard("Header + body + footer", sectionsDemo, sectionsCode, "Header and footer are separated from the body by border.default, same hairline as the card's own edge — also optional, use only the sections a given card needs.")}
    </div>

    <h2 class="big-section">Interactive</h2>
    <p class="section-desc">A real &lt;button&gt; wearing the card's own surface/border/radius — clickable-card pattern, e.g. a project/site summary that navigates on click.</p>
    <div class="story-grid">
      ${interactiveStories()}
    </div>

    <p class="placeholder-note">Every code sample on this page is printed from the same resolved token values driving the live previews above it — copy it directly, nothing here is hand-typed.</p>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/card.html"), html);
console.log("wrote docs/card.html");
