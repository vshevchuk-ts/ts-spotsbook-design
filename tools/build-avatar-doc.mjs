// Regenerates docs/avatar.html from tokens/components/avatar.tokens.json,
// resolving aliases back through semantic/*.tokens.json and primitives/*.tokens.json.
// Fallback chain mirrors Radix Avatar / MUI Avatar / GitHub: real <img> first,
// initials on a name-derived color second, a generic neutral person icon last
// (no name at all — e.g. a not-yet-loaded or system user). No AvatarGroup or
// presence dot — not asked for, deferred like every other unrequested variant
// in this system.
// The generated <style> block IS the code shown in the "CSS" section below —
// one source, so the live preview and the printed snippet can't drift apart.
// Run: node tools/build-avatar-doc.mjs
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
const avatar = load("tokens/components/avatar.tokens.json").component.avatar;

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

const colorPaths = ["outline.default", "surface.raised", "text.secondary", "icon.secondary"];
const colorValue = Object.fromEntries(colorPaths.map((p) => [p, resolve(p)]));
const fontSans = resolve("family.sans");
const rootVars = renderRootVars([...colorPaths.map((p) => [p, colorValue[p]]), ["family.sans", `'${fontSans}', sans-serif`]]);

const radius = px(resolve(avatar.radius.$value));
const sizeDefs = ["sm", "base", "lg"].map((key) => {
  const s = avatar.size[key];
  return {
    key,
    diameter: resolve(s.diameter.$value),
    iconSize: resolve(s.iconSize.$value),
    initials: resolveToken(s.initials),
  };
});
const sizeByKey = Object.fromEntries(sizeDefs.map((s) => [s.key, s]));

function typoCss(t) {
  return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
}

// ---- icon (generic no-name fallback) ----
const iconPerson = fs.readFileSync(path.join(root, "assets/icons/material-filled/person.svg"), "utf8").replace("<svg ", '<svg class="avatar__icon" ');

// ---- synthetic "photos" for the live preview only — two soft gradient blobs
// per avatar, just enough to prove object-fit:cover crops a real image into
// the circle. Not shipped as part of the component, same spirit as Card's
// placeholder gray bars standing in for real content. ----
function photoDataUri(a, b) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><circle cx="60" cy="46" r="24" fill="rgba(255,255,255,0.55)"/><ellipse cx="60" cy="112" rx="42" ry="34" fill="rgba(255,255,255,0.4)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const photoA = photoDataUri("#439afd", "#0468c4");
const photoB = photoDataUri("#38b06b", "#0a6b3a");

const css = `${rootVars}

.avatar { box-sizing: border-box; position: relative; display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; overflow: hidden; border-radius: ${radius}; border: 1px solid ${cv("outline.default")}; font-family: ${cv("family.sans")}; user-select: none; }
${sizeDefs.map((s) => `.avatar--${s.key} { width: ${px(s.diameter)}; height: ${px(s.diameter)}; }`).join("\n")}
.avatar__image { width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar__initials { text-transform: uppercase; }
${sizeDefs.map((s) => `.avatar--${s.key} .avatar__initials { ${typoCss(s.initials)} }`).join("\n")}
${sizeDefs.map((s) => `.avatar--${s.key} .avatar__icon { width: ${px(s.iconSize)}; height: ${px(s.iconSize)}; }`).join("\n")}
.avatar--neutral { background: ${cv("surface.raised")}; }
.avatar--neutral .avatar__icon { color: ${cv("icon.secondary")}; }
.avatar--initials { background: ${cv("surface.raised")}; }
.avatar--initials .avatar__initials { color: ${cv("text.secondary")}; }`;

const js = `function avatarInitials(name) {
  const parts = name.trim().split(/\\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}
// <img>'s own onerror swaps to the sibling fallback that's already in the DOM
// (both always render — same "let the real cascade drive it" approach as
// Checkbox's check glyph) — no framework state needed for the common case of
// a broken/expired photo URL.
document.querySelectorAll("[data-avatar-fallback-demo] img").forEach((img) => {
  img.addEventListener("error", () => {
    img.hidden = true;
    img.nextElementSibling.hidden = false;
  });
});`;

function initialsOf(name) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
}
function avatarImageMarkup(sizeKey, src, alt) {
  return `<span class="avatar avatar--${sizeKey}"><img class="avatar__image" src="${src}" alt="${alt}" /></span>`;
}
function avatarInitialsMarkup(sizeKey, name) {
  return `<span class="avatar avatar--${sizeKey} avatar--initials" role="img" aria-label="${name}"><span class="avatar__initials">${initialsOf(name)}</span></span>`;
}
function avatarGenericMarkup(sizeKey) {
  return `<span class="avatar avatar--${sizeKey} avatar--neutral" role="img" aria-label="Unknown user">${iconPerson}</span>`;
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

// ---- Sizes ----
function sizeStories() {
  return sizeDefs
    .map((s) => {
      const live = avatarImageMarkup(s.key, photoA, "Noah Fox");
      const code = `<span class="avatar avatar--${s.key}">\n  <img class="avatar__image" src="/users/123/photo.jpg" alt="Noah Fox" />\n</span>`;
      return storyCard(`${s.key} — ${px(s.diameter)}`, live, code);
    })
    .join("\n");
}

// ---- Fallback chain: this is the actual ask — photo if there is one, else initials, else icon ----
function chainStories() {
  const defs = [
    { title: "Has a photo → show the photo", html: avatarImageMarkup("base", photoB, "Alex Price"), code: `<span class="avatar avatar--base">\n  <img class="avatar__image" src="/users/456/photo.jpg" alt="Alex Price" />\n</span>`, note: "object-fit: cover — crops to fill the circle, no distortion." },
    { title: "No image, has a name → initials", html: avatarInitialsMarkup("base", "Priya Shah"), code: `<span class="avatar avatar--base avatar--initials" role="img" aria-label="Priya Shah">\n  <span class="avatar__initials">${initialsOf("Priya Shah")}</span>\n</span>`, note: "Initials: first letter of first + last name (or first 2 letters of a single word), on a neutral raised surface — no name-derived colour (sportsbook avatars are mostly team/league logos)." },
    { title: "No image, no name → generic icon", html: avatarGenericMarkup("base"), code: `<span class="avatar avatar--base avatar--neutral" role="img" aria-label="Unknown">\n  <!-- icon: person -->\n</span>`, note: "A system/guest entity with no data — neutral, a plain person icon." },
  ];
  return defs.map((d) => storyCard(d.title, d.html, d.code, d.note)).join("\n");
}

// ---- Live broken-image demo — real <img onerror> swap, not a forced screenshot state ----
function liveFallbackDemo() {
  const name = "Jordan Lee";
  const live = `<span class="avatar avatar--base" data-avatar-fallback-demo>
      <img class="avatar__image" src="/broken-photo-does-not-exist.jpg" alt="${name}" />
      <span class="avatar avatar--base avatar--initials" role="img" aria-label="${name}" hidden style="position:absolute; inset:0; border:none;"><span class="avatar__initials">${initialsOf(name)}</span></span>
    </span>`;
  const code = `<span class="avatar avatar--base" data-avatar-fallback-demo>
  <img class="avatar__image" src="/broken-photo-does-not-exist.jpg" alt="${name}" />
  <span class="avatar avatar--base avatar--initials" role="img" aria-label="${name}" hidden>
    <span class="avatar__initials">${initialsOf(name)}</span>
  </span>
</span>
<script>
  img.addEventListener("error", () => {
    img.hidden = true;
    img.nextElementSibling.hidden = false;
  });
</script>`;
  return storyCard("Photo failed to load (real onerror)", live, code, "A genuinely broken URL in this demo — the browser's real <img> onerror fires, not a scripted state for a screenshot. Both elements always sit in the DOM (hidden toggles visibility), the same approach Checkbox's own glyphs use.");
}


const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Turbo Sportsbook — Avatar</title>
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

  ${css}
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav("avatar")}
  </nav>
  <main>
    <h1>Avatar</h1>
    <p class="sub">tokens/components/avatar.tokens.json · generated — the CSS below is generated from the same resolved tokens driving every preview on this page, nothing hand-copied. Colors are CSS custom properties, not literal hex.</p>

    <div class="legend">
      <div class="row"><b>Fallback chain</b><span>Photo → initials → icon, the same order Radix Avatar / MUI Avatar / GitHub converge on: <code class="tok">&lt;img&gt;</code> if there's a src and it loaded; otherwise initials on a color derived from the name; otherwise a generic neutral person icon if there isn't even a name.</span></div>
      <div class="row"><b>Sizes</b><span>sm 32 / base 40 / lg 48 — deliberately the same grid as Button/Input/Select/Search (dim.8/dim.10/dim.12), not an independent scale, so an avatar sits at the same height as a button or field in the same row (a user-menu trigger, a comment composer).</span></div>
      <div class="row"><b>Shape</b><span>Circle only (radius.full). A square/rounded variant wasn't asked for — not built speculatively.</span></div>
      <div class="row"><b>Initials</b><span>First letter of the first name + first letter of the last name (or the first 2 letters if it's a single word), always uppercase, max 2 characters.</span></div>
      <div class="row"><b>Initials fallback</b><span>A single neutral treatment — raised surface + secondary text. The old name-derived 8-hue identity palette was dropped for the sportsbook, where avatars are mostly team/league logos rather than coloured user initials.</span></div>
      <div class="row"><b>Border</b><span>1px border.default on a photo or the generic no-name fallback — same convention as Card/Input, so a light photo or the near-white neutral fallback doesn't blend into surface.page. Identity-color fallbacks skip it (border-color: transparent) — a gray hairline on top of an already-saturated pastel read muddy rather than crisp; the color block itself already separates from the page.</span></div>
      <div class="row"><b>No AvatarGroup</b><span>An overlapping avatar stack is a separate composition on top of Avatar, not asked for right now — deferred.</span></div>
    </div>

    <h2 class="big-section">CSS</h2>
    <pre class="code"><code>${esc(css)}</code></pre>

    <h2 class="big-section">JS (initials, color, onerror)</h2>
    <p class="section-desc">The logic for computing initials/color and the real onerror fallback swap — not a token, but needed for a correct port.</p>
    <pre class="code"><code>${esc(js)}</code></pre>

    <h2 class="big-section">Sizes</h2>
    <p class="section-desc">sm / base / lg — with a photo, to show just the box dimensions.</p>
    <div class="story-grid">
      ${sizeStories()}
    </div>

    <h2 class="big-section">Fallback chain</h2>
    <p class="section-desc">Three tiers of the same component — exactly what was asked for: if there's a photo, show the photo; if not, initials; if there's not even a name, an icon.</p>
    <div class="story-grid">
      ${chainStories()}
    </div>

    <h2 class="big-section">Live example: broken photo</h2>
    <p class="section-desc">Not a forced inline style for a screenshot — a real <code class="tok">&lt;img&gt;</code> with a broken src and a genuine onerror listener below.</p>
    <div class="story-grid">
      ${liveFallbackDemo()}
    </div>

  </main>
</div>
<script>${js}</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "docs/avatar.html"), html);
console.log("wrote docs/avatar.html");
