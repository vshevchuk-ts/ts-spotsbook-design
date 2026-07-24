// Regenerates docs/teams.html from assets/images/teams/*.png — team badge/logo
// images, grouped by sport. Run: node tools/build-teams-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderAssetPage, iconDefault, renderImageGroups } from "./lib/asset-page.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "assets/images/teams");
const files = fs.readdirSync(dir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
const { html, total, sports } = renderImageGroups(files, "../assets/images/teams");

const out = renderAssetPage({
  activeKey: "teams",
  titleTag: "Turbo Sportsbook — Teams",
  h1: "Teams",
  sub: `assets/images/teams/*.png · ${total} team logos across ${sports} disciplines — the badge artwork shown against fixtures, betslip rows and team pages`,
  legendRows: [
    ["Source", "Team badge/logo images (PNG with transparency), grouped by discipline. Sample set for the design system — the live product loads these per-fixture from the feed, not from this folder."],
    ["Naming", "Files are named <code class=\"tok\">&lt;Sport&gt; - &lt;Team&gt;.png</code>; the sport prefix drives the grouping below and is stripped from the displayed name."],
    ["Usage", "Rendered as an <code class=\"tok\">&lt;img&gt;</code> (raster, not a themeable glyph) — size the container, the logo keeps its own colors on any surface."],
  ],
  bodyHtml: html,
  glyphColor: iconDefault(fs, path, root),
  searchPlaceholder: "Search teams by sport or name…",
});

fs.writeFileSync(path.join(root, "docs/teams.html"), out);
console.log(`wrote docs/teams.html (${total} teams, ${sports} sports)`);
