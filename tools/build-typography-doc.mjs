// Regenerates docs/typography.html from tokens/primitives/typography.tokens.json
// and text-styles.tokens.json. Run: node tools/build-typography-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const typo = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/typography.tokens.json")));
const styles = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/text-styles.tokens.json")))["text-style"];

function resolve(ref) {
  // "{size.xl}" -> typo.size.xl
  const path_ = ref.replace(/[{}]/g, "").split(".");
  let node = typo;
  for (const p of path_) node = node[p];
  return node;
}

function px(dim) {
  return `${dim.value}${dim.unit}`;
}

const fontSans = typo.family.sans.$value; // resolved family, e.g. "Rubik" — never hardcode

const styleRows = Object.entries(styles)
  .filter(([k]) => !k.startsWith("$"))
  .map(([name, tok]) => {
    const v = tok.$value;
    const weight = resolve(v.fontWeight).$value;
    const size = resolve(v.fontSize).$value;
    const leading = resolve(v.lineHeight).$value;
    const tracking = resolve(v.letterSpacing).$value;
    const ext = tok.$extensions?.["turbo.sportsbook/text"] || {};
    return { name, weight, size: px(size), leading, tracking: px(tracking), ...ext };
  });

const sampleText = {
  body: "Cash out is available until the final whistle on this market.",
  heading: "Match winner",
  title: "Manchester City vs Fulham",
  link: "View all markets",
  label: "Freebet",
};
function sampleFor(name) {
  if (name.startsWith("body")) return sampleText.body;
  if (name.startsWith("heading")) return sampleText.heading;
  if (name.startsWith("title")) return sampleText.title;
  if (name.startsWith("link")) return sampleText.link;
  return sampleText.label;
}

const familyRows = Object.entries(typo.family).filter(([k]) => !k.startsWith("$"));
const weightRows = Object.entries(typo.weight).filter(([k]) => !k.startsWith("$"));
const sizeRows = Object.entries(typo.size).filter(([k]) => !k.startsWith("$"));
const leadingRows = Object.entries(typo.leading).filter(([k]) => !k.startsWith("$"));
const trackingRows = Object.entries(typo.tracking).filter(([k]) => !k.startsWith("$"));

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — typography</title>
<link rel="stylesheet" href="../assets/fonts/rubik/rubik.css" />
<style>
  :root {
    --bg-page: #f7f7f5; --bg-card: #ffffff; --bg-card-hover: #fbfbfa;
    --border: #e4e3df; --border-strong: #d2d1cb;
    --text-primary: #0e0e10; --text-secondary: #63625c; --text-muted: #918f87;
    --accent: #0468c4; --accent-bg: #eff6ff;
    --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --ui-sans: -apple-system, "Segoe UI", system-ui, sans-serif;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) {
      --bg-page: #17171a; --bg-card: #1e1e22; --bg-card-hover: #232327;
      --border: #313035; --border-strong: #403f45;
      --text-primary: #f2f1ee; --text-secondary: #a7a5a0; --text-muted: #706e68;
      --accent: #5aa4ec; --accent-bg: #16283b;
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --bg-page: #17171a; --bg-card: #1e1e22; --bg-card-hover: #232327;
    --border: #313035; --border-strong: #403f45;
    --text-primary: #f2f1ee; --text-secondary: #a7a5a0; --text-muted: #706e68;
    --accent: #5aa4ec; --accent-bg: #16283b;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg-page); color: var(--text-primary); font-family: var(--ui-sans); }
  .shell { display: flex; min-height: 100vh; }
  nav.side { width: 220px; flex-shrink: 0; border-right: 0.5px solid var(--border); padding: 1.5rem 1rem; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .brand { font-size: 14px; font-weight: 600; margin: 0 0 2px 8px; }
  .brand-sub { font-size: 11.5px; color: var(--text-muted); margin: 0 0 1.5rem 8px; }
  .navlink { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 8px; border-radius: 7px; font-size: 13px; text-decoration: none; color: var(--text-primary); margin-bottom: 1px; }
  .navlink:hover { background: var(--bg-card-hover); }
  .navlink.active { background: var(--accent-bg); color: var(--accent); font-weight: 600; }
  .navlink.disabled { color: var(--text-muted); cursor: default; pointer-events: none; }
  .nav-category { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 16px 8px 6px; }
  .tag { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); border: 0.5px solid var(--border-strong); border-radius: 4px; padding: 1px 5px; }
  main { flex: 1; padding: 3rem 3rem 4rem; max-width: 1000px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  .sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 2rem; }
  h2.section { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin: 2.5rem 0 0.9rem; }
  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 12px 16px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1rem; }
  .legend .row { display: flex; gap: 14px; padding: 5px 0; border-bottom: 0.5px solid var(--border); }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 150px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  table.scale { border-collapse: collapse; width: 100%; font-size: 13px; }
  table.scale th, table.scale td { text-align: left; padding: 6px 12px 6px 0; border-bottom: 0.5px solid var(--border); font-variant-numeric: tabular-nums; }
  table.scale th { color: var(--text-secondary); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
  code.tok { font-family: var(--mono); font-size: 12px; color: var(--accent); }
  .specimen { border: 0.5px solid var(--border); border-radius: 12px; background: var(--bg-card); padding: 16px 20px; margin-bottom: 8px; display: flex; align-items: baseline; gap: 20px; }
  .specimen .meta { width: 190px; flex-shrink: 0; font-family: var(--mono); font-size: 11px; color: var(--text-muted); line-height: 1.6; }
  .specimen .meta b { color: var(--text-secondary); font-family: var(--ui-sans); font-size: 12px; display: block; margin-bottom: 2px; }
  .specimen .sample { flex: 1; color: var(--text-primary); min-width: 0; }
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("typography")}
  </nav>
  <main>
    <h1>Typography</h1>
    <p class="sub">tokens/primitives/typography.tokens.json + text-styles.tokens.json · generated</p>

    <h2 class="section">Primitives</h2>
    <table class="scale">
      <tr><th>Family</th><th>Value</th></tr>
      ${familyRows.map(([k, v]) => `<tr><td><code class="tok">--sans</code></td><td style="font-family:'${fontSans}', sans-serif">${v.$value}</td></tr>`).join("\n      ")}
      <tr><td><code class="tok">Cyrillic</code></td><td style="font-family:'${fontSans}', sans-serif">Ставка прийнята · Матч у прямому ефірі · Вивести кошти</td></tr>
    </table>
    <table class="scale" style="margin-top:1.2rem">
      <tr><th>Weight</th><th>Value</th></tr>
      ${weightRows.map(([k, v]) => `<tr><td><code class="tok">--${k}</code></td><td style="font-weight:${v.$value}">${v.$value}</td></tr>`).join("\n      ")}
    </table>
    <table class="scale" style="margin-top:1.2rem">
      <tr><th>Size</th><th>Value</th></tr>
      ${sizeRows.map(([k, v]) => `<tr><td><code class="tok">--text-${k}</code></td><td>${px(v.$value)}</td></tr>`).join("\n      ")}
    </table>
    <table class="scale" style="margin-top:1.2rem">
      <tr><th>Leading</th><th>Value</th></tr>
      ${leadingRows.map(([k, v]) => `<tr><td><code class="tok">--leading-${k}</code></td><td>${v.$value}</td></tr>`).join("\n      ")}
    </table>
    <table class="scale" style="margin-top:1.2rem">
      <tr><th>Tracking</th><th>Value</th></tr>
      ${trackingRows.map(([k, v]) => `<tr><td><code class="tok">--tracking-${k}</code></td><td>${px(v.$value)}</td></tr>`).join("\n      ")}
    </table>

    <h2 class="section">Text styles</h2>
    <div class="legend">
      <div class="row"><b>body-*</b><span>Default paragraph/UI text — table cells, form fields, descriptions, list items.</span></div>
      <div class="row"><b>heading-*</b><span>Same size ladder as body, semibold — in-content emphasis without a size jump: card titles, sidebar section names, subsection labels.</span></div>
      <div class="row"><b>title-*</b><span>Page/modal-level titles — bold, sizes beyond body/heading's range (20–30px), tightened leading for single-line display.</span></div>
      <div class="row"><b>link-*</b><span>Any interactive inline text. Underline is the affordance — never rely on color alone to signal "clickable".</span></div>
      <div class="row"><b>label-*</b><span>Uppercase micro-labels only — badges, chips, filter pills, table column headers. Never full sentences (all-caps hurts readability past a few words).</span></div>
    </div>
    ${styleRows
      .map((r) => {
        const css = `font-family:'${fontSans}', sans-serif;font-weight:${r.weight};font-size:${r.size};line-height:${r.leading};letter-spacing:${r.tracking};${r.textDecoration ? `text-decoration:${r.textDecoration};` : ""}${r.textTransform ? `text-transform:${r.textTransform};` : ""}`;
        return `<div class="specimen">
      <div class="meta"><b>${r.name}</b>${r.weight} · ${r.size} · lh ${r.leading} · tr ${r.tracking}${r.textTransform ? " · " + r.textTransform : ""}${r.textDecoration ? " · " + r.textDecoration : ""}</div>
      <div class="sample" style="${css}">${sampleFor(r.name)}</div>
    </div>`;
      })
      .join("\n    ")}
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/typography.html"), html);
console.log("wrote docs/typography.html");
