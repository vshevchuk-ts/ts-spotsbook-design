// The real Odds component — CSS + the count-up/flash play script, lifted out of
// tools/build-odds-doc.mjs per logs/handoff-shared-components.md. The bet-card
// and summary pages compose live odds; they import this module's css()/script()
// instead of re-deriving the same .odds CSS + rAF tween by hand (three copies
// today: odds.html, bet-card.html, summary.html).
//
// The component owns the colours, the strike, the timing and the count tween.
// The app owns only the trigger (call oddsPlay(el) per tick, drop the prev node
// on animationend). script() returns that trigger as a string so a page can
// drop it in; the standalone doc page also loops it (loop cadence is the page's,
// not the component's).

export const colorPaths = ["text.default", "text.positive", "text.negative", "text.secondary"];

// count-tween window (ms) — a page that loops the demo needs this for its interval.
export function countMs(ctx) {
  return ctx.resolveToken(ctx.tokens.odds.movement.countDuration).value;
}
export function durationMs(ctx) {
  return ctx.resolveToken(ctx.tokens.odds.movement.duration).value;
}

// The .odds CSS.
//  - `withFontFamily` emits `font-family: var(--tok-family-sans)` on the base
//    rule (the standalone Odds page wants it; bet-card/summary set the family on
//    their container instead, so they pass false).
//  - `comments` includes the decorative explanatory comments + blank-line group
//    separators (the standalone page). Composed pages (bet-card/summary) emit the
//    compact form (comments:false) — same rules, no comments/blanks — so this one
//    source reproduces all three pages' existing output byte-for-byte.
export function css(ctx, { withFontFamily = true, comments = true } = {}) {
  const { tokens, resolve, resolveToken, px, cv, cvOf } = ctx;
  const odds = tokens.odds;
  const typoCss = (node) => { const t = resolveToken(node); return `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`; };
  const oddsType = typoCss(odds.type);
  const gap = px(resolve(odds.gap.$value));
  const dur = px(resolveToken(odds.movement.duration)); // e.g. "3000ms"
  const fam = withFontFamily ? `font-family: ${cv("family.sans")}; ` : "";
  const c = (text) => (comments ? [text] : []); // decorative comment line (dropped in compact)
  const gap_ = comments ? [""] : []; // blank group separator (dropped in compact)
  return [
    `.odds { display: inline-flex; align-items: baseline; gap: ${gap}; ${fam}${oddsType} font-variant-numeric: tabular-nums; white-space: nowrap; color: ${cvOf(odds.color.default)}; }`,
    `.odds__value { color: inherit; }`,
    `.odds__prev { color: ${cvOf(odds.prev.color)}; text-decoration: line-through; }`,
    ...c(`/* previous-value placement: default is to the RIGHT of the new value; --prev-left flips
   it to the left (for odds pinned to a right edge — compact line, betbuilder — so the new
   value stays at the edge and the old value extends inward). Markup order stays value→prev. */`),
    `.odds--prev-left .odds__prev { order: -1; }`,
    ...gap_,
    ...c(`/* static / prefers-reduced-motion: the changed value simply holds its up/down colour */`),
    `.odds--up .odds__value { color: ${cvOf(odds.color.up)}; }`,
    `.odds--down .odds__value { color: ${cvOf(odds.color.down)}; }`,
    ...gap_,
    ...c(`/* live: flash to the movement colour, then ease back to default over movement.duration; the previous value fades out */`),
    `@keyframes odds-up { 0%, 60% { color: ${cvOf(odds.color.up)}; } 100% { color: ${cvOf(odds.color.default)}; } }`,
    `@keyframes odds-down { 0%, 60% { color: ${cvOf(odds.color.down)}; } 100% { color: ${cvOf(odds.color.default)}; } }`,
    `@keyframes odds-prev-out { 0%, 60% { opacity: 1; } 100% { opacity: 0; } }`,
    `@media (prefers-reduced-motion: no-preference) {
  .odds--up .odds__value { animation: odds-up ${dur} ease forwards; }
  .odds--down .odds__value { animation: odds-down ${dur} ease forwards; }
  .odds--up .odds__prev, .odds--down .odds__prev { animation: odds-prev-out ${dur} ease forwards; }
}`,
  ].join("\n");
}

// The count-up + flash trigger, as a <script> body string. `loop` controls the
// docs-only auto-replay (the standalone page loops; a composed page that just
// wants a one-shot on mount passes loop:false — currently every consumer loops).
// `loopMs` is the replay cadence when loop is true.
export function script(ctx, { loop = true, loopMs } = {}) {
  const cMs = countMs(ctx);
  const lMs = loopMs ?? durationMs(ctx) + 2000;
  return `  // Odds movement: colour flash (CSS) + a number count-up (this ~15-line rAF tween,
  // shipped with the component — no library). In production the app calls oddsPlay(el)
  // once per price change; here the demo loops it so the movement is visible.
  (function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function countUp(el, from, to, ms) {
      var f = parseFloat(from), t = parseFloat(to);
      var dp = ((String(to).split('.')[1]) || '').length;
      if (isNaN(f) || isNaN(t)) { el.textContent = to; return; } // fractional / non-numeric → no roll
      var start = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - start) / ms);
        var e = 1 - Math.pow(1 - p, 3); // ease-out cubic
        el.textContent = (f + (t - f) * e).toFixed(dp);
        if (p < 1) requestAnimationFrame(step); else el.textContent = to;
      })(performance.now());
    }
    function oddsPlay(el) {
      var val = el.querySelector('.odds__value'), prev = el.querySelector('.odds__prev');
      if (!val) return;
      var to = val.getAttribute('data-to') || val.textContent;
      val.setAttribute('data-to', to);
      var dir = el.getAttribute('data-dir');
      el.classList.remove('odds--up', 'odds--down'); void el.offsetWidth;
      if (dir) el.classList.add('odds--' + dir);
      if (!reduce && prev) countUp(val, prev.textContent, to, ${cMs});
    }
    window.oddsPlay = oddsPlay;
    document.querySelectorAll('.odds[data-dir]').forEach(function (el) {
      oddsPlay(el);
      if (!reduce${loop ? "" : " && false"}) setInterval(function () { oddsPlay(el); }, ${lMs});
    });
  })();`;
}
