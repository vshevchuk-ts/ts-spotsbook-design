// The real Badge component — CSS + markup, lifted out of tools/build-badge-doc.mjs.
// A non-interactive display pill: role × tint/solid + the named product labels
// (live/betbuilder/freebet/score) + the My-Bets settlement statuses. bet-card's
// header badges (and any composed page) import css()/markup here instead of
// re-emitting a subset of badge.tokens.json by hand.

export const ROLES = ["neutral", "active", "positive", "negative", "warning", "accent"];
export const COLORS = []; // decorative hue axis removed — sportsbook labels carry meaning (role-driven)
export const FILLS = ["tint", "solid"];
export const SIZES = ["sm", "base", "lg"];
export const NAMED = ["live", "betbuilder", "freebet", "score"]; // named product labels
export const STATUS = ["win", "loose", "cashout", "halfWin", "halfLoose", "refund", "pending"]; // My Bets, always solid

// One CSS var per unique resolved token path, so role=blue-tint and color=blue-tint
// (aliases of each other) share the exact same --tok-* var. Returns paths in the
// same insertion order the standalone page emits (role×fill, color×fill, named, status).
export function colorPaths(ctx) {
  const badge = ctx.tokens.badge;
  const set = new Set();
  const pathsOf = (node) => {
    set.add(node.bg.$value.replace(/[{}]/g, ""));
    set.add(node.text.$value.replace(/[{}]/g, ""));
  };
  for (const r of ROLES) for (const f of FILLS) pathsOf(badge.role[r][f]);
  for (const c of COLORS) for (const f of FILLS) pathsOf(badge.color[c][f]);
  for (const n of NAMED) pathsOf(badge.named[n]);
  for (const s of STATUS) pathsOf(badge.betStatus[s]);
  return [...set];
}

export function css(ctx) {
  const { tokens, resolve, resolveToken, px, cv } = ctx;
  const badge = tokens.badge;
  const sizeDefs = SIZES.map((key) => {
    const s = badge.size[key];
    return { key, height: resolve(s.height.$value), paddingX: resolve(s.paddingX.$value), label: resolveToken(s.label) };
  });
  const radius = px(resolve(badge.radius.$value));
  const typoCss = (t) => `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;
  const refPath = (ref) => ref.replace(/[{}]/g, "");

  return `.badge { box-sizing: border-box; display: inline-flex; align-items: center; border-radius: ${radius}; font-family: ${cv("family.sans")}; white-space: nowrap; }
${sizeDefs.map((s) => `.badge--${s.key} { height: ${px(s.height)}; padding: 0 ${px(s.paddingX)}; ${typoCss(s.label)} }`).join("\n")}
${ROLES.map((r) => FILLS.map((f) => `.badge--role-${r}.badge--${f} { background: ${cv(refPath(badge.role[r][f].bg.$value))}; color: ${cv(refPath(badge.role[r][f].text.$value))}; }`).join("\n")).join("\n")}
${COLORS.map((c) => FILLS.map((f) => `.badge--color-${c}.badge--${f} { background: ${cv(refPath(badge.color[c][f].bg.$value))}; color: ${cv(refPath(badge.color[c][f].text.$value))}; }`).join("\n")).join("\n")}
${NAMED.map((n) => `.badge--named-${n} { background: ${cv(refPath(badge.named[n].bg.$value))}; color: ${cv(refPath(badge.named[n].text.$value))}; }`).join("\n")}
${STATUS.map((s) => `.badge--status-${s} { background: ${cv(refPath(badge.betStatus[s].bg.$value))}; color: ${cv(refPath(badge.betStatus[s].text.$value))}; }`).join("\n")}`;
}

// ---- markup builders (the real .badge classes) ----
export function markup(sizeKey, kind, name, fill, label) {
  const flavor = kind === "role" ? `role-${name}` : `color-${name}`;
  return `<span class="badge badge--${sizeKey} badge--${fill} badge--${flavor}">${label}</span>`;
}
// single-style badges (no tint/solid axis): named product labels + My Bets statuses
export function markupOne(sizeKey, prefix, name, label) {
  return `<span class="badge badge--${sizeKey} badge--${prefix}-${name}">${label}</span>`;
}
