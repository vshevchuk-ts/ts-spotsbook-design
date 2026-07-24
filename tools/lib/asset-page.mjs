// Shared page shell for the Assets gallery pages (Discipline icons, Teams,
// Championships) — same docs chrome (nav, header, legend, live search) as the
// UI-icons page, so the four Assets pages read as one family. Callers build the
// grouped card markup; this wraps it with the sidebar, styles, and search JS.
import { renderNav } from "./nav.mjs";

// resolve icon.default so SVG glyph previews match the rest of the docs
const load = (fs, path, root) => JSON.parse(fs.readFileSync(path.join(root, "tokens/semantic/color.tokens.json")));
export function iconDefault(fs, path, root) {
  const primitives = JSON.parse(fs.readFileSync(path.join(root, "tokens/primitives/color.tokens.json"))).color;
  const semantic = load(fs, path, root);
  const resolve = (value, d = 0) => {
    if (d > 5) throw new Error("alias too deep: " + value);
    if (typeof value !== "string" || !value.startsWith("{")) return value;
    const p = value.replace(/[{}]/g, "").split(".");
    const node = p[0] === "color" ? (p.length === 2 ? primitives[p[1]].$value : primitives[p[1]][p[2]].$value) : semantic[p[0]][p[1]].$value;
    return resolve(node, d + 1);
  };
  return resolve(semantic.icon.default.$value);
}

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Image assets are named "<Sport> - <Name>.png". Group them by sport (normalizing
// the one "Dota2" typo to "Dota 2"), then render a grouped grid of <img> cards.
export function renderImageGroups(files, relBase) {
  const groups = new Map();
  for (const file of files) {
    const base = file.replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const idx = base.indexOf(" - ");
    let sport = idx === -1 ? "Other" : base.slice(0, idx).trim();
    const name = idx === -1 ? base : base.slice(idx + 3).trim();
    sport = sport.replace(/^Dota2$/, "Dota 2");
    if (!groups.has(sport)) groups.set(sport, []);
    groups.get(sport).push({ file, name });
  }
  const total = files.length;
  const html = [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sport, items]) => {
      const cards = items
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((it) => `<div class="img-card" data-name="${esc(sport + " " + it.name)}">
          <div class="img-thumb"><img src="${relBase}/${encodeURI(it.file)}" alt="${esc(it.name)}" loading="lazy" /></div>
          <span class="img-name">${esc(it.name)}</span>
        </div>`)
        .join("\n        ");
      return `<section class="asset-group">
        <h2>${esc(sport)} <span class="n">${items.length}</span></h2>
        <div class="img-grid">
        ${cards}
        </div>
      </section>`;
    })
    .join("\n      ");
  return { html, total, sports: groups.size };
}

export function renderAssetPage({ activeKey, titleTag, h1, sub, legendRows, bodyHtml, glyphColor, searchPlaceholder }) {
  const legend = legendRows.map(([b, span]) => `<div class="row"><b>${b}</b><span>${span}</span></div>`).join("\n      ");
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titleTag}</title>
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
  main { flex: 1; padding: 3rem 3rem 4rem; max-width: 1200px; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  .sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 1.2rem; }
  .legend { font-size: 12.5px; color: var(--text-secondary); padding: 12px 16px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 10px; margin-bottom: 1.2rem; }
  .legend .row { display: flex; gap: 14px; padding: 5px 0; border-bottom: 0.5px solid var(--border); }
  .legend .row:last-child { border-bottom: none; }
  .legend .row b { width: 130px; flex-shrink: 0; color: var(--text-primary); font-weight: 600; font-family: var(--mono); font-size: 11.5px; }
  .legend a { color: var(--accent); }
  code.tok { font-family: var(--mono); font-size: 12px; color: var(--accent); }
  #search { width: 100%; box-sizing: border-box; padding: 9px 12px; font-size: 13px; border: 0.5px solid var(--border-strong); border-radius: 8px; background: var(--bg-card); color: var(--text-primary); margin-bottom: 0.4rem; }
  #search:focus { outline: none; border-color: var(--accent); }
  #count { font-size: 11.5px; color: var(--text-muted); margin: 0 0 1.5rem; }
  .asset-group { margin: 0 0 2rem; }
  .asset-group > h2 { font-size: 13px; font-weight: 600; margin: 0 0 0.7rem; display: flex; align-items: baseline; gap: 8px; }
  .asset-group > h2 .n { font-size: 11px; color: var(--text-muted); font-weight: 500; }
  .asset-group.hidden { display: none; }

  .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 8px; }
  .icon-card { border: 0.5px solid var(--border); border-radius: 10px; background: var(--bg-card); padding: 14px 8px 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
  .icon-glyph { width: 28px; height: 28px; color: ${glyphColor}; }
  .icon-glyph svg { width: 28px; height: 28px; display: block; }
  .icon-name { font-family: var(--mono); font-size: 10px; color: var(--text-secondary); word-break: break-all; }
  .icon-card.hidden { display: none; }

  .img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
  .img-card { border: 0.5px solid var(--border); border-radius: 12px; background: var(--bg-card); padding: 16px 12px 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
  .img-thumb { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; }
  .img-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
  .img-name { font-size: 11.5px; color: var(--text-primary); line-height: 1.35; }
  .img-card.hidden { display: none; }
</style>
</head>
<body>
<div class="shell">
  <nav class="side">
    ${renderNav(activeKey)}
  </nav>
  <main>
    <h1>${h1}</h1>
    <p class="sub">${sub}</p>

    <div class="legend">
      ${legend}
    </div>

    <input id="search" type="text" placeholder="${searchPlaceholder}" autocomplete="off" />
    <p id="count"></p>

    <div id="results">
      ${bodyHtml}
    </div>
  </main>
</div>
<script>
  const input = document.getElementById("search");
  const cards = [...document.querySelectorAll("[data-name]")];
  const groups = [...document.querySelectorAll(".asset-group")];
  const countEl = document.getElementById("count");
  function update() {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach((c) => {
      const match = !q || c.dataset.name.toLowerCase().includes(q);
      c.classList.toggle("hidden", !match);
      if (match) visible++;
    });
    groups.forEach((g) => {
      g.classList.toggle("hidden", ![...g.querySelectorAll("[data-name]")].some((c) => !c.classList.contains("hidden")));
    });
    countEl.textContent = visible + " / " + cards.length;
  }
  input.addEventListener("input", update);
  update();
</script>
</body>
</html>
`;
}
