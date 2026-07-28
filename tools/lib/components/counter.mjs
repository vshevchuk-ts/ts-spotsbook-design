// The real Counter component — the small tabular count pill (onPrimary / onNeutral
// surfaces, inactive/active states). CSS + markup lifted so pages that show a
// count (Button's betslip pill, the betslip header count) use the real Counter
// with its min-width (stays a rounded pill), not a Badge that goes oval for one digit.

const surfaceKeys = ["onPrimary", "onNeutral"];

export function colorPaths(ctx) {
  const counter = ctx.tokens.counter;
  const refOf = (node) => node.$value.replace(/[{}]/g, "");
  const refs = surfaceKeys.flatMap((k) => ["inactive", "active"].flatMap((s) => ["bg", "label"].map((f) => refOf(counter[k].state[s][f]))));
  return [...new Set(refs)];
}

export function css(ctx) {
  const { tokens, resolve, resolveToken, px, cv, cvOf } = ctx;
  const counter = tokens.counter;
  const counterRadius = px(resolve(counter.radius.$value));
  const sizes = ["sm", "base", "lg"].map((key) => {
    const s = counter.size[key];
    return { key, height: resolve(s.height.$value), minWidth: resolve(s.minWidth.$value), paddingX: resolve(s.paddingX.$value), label: resolveToken(s.label) };
  });
  const surfaceCss = (key) => {
    const st = counter[key].state;
    return `.counter--${key}.counter--inactive { background: ${cvOf(st.inactive.bg)}; color: ${cvOf(st.inactive.label)}; }
.counter--${key}.counter--active { background: ${cvOf(st.active.bg)}; color: ${cvOf(st.active.label)}; }`;
  };
  return `.counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  font-family: ${cv("family.sans")};
  font-weight: 700;
  border-radius: ${counterRadius};
}
${sizes.map((s) => `.counter--${s.key} { height: ${px(s.height)}; min-width: ${px(s.minWidth)}; padding: 0 ${px(s.paddingX)}; font-size: ${px(s.label.fontSize)}; line-height: ${s.label.lineHeight}; }`).join("\n")}

${surfaceCss("onPrimary")}

${surfaceCss("onNeutral")}`;
}

export const markup = (size, surface, state, value) =>
  `<span class="counter counter--${size} counter--${surface} counter--${state}">${value}</span>`;
