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
import { createCtx } from "./lib/resolve.mjs";
import * as Badge from "./lib/components/badge.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const ctx = createCtx(["badge"]);
const { resolve, cv, px, renderRootVars } = ctx;
const badge = ctx.tokens.badge;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const { ROLES, COLORS, FILLS, SIZES, NAMED, STATUS } = Badge;
// size key + height, for the "Sizes" story titles
const sizeDefs = SIZES.map((key) => ({ key, height: resolve(badge.size[key].height.$value) }));

// ---- CSS var registration: one var per unique resolved token path (deduped) ----
const uniqPaths = Badge.colorPaths(ctx);
const colorValue = Object.fromEntries(uniqPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...uniqPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const css = `${rootVars}

${Badge.css(ctx)}`;

const markup = Badge.markup;
const markupOne = Badge.markupOne;

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
    .map((s) => storyCard(`${s.key} — ${px(s.height)}`, markup(s.key, "role", "active", "tint", "Live"), markup(s.key, "role", "active", "tint", "Live")))
    .join("\n");
}

// ---- Role x fill ----
const roleNotes = {
  neutral: "surface.raised + secondary/default text — the one role without a coloured wash (a plain grey tag).",
  active: "bg.active/fill.active + text.active/text.forActiveBg — live, in-play, freebet, selected.",
  positive: "bg.positive/fill.positive — won, confirmed, positive odds movement.",
  negative: "bg.negative/fill.negative — lost, error, negative odds movement.",
  warning: "bg.warning/fill.warning + text.warning/text.forActiveBg — cashout, postponed, under review, expiring.",
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

const subj = (t) => `<span style="color:${cv("text.default")}; font-family:${cv("family.sans")}; font-size:14px; font-weight:600;">${t}</span>`;
const usageDemo = `<div style="display:flex; flex-direction:column; gap:16px;">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        ${markupOne("base", "named", "live", "LIVE")}
        ${markupOne("base", "named", "betbuilder", "BB")}
        ${subj("Borussia Dortmund - AC Milan")}
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        ${subj("Manchester City vs Fulham")}
        ${markupOne("base", "status", "win", "WIN")}
      </div>
    </div>`;
const usageCode = `<!-- bet-card header: live in-play, betbuilder -->
<div class="event-row">
  <span class="badge badge--base badge--named-live">LIVE</span>
  <span class="badge badge--base badge--named-betbuilder">BB</span>
  <span class="subject">Borussia Dortmund - AC Milan</span>
</div>

<!-- My Bets row: settled -->
<div class="event-row">
  <span class="subject">Manchester City vs Fulham</span>
  <span class="badge badge--base badge--status-win">WIN</span>
</div>`;

// ---- Named product labels (live / betbuilder / freebet / score) ----
const namedLabels = { live: "LIVE", betbuilder: "BETBUILDER", freebet: "FREEBET", score: "5:3" };
const namedShort = { betbuilder: "BB", freebet: "FB" };
const namedNotes = {
  live: "active tint — active text on a 12% active wash.",
  betbuilder: "active tint (same as live). Shown short as BB inline; full BETBUILDER where it fits.",
  freebet: "accent tint — accent text on a 12% accent wash. Short FB inline; full FREEBET where it fits.",
  score: "label.score — a surface-6 chip with white text (the sanctioned surface-6-as-background).",
};
function namedStories() {
  return NAMED.map((n) => {
    const previews = namedShort[n]
      ? `<div style="display:flex; gap:10px; align-items:center;">${markupOne("base", "named", n, namedShort[n])}${markupOne("base", "named", n, namedLabels[n])}</div>`
      : markupOne("base", "named", n, namedLabels[n]);
    const code = namedShort[n]
      ? `${markupOne("base", "named", n, namedShort[n])}\n${markupOne("base", "named", n, namedLabels[n])}`
      : markupOne("base", "named", n, namedLabels[n]);
    return storyCard(n, previews, code, namedNotes[n]);
  }).join("\n");
}

// ---- My Bets settlement statuses (always solid) ----
const statusLabels = { win: "WIN", loose: "LOOSE", cashout: "CASHOUT", halfWin: "HALF-WIN", halfLoose: "HALF-LOOSE", refund: "REFUND", pending: "PENDING" };
function statusStories() {
  return STATUS.map((s) =>
    storyCard(s, markupOne("base", "status", s, statusLabels[s]), markupOne("base", "status", s, statusLabels[s]))
  ).join("\n");
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
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
      <div class="row"><b>Purpose</b><span>A non-interactive display pill — the sportsbook's status/label chips (live, freebet, betbuilder, score, My-Bets settlement statuses). Display only — no click, no dismiss. Every colour is a semantic role/label/betStatus token; no decorative hues.</span></div>
      <div class="row"><b>role × tint/solid</b><span>6 semantic roles (neutral/active/positive/negative/warning/accent), each in <code class="tok">tint</code> (12% wash + coloured text) or <code class="tok">solid</code> (saturated fill + contrasting text). The abstract building blocks the named badges below apply.</span></div>
      <div class="row"><b>Product labels</b><span>Named, fixed-vocabulary badges: <code class="tok">live</code>/<code class="tok">betbuilder</code> = active tint, <code class="tok">freebet</code> = accent tint, <code class="tok">score</code> = surface-6 (label.score) + white. Betbuilder/Freebet render short (BB/FB) and full.</span></div>
      <div class="row"><b>My Bets statuses</b><span>Seven solid settlement badges (win/loose/cashout/halfWin/halfLoose/refund/pending) filled with <code class="tok">betStatus.*</code>; text dark on the bright win/cashout, white on the rest (the deferred text.forLabelBg, per-badge for now).</span></div>
      <div class="row"><b>Not Chip</b><span>The interactive filter-toggle sibling (checked/unchecked, clickable) is a separate component — a status pill and a checkbox-like control are different ARIA roles.</span></div>
      <div class="row"><b>Sizes</b><span>sm 16 / base 20 / lg 24 — mirrors Counter's own height/paddingX/label ladder (resolved from Counter's real values) so the two small-pill components line up side by side.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">sm / base / lg, role="active" tint as the reference.</p>
    <div class="story-grid">
      ${sizeStories()}
    </div>

    <h2 class="big-section">Roles</h2>
    <p class="section-desc">5 semantic roles × tint/solid, base size. Left = tint, right = solid, in every card.</p>
    <div class="story-grid">
      ${roleStories()}
    </div>

    <h2 class="big-section">Product labels</h2>
    <p class="section-desc">Named badges with a fixed vocabulary + colour. <strong>Live</strong> / <strong>Betbuilder</strong> = the active tint (active text on a 12% active wash); <strong>Freebet</strong> = the accent tint; <strong>Score</strong> = a surface-6 chip with white text. Betbuilder & Freebet show short (BB / FB) and full.</p>
    <div class="story-grid">
      ${namedStories()}
    </div>

    <h2 class="big-section">My Bets — settlement statuses</h2>
    <p class="section-desc">Solid filled badges, one per settlement outcome. Filled with the betStatus.* colour; text goes dark on the bright win/cashout, white on the rest.</p>
    <div class="story-grid">
      ${statusStories()}
    </div>

    <h2 class="big-section">In context</h2>
    <p class="section-desc">The named badges in real rows: a bet-card header (LIVE + BB beside the event), and a settled My-Bets row (event + a WIN status badge).</p>
    <div class="usage-preview">${usageDemo}</div>
    <pre class="code"><code>${esc(usageCode)}</code></pre>
  </main>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/badge.html"), html);
console.log("wrote docs/badge.html");
