// Regenerates docs/disciplines.html from assets/icons/sports/*.svg — the sport /
// e-sport discipline glyphs (football, basketball, tennis, cs2, dota2, …).
// Run: node tools/build-disciplines-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderAssetPage, iconDefault, esc } from "./lib/asset-page.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "assets/icons/sports");
const slugs = fs.readdirSync(dir).filter((f) => f.endsWith(".svg")).map((f) => f.replace(".svg", "")).sort();
const glyphColor = iconDefault(fs, path, root);

const cards = slugs
  .map((slug) => `<div class="icon-card" data-name="${esc(slug)}">
        <div class="icon-glyph">${fs.readFileSync(path.join(dir, `${slug}.svg`), "utf8")}</div>
        <code class="icon-name">${esc(slug)}</code>
      </div>`)
  .join("\n      ");

const html = renderAssetPage({
  activeKey: "disciplines",
  titleTag: "Turbo Sportsbook — Discipline icons",
  h1: "Discipline icons",
  sub: `assets/icons/sports/*.svg · ${slugs.length} sport &amp; e-sport discipline glyphs — one per betting category (football, basketball, tennis, MMA, CS2, Dota 2, …)`,
  legendRows: [
    ["Source", "The Turbo Sportsbook discipline set, exported from Figma at 24px — the category/sport-navigation glyphs, distinct from the general interface <a href=\"icons.html\">UI icons</a>."],
    ["Color", `Monotone — recolored to <code class="tok">fill="currentColor"</code> on import, previewed at icon.default (${glyphColor}); set the wrapper's CSS color to theme them.`],
    ["Naming", "Kebab-case discipline slug (e.g. <code class=\"tok\">american-football</code>, <code class=\"tok\">table-tennis</code>, <code class=\"tok\">rocket-league</code>). Bot/simulated variants carry a <code class=\"tok\">-bot</code> suffix (<code class=\"tok\">football-bot</code>, <code class=\"tok\">etennis</code>)."],
    ["Size", "Authored on a 24px grid — scale via CSS width/height."],
  ],
  bodyHtml: `<div class="asset-group"><div class="icon-grid">\n      ${cards}\n    </div></div>`,
  glyphColor,
  searchPlaceholder: "Search disciplines by name…",
});

fs.writeFileSync(path.join(root, "docs/disciplines.html"), html);
console.log(`wrote docs/disciplines.html (${slugs.length} disciplines)`);
