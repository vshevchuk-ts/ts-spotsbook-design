// Regenerates docs/badge.html from tokens/components/badge.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Universal non-interactive display pill — two independent axes on top of
// sm/base/lg sizing: "role" (5 meaningful states, reuses bg.*/fill.*/text.*
// the same way Button/Card/Menu already do) and "color" (10 decorative hues
// for generic tagging via the new tag.* semantic group, unrelated to status
// meaning). Both support tint (pale bg) and solid (saturated bg) fill.
// Split deliberately from Chip (not yet built) — status/tag pill vs.
// checkbox-like toggle are different ARIA roles, same reasoning as Menu/Listbox.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-badge-doc.mjs
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
const badge = load("tokens/components/badge.tokens.json").component.badge;

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

const ROLES = ["neutral", "primary", "success", "warning", "danger"];
const COLORS = ["gray", "blue", "red", "green", "amber", "orange", "violet", "magenta", "teal", "brown"];
const FILLS = ["tint", "solid"];
const SIZES = ["sm", "base", "lg"];

// ---- resolve every role/color x tint/solid pair straight from the component
// token file's own $value refs (never retype a color-role name by hand) ----
function resolvePair(node) {
  return { bg: resolveValue(node.bg.$value), text: resolveValue(node.text.$value) };
}
const roleColors = {};
for (const r of ROLES) {
  roleColors[r] = {};
  for (const f of FILLS) roleColors[r][f] = resolvePair(badge.role[r][f]);
}
const colorColors = {};
for (const c of COLORS) {
  colorColors[c] = {};
  for (const f of FILLS) colorColors[c][f] = resolvePair(badge.color[c][f]);
}

// ---- CSS var registration: one var per unique resolved token path, so
// role=blue-tint and color=blue-tint (true aliases of each other) share the
// exact same --tok-* variable instead of emitting two identically-valued vars ----
const colorVarPaths = new Set();
function pathsOf(node) {
  colorVarPaths.add(node.bg.$value.replace(/[{}]/g, ""));
  colorVarPaths.add(node.text.$value.replace(/[{}]/g, ""));
}
for (const r of ROLES) for (const f of FILLS) pathsOf(badge.role[r][f]);
for (const c of COLORS) for (const f of FILLS) pathsOf(badge.color[c][f]);
const uniqPaths = [...colorVarPaths];
const colorValue = Object.fromEntries(uniqPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...uniqPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const sizeDefs = SIZES.map((key) => {
  const s = badge.size[key];
  return { key, height: resolve(s.height.$value), paddingX: resolve(s.paddingX.$value), label: resolveToken(s.label) };
});
const radius = px(resolve(badge.radius.$value));

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}
// Real var-path lookup (not resolved-hex) for CSS generation, per size/role/color.
const refPath = (ref) => ref.replace(/[{}]/g, "");

const css = `${rootVars}

.badge { box-sizing: border-box; display: inline-flex; align-items: center; border-radius: ${radius}; font-family: ${cv("family.sans")}; white-space: nowrap; }
${sizeDefs.map((s) => `.badge--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; ${typoCss(s.label)} }`).join("\n")}
${ROLES.map((r) => FILLS.map((f) => `.badge--role-${r}.badge--${f} { background: ${cv(refPath(badge.role[r][f].bg.$value))}; color: ${cv(refPath(badge.role[r][f].text.$value))}; }`).join("\n")).join("\n")}
${COLORS.map((c) => FILLS.map((f) => `.badge--color-${c}.badge--${f} { background: ${cv(refPath(badge.color[c][f].bg.$value))}; color: ${cv(refPath(badge.color[c][f].text.$value))}; }`).join("\n")).join("\n")}`;

function markup(sizeKey, kind, name, fill, label) {
  const flavor = kind === "role" ? `role-${name}` : `color-${name}`;
  return `<span class="badge badge--${sizeKey} badge--${fill} badge--${flavor}">${label}</span>`;
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

// ---- Sizes (base role=primary, tint, as reference) ----
function sizeStories() {
  return sizeDefs
    .map((s) => storyCard(`${s.key} — ${px(s.height)}`, markup(s.key, "role", "primary", "tint", "In Inbox"), markup(s.key, "role", "primary", "tint", "In Inbox")))
    .join("\n");
}

// ---- Role x fill ----
const roleNotes = {
  neutral: "bg.neutral/fill.neutral + text.default — the one role without a colored text counterpart.",
  primary: "bg.primary/fill.primary + text.primary/text.onFill — an open/active thread, or any 'in progress' status.",
  success: "bg.success/fill.success + text.success/text.onFill.",
  warning: "bg.warning/fill.warning + text.warning/text.onFill — an upcoming expiry, not yet expired.",
  danger: "bg.danger/fill.danger + text.danger/text.onFill — already past its expiry date.",
};
function roleStories() {
  return ROLES.map((r) =>
    storyCard(
      r,
      `<div style="display:flex; gap:10px; align-items:center;">${markup("base", "role", r, "tint", "Label")}${markup("base", "role", r, "solid", "Label")}</div>`,
      `${markup("base", "role", r, "tint", "Label")}\n${markup("base", "role", r, "solid", "Label")}`,
      roleNotes[r]
    )
  ).join("\n");
}

// ---- Color x fill (10 decorative hues) ----
function colorStories() {
  return COLORS.map((c) => {
    const roleAlias = { gray: "neutral", blue: "primary", red: "danger", green: "success", amber: "warning" }[c];
    const note =
      c === "gray"
        ? `Tint aliases role="neutral". Solid does not — fill.neutral is the same pale value as its own tint, so solid uses a real filled color.gray.500 + white instead.`
        : roleAlias
        ? `Alias of role="${roleAlias}" — same tokens, renders identically.`
        : "New leaf color — not tied to any status role.";
    return storyCard(
      c,
      `<div style="display:flex; gap:10px; align-items:center;">${markup("base", "color", c, "tint", "Label")}${markup("base", "color", c, "solid", "Label")}</div>`,
      `${markup("base", "color", c, "tint", "Label")}\n${markup("base", "color", c, "solid", "Label")}`,
      note
    );
  }).join("\n");
}

const usageDemo = `<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
      ${markup("base", "role", "primary", "tint", "In Inbox")}
      <span style="color:${cv("text.secondary")}; font-family:${cv("family.sans")}; font-size:13px;">Course withdrawal deadline</span>
      ${markup("base", "role", "warning", "tint", "Expires Jul 20")}
    </div>`;
const usageCode = `<div class="thread-list-item">
  <span class="badge badge--base badge--tint badge--role-primary">In Inbox</span>
  <span class="subject">Course withdrawal deadline</span>
  <span class="badge badge--base badge--tint badge--role-warning">Expires Jul 20</span>
</div>`;

const tagUsageDemo = `<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
      ${markup("sm", "color", "violet", "tint", "Design")}
      ${markup("sm", "color", "teal", "tint", "Engineering")}
      ${markup("sm", "color", "orange", "solid", "Urgent")}
    </div>`;
const tagUsageCode = `<div class="label-list">
  <span class="badge badge--sm badge--tint badge--color-violet">Design</span>
  <span class="badge badge--sm badge--tint badge--color-teal">Engineering</span>
  <span class="badge badge--sm badge--solid badge--color-orange">Urgent</span>
</div>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Badge</title>
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

  .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
  .story { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 22px; display: flex; flex-direction: column; gap: 12px; }
  .story h3 { font-size: 14px; font-weight: 600; margin: 0; font-family: var(--mono); }
  .story-preview { min-height: 40px; display: flex; align-items: center; justify-content: center; padding: 12px 0; }
  .story-note { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

  .usage-preview { border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-card); padding: 20px 24px; margin-bottom: 1rem; }

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("badge")}
  </nav>
  <main>
    <h1>Badge</h1>
    <p class="sub">tokens/components/badge.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, nothing hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Purpose</b><span>A non-interactive display pill — status/expiry indicators in Message Center's thread list, and a generic tag/label for any other product surface. Display only — no click, no dismiss.</span></div>
      <div class="row"><b>role vs. color</b><span>Two independent axes, never combined. <code class="tok">role</code> = 5 meaningful states (neutral/primary/success/warning/danger), reusing the exact same <code class="tok">bg.*</code>/<code class="tok">fill.*</code>/<code class="tok">text.*</code> roles Button/Card/Menu already use. <code class="tok">color</code> = 10 decorative hues for generic tagging, unrelated to status meaning — picking <code class="tok">color="orange"</code> means "I want an orange label," not "this is a warning."</span></div>
      <div class="row"><b>tint vs. solid</b><span>Every role and color supports both: <code class="tok">tint</code> (pale bg + colored text, 100/600 step) and <code class="tok">solid</code> (saturated bg + <code class="tok">text.onFill</code>, 500 step) — the same intensity pair Button/Card/Menu already split into <code class="tok">bg.*</code> vs. <code class="tok">fill.*</code>.</span></div>
      <div class="row"><b>Not Chip</b><span>The interactive filter-toggle sibling (checked/unchecked, clickable) is a separate component on purpose — a status/tag pill and a checkbox-like control are different ARIA roles, same reasoning the Menu/Listbox split already established.</span></div>
      <div class="row"><b>Zero-to-minimal new tokens</b><span>Every <code class="tok">role</code> pair and 5 of the 10 <code class="tok">color</code> pairs (gray/blue/red/green/amber) are pure reuses of existing semantic tokens. Only orange/violet/magenta/teal/brown needed new leaf color references (<code class="tok">tag.*</code>, tokens/semantic/color.tokens.json).</span></div>
      <div class="row"><b>Sizes</b><span>sm 16 / base 20 / lg 24 — deliberately mirrors Counter's own height/paddingX/label ladder (resolved from Counter's real values, not re-guessed) so the two small-pill components line up when they sit side by side.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">sm / base / lg, role="primary" tint as the reference.</p>
    <div class="story-grid">
      ${sizeStories()}
    </div>

    <h2 class="big-section">Roles</h2>
    <p class="section-desc">5 roles × tint/solid, base size. Left = tint, right = solid, in every card.</p>
    <div class="story-grid">
      ${roleStories()}
    </div>

    <h2 class="big-section">Colors</h2>
    <p class="section-desc">10 decorative hues × tint/solid, base size. gray/blue/red/green/amber are aliases of the role tokens above; orange/violet/magenta/teal/brown are new.</p>
    <div class="story-grid">
      ${colorStories()}
    </div>

    <h2 class="big-section">In context</h2>
    <p class="section-desc">Two real usage sketches — the driving Message Center case (role, status/expiry) and a generic tagging case (color, unrelated to status).</p>
    <div class="usage-preview">${usageDemo}</div>
    <pre class="code"><code>${esc(usageCode)}</code></pre>
    <div class="usage-preview" style="margin-top:1.5rem;">${tagUsageDemo}</div>
    <pre class="code"><code>${esc(tagUsageCode)}</code></pre>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/badge.html"), html);
console.log("wrote docs/badge.html");
