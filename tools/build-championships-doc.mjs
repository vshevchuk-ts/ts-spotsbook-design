// Regenerates docs/championships.html from assets/images/championships/*.png —
// league / tournament artwork, grouped by sport.
// Run: node tools/build-championships-doc.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderAssetPage, iconDefault, renderImageGroups } from "./lib/asset-page.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "assets/images/championships");
const files = fs.readdirSync(dir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
const { html, total, sports } = renderImageGroups(files, "../assets/images/championships");

const out = renderAssetPage({
  activeKey: "championships",
  titleTag: "Turbo Sportsbook — Championships",
  h1: "Championships",
  sub: `assets/images/championships/*.png · ${total} league &amp; tournament logos across ${sports} disciplines — shown on competition headers, coupons and outrights`,
  legendRows: [
    ["Source", "Championship / league / tournament artwork (PNG with transparency), grouped by discipline. Sample set for the design system — the live product loads these per-competition from the feed."],
    ["Naming", "Files are named <code class=\"tok\">&lt;Sport&gt; - &lt;Competition&gt;.png</code>; the sport prefix drives the grouping below and is stripped from the displayed name."],
    ["Usage", "Rendered as an <code class=\"tok\">&lt;img&gt;</code> (raster, not a themeable glyph) — size the container, the logo keeps its own colors on any surface."],
  ],
  bodyHtml: html,
  glyphColor: iconDefault(fs, path, root),
  searchPlaceholder: "Search championships by sport or name…",
});

fs.writeFileSync(path.join(root, "docs/championships.html"), out);
console.log(`wrote docs/championships.html (${total} championships, ${sports} sports)`);
