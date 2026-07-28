// Shared resolver context for every tools/build-*-doc.mjs — loads primitives +
// semantic, builds the registry, and returns the get/resolve/cv/cvOf/typoOf/px
// helpers every builder re-implemented byte-for-byte. Extracted per
// logs/handoff-shared-components.md so tools/lib/components/*.mjs (and the
// builders that still resolve their own component's tokens directly) share one
// resolver instead of ~40 duplicated lines each.
//
// `resolveToken()` intentionally drops `$extensions` off the RESOLVED value —
// typoOf() re-fetches `$extensions` from the referenced node itself (the field
// `text-style.link-*`/`label-*` use for textDecoration/textTransform).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cssVarName, renderRootVars } from "./css-vars.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)); // tools/lib
const root = path.dirname(path.dirname(here)); // repo root
const load = (p) => JSON.parse(fs.readFileSync(path.join(root, p)));

// tokens/components/<name>.tokens.json's component key isn't always a plain
// lowercase of the filename (e.g. bet-card.tokens.json -> component.betCard).
const COMPONENT_KEY = {
  "bet-card": "betCard",
};
const camel = (name) => COMPONENT_KEY[name] ?? name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// componentNames: which tokens/components/<name>.tokens.json files to load
// onto ctx.tokens.<name> (in addition to the always-loaded primitives/semantic).
export function createCtx(componentNames = []) {
  const colorPrim = load("tokens/primitives/color.tokens.json").color;
  const dim = load("tokens/primitives/dimension.tokens.json").spacing;
  const radiusPrim = load("tokens/primitives/radius.tokens.json").radius;
  const elevationPrim = load("tokens/primitives/elevation.tokens.json").elevation;
  const typo = load("tokens/primitives/typography.tokens.json");
  const textStyle = load("tokens/primitives/text-styles.tokens.json")["text-style"];
  const semantic = load("tokens/semantic/color.tokens.json");

  const registry = {
    color: colorPrim,
    spacing: dim, radius: radiusPrim, elevation: elevationPrim,
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
  const cv = (tokenPath) => `var(${cssVarName(tokenPath)})`;
  // resolve a colour token's ROLE straight from its node's own $value ref —
  // never hardcode a role name (builders never hardcode a colour role/primitive).
  const cvOf = (node) => cv(node.$value.replace(/[{}]/g, ""));
  function typoOf(node) {
    const t = resolveToken(node);
    let css = `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
    const ref = node.$value;
    if (typeof ref === "string" && ref.startsWith("{")) {
      const ext = get(ref).$extensions?.["turbo.sportsbook/text"];
      if (ext?.textDecoration) css += ` text-decoration: ${ext.textDecoration};`;
      if (ext?.textTransform) css += ` text-transform: ${ext.textTransform};`;
    }
    return css;
  }

  const tokens = {};
  for (const name of componentNames) {
    tokens[name] = load(`tokens/components/${name}.tokens.json`).component[camel(name)];
  }

  return {
    root, load,
    registry, get, resolve, resolveValue, resolveToken,
    px, cv, cvOf, typoOf,
    cssVarName, renderRootVars,
    tokens,
  };
}
