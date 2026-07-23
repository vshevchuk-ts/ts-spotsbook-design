// Regenerates docs/semantic-colors.html — the semantic color legend.
// Each canonical semantic token renders as an accordion: swatch + name + value +
// role on the summary; the full description, the primitive it aliases, and a
// generated "Used in" index (which components reference it, with links + context)
// on expand. COMPAT aliases (semantic→semantic) are excluded from the accordions
// but are followed so a component using an old name (e.g. fill.primary) is still
// bucketed under its canonical token (fill.active).
// Run: node tools/build-semantic-colors-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNav } from "./lib/nav.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const load = (p) => JSON.parse(fs.readFileSync(path.join(root, p)));

const primitives = load("tokens/primitives/color.tokens.json").color;
const semantic = load("tokens/semantic/color.tokens.json");

// ---- resolution against primitives + semantic ----
const reg = { color: primitives, ...semantic };
function get(ref) {
  const parts = ref.replace(/[{}]/g, "").split(".");
  let n = reg;
  for (const p of parts) { if (n == null) return undefined; n = n[p]; }
  return n;
}
function resolve(v, d = 0) {
  if (d > 8) throw new Error("alias too deep: " + v);
  if (typeof v !== "string" || !v.startsWith("{")) return v; // literal (hex, rgba, gradient)
  return resolve(get(v).$value, d + 1);
}
const PAGE = resolve("{color.base.surface-0}"); // backdrop for translucent swatches

// ---- canonical vs compat ----
// canonical: $value is literal (gradient string) or points straight at a primitive.
// compat: $value points at another SEMANTIC token — follow it to find the canonical.
const isPrimitiveRef = (v) => typeof v === "string" && v.startsWith("{color.");
const isSemanticRef = (v) => typeof v === "string" && v.startsWith("{") && !v.startsWith("{color.");
function canonicalOf(group, key, d = 0) {
  if (d > 8) return `${group}.${key}`;
  const v = semantic[group][key].$value;
  if (isSemanticRef(v)) {
    const [g2, k2] = v.replace(/[{}]/g, "").split(".");
    return canonicalOf(g2, k2, d + 1);
  }
  return `${group}.${key}`; // literal or primitive ref → this is canonical
}

// ---- usage index: canonical token -> [{component, context}] ----
const SEMANTIC_GROUPS = new Set(Object.keys(semantic));
const usage = {}; // "group.key" -> Map(component -> [contexts])
const compDir = "tokens/components";
for (const file of fs.readdirSync(path.join(root, compDir)).filter((f) => f.endsWith(".json"))) {
  const comp = file.replace(".tokens.json", "");
  const tree = load(`${compDir}/${file}`);
  const walk = (node, trail) => {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$description") continue;
      if (v && typeof v === "object") {
        if (typeof v.$value === "string" && v.$value.startsWith("{")) {
          const [g, kk] = v.$value.replace(/[{}]/g, "").split(".");
          if (SEMANTIC_GROUPS.has(g) && semantic[g] && semantic[g][kk]) {
            const canon = canonicalOf(g, kk);
            usage[canon] = usage[canon] || new Map();
            const ctx = trail.filter(Boolean).join(" · ");
            if (!usage[canon].has(comp)) usage[canon].set(comp, []);
            usage[canon].get(comp).push(ctx);
          }
        }
        // recurse (skip the leading component.<name> wrapper for cleaner context)
        walk(v, k === "component" ? trail : [...trail, k]);
      }
    }
  };
  // unwrap component.<name> so contexts start at the variant level
  const inner = tree.component ? Object.values(tree.component)[0] : tree;
  walk(inner, []);
}

// ---- rendering ----
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const firstSentence = (d) => (d || "").split(/(?<=\.)\s/)[0];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function swatch(value) {
  const translucent = typeof value === "string" && value.startsWith("rgba");
  // Translucent tokens are painted on a checkerboard so it is unmistakable they
  // are see-through — otherwise a 12% tint over a dark backing just reads as a
  // flat dark color. The row also shows the real over-the-page look on the left.
  if (translucent) {
    return `<span class="sw sw-alpha" title="translucent — shown on a checkerboard, and over the page color, so the transparency is visible">
      <span class="sw-half" style="background:${PAGE}"><span class="sw-in" style="background:${value}"></span></span>
      <span class="sw-half sw-check"><span class="sw-in" style="background:${value}"></span></span>
    </span>`;
  }
  return `<span class="sw"><span class="sw-in" style="background:${value}"></span></span>`;
}

function usageBlock(canon) {
  const m = usage[canon];
  if (!m || m.size === 0) return `<p class="used none">Not yet referenced by any component token.</p>`;
  const rows = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([comp, ctxs]) => {
    const uniq = [...new Set(ctxs)].filter(Boolean);
    const shown = uniq.slice(0, 6).map((c) => `<code>${esc(c)}</code>`).join(" ");
    const more = uniq.length > 6 ? ` <span class="more">+${uniq.length - 6}</span>` : "";
    return `<li><a href="${comp}.html">${cap(comp)}</a><span class="ctx">${shown || "<code>—</code>"}${more}</span></li>`;
  });
  return `<p class="used-h">Used in ${m.size} component${m.size > 1 ? "s" : ""}:</p><ul class="used-list">${rows.join("")}</ul>`;
}

// leaf walk: canonical tokens only, in declared order, skipping compat keys
function canonicalTokens(group) {
  return Object.entries(semantic[group])
    .filter(([k]) => !k.startsWith("$"))
    .filter(([k, tok]) => !isSemanticRef(tok.$value)) // exclude compat aliases
    .map(([k, tok]) => [k, tok]);
}

function renderGroup(group) {
  const toks = canonicalTokens(group);
  if (toks.length === 0) return "";
  const gdesc = semantic[group].$description || "";
  const items = toks.map(([key, tok]) => {
    const value = resolve(tok.$value);
    const canon = `${group}.${key}`;
    const isLiteral = !isPrimitiveRef(tok.$value);
    const aliasRef = isLiteral ? "literal" : tok.$value.replace(/[{}]/g, "");
    const role = firstSentence(tok.$description);
    const rest = (tok.$description || "").slice(role.length).trim();
    return `<details class="tok">
      <summary>
        <span class="chev" aria-hidden="true">›</span>
        ${swatch(value)}
        <code class="tname">${group}.${key}</code>
        <code class="talias-sum">${isLiteral ? esc(value) : "→ " + esc(aliasRef)}</code>
        <span class="trole">${esc(role)}</span>
      </summary>
      <div class="tbody">
        ${rest ? `<p class="tdesc">${esc(rest)}</p>` : ""}
        <p class="tresolves">Resolves to <code>${esc(value)}</code>${isLiteral ? "" : ` &nbsp;·&nbsp; alias of <code>${esc(aliasRef)}</code>`}</p>
        ${usageBlock(canon)}
      </div>
    </details>`;
  }).join("\n");
  return `<section class="group">
    <h3 class="gname">${group}</h3>
    <p class="gdesc">${esc(gdesc)}</p>
    <div class="toks">${items}</div>
  </section>`;
}

const ORDER = ["surface", "fill", "bg", "outline", "text", "icon", "betStatus", "label", "darken", "lighten", "shadow", "additional"];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — semantic colors</title>
<link rel="stylesheet" href="../assets/fonts/rubik/rubik.css" />
<style>
  :root {
    --bg-page: #f7f7f5; --bg-card: #ffffff; --bg-card-hover: #fbfbfa;
    --border: #e4e3df; --border-strong: #d2d1cb;
    --text-primary: #0e0e10; --text-secondary: #63625c; --text-muted: #918f87;
    --accent: #0468c4; --accent-bg: #eff6ff;
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
  body { margin: 0; background: var(--bg-page); color: var(--text-primary); font-family: var(--sans); }
  .shell { display: flex; min-height: 100vh; }
  nav.side { width: 220px; flex-shrink: 0; border-right: 0.5px solid var(--border); padding: 1.5rem 1rem; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .brand { font-size: 14px; font-weight: 600; margin: 0 0 2px 8px; }
  .brand-sub { font-size: 11.5px; color: var(--text-muted); margin: 0 0 1.5rem 8px; }
  .navlink { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 8px; border-radius: 7px; font-size: 13px; text-decoration: none; color: var(--text-primary); margin-bottom: 1px; }
  .navlink:hover { background: var(--bg-card-hover); }
  .navlink.active { background: var(--accent-bg); color: var(--accent); font-weight: 600; }
  .nav-category { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 16px 8px 6px; }
  .tag { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); border: 0.5px solid var(--border-strong); border-radius: 4px; padding: 1px 5px; }
  main { flex: 1; padding: 3rem 3rem 4rem; max-width: 960px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  .sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 1.6rem; max-width: 72ch; line-height: 1.5; }
  .group { margin: 2.4rem 0 0; }
  .gname { font-size: 15px; font-weight: 600; margin: 0 0 3px; font-family: var(--mono); }
  .gdesc { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 0.7rem; max-width: 78ch; line-height: 1.5; }
  .toks { border: 0.5px solid var(--border); border-radius: 10px; overflow: hidden; }
  details.tok { border-bottom: 0.5px solid var(--border); background: var(--bg-card); }
  details.tok:last-child { border-bottom: none; }
  details.tok > summary { display: grid; grid-template-columns: 14px 30px 180px 190px 1fr; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; list-style: none; }
  details.tok > summary::-webkit-details-marker { display: none; }
  details.tok > summary:hover { background: var(--bg-card-hover); }
  .chev { font-family: var(--mono); font-size: 15px; color: var(--text-muted); transition: transform 0.12s ease; line-height: 1; text-align: center; }
  details.tok[open] > summary .chev { transform: rotate(90deg); }
  .sw { position: relative; display: flex; width: 28px; height: 24px; border-radius: 6px; border: 0.5px solid var(--border-strong); overflow: hidden; }
  .sw-in { display: block; width: 100%; height: 100%; }
  .sw-half { flex: 1; min-width: 0; }
  .sw-check { background-image: linear-gradient(45deg, #bbb 25%, transparent 25%), linear-gradient(-45deg, #bbb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #bbb 75%), linear-gradient(-45deg, transparent 75%, #bbb 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0; background-color: #fff; }
  .tname { font-family: var(--mono); font-size: 12px; font-weight: 600; }
  .talias-sum { font-family: var(--mono); font-size: 11px; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trole { font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tbody { padding: 4px 14px 16px 56px; }
  .tdesc { font-size: 12.5px; color: var(--text-secondary); margin: 6px 0 10px; max-width: 74ch; line-height: 1.55; }
  .tresolves { font-size: 11.5px; color: var(--text-muted); margin: 0 0 12px; }
  .tresolves code, .used-list code { font-family: var(--mono); background: var(--bg-card-hover); border: 0.5px solid var(--border); border-radius: 4px; padding: 0.5px 5px; font-size: 11px; }
  .used-h { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }
  .used-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
  .used-list li { display: flex; gap: 10px; align-items: baseline; font-size: 12px; flex-wrap: wrap; }
  .used-list li > a { font-weight: 600; color: var(--accent); text-decoration: none; min-width: 96px; }
  .used-list li > a:hover { text-decoration: underline; }
  .ctx { display: flex; gap: 5px; flex-wrap: wrap; align-items: baseline; }
  .ctx .more { font-size: 10.5px; color: var(--text-muted); }
  .used.none { font-size: 12px; color: var(--text-muted); font-style: italic; margin: 0; }
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("semantic-colors")}
  </nav>
  <main>
    <h1>Semantic colors</h1>
    <p class="sub">One accordion per semantic token — click a row (the <code>›</code> chevron) to open it. The summary shows the swatch, the token name, and the <strong>primitive it aliases</strong> (in blue) — resolved hex/rgba lives inside on expand. Translucent tokens (the 12% tints, darken/lighten, shadows) render split: the left half over the page color (real look), the right half on a <strong>checkerboard</strong> so the transparency is obvious rather than reading as a flat dark color. Expand for the full note, the resolved value, and every component that uses it — with a link and the in-component context. COMPAT aliases (old names kept alive during the component migration) are hidden here but still route their usages to the canonical token. Values are baked to the <strong>Pro</strong> theme. Source: <code>tokens/semantic/color.tokens.json</code> → <code>tokens/primitives/color.tokens.json</code>.</p>
    ${ORDER.map(renderGroup).join("\n")}
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/semantic-colors.html"), html);
console.log("wrote docs/semantic-colors.html");
