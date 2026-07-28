// The real Drawer component — native <dialog> + showModal(), edge-attached
// (right / bottom) with @starting-style slide-in. CSS + the open/dismiss scripts
// lifted so the mobile betslip is a real bottom Drawer, not a decorative frame.
// The .ov-btn demo trigger stays in the doc page; consumers use a real Button.

export const colorPaths = [
  "surface.card", "surface.overlay", "surface.raised",
  "outline.default", "outline.accent",
  "text.default", "text.secondary", "lighten.2", "icon.secondary",
  "fill.neutralHover", "fill.neutralPressed",
];

export function css(ctx) {
  const { tokens, resolve, resolveToken, px, cv } = ctx;
  const drawer = tokens.drawer;
  const width = px(resolve(drawer.width.$value));
  const radius = px(resolve(drawer.radius.$value));
  const padding = px(resolve(drawer.padding.$value));
  const gap = px(resolve(drawer.gap.$value));
  const duration = drawer.transitionDuration.$value;
  const titleType = resolveToken(drawer.title);
  const bodyType = resolveToken(drawer.body);
  const shadow = resolveToken(drawer.shadow);
  const shadowCss = `${px(shadow.offsetX)} ${px(shadow.offsetY)} ${px(shadow.blur)} ${px(shadow.spread)} ${shadow.color}`;
  const dur = `${duration.value}${duration.unit}`;
  const typoCss = (t) => `font-weight: ${t.fontWeight}; font-size: ${px(t.fontSize)}; line-height: ${t.lineHeight};`;

  return `dialog.drawer { position: fixed; margin: 0; padding: 0; border: none; box-sizing: border-box; background: ${cv("surface.card")}; box-shadow: ${shadowCss}; }
dialog.drawer::backdrop { background: ${cv("surface.overlay")}; opacity: 0; transition: opacity ${dur} ease allow-discrete; }
dialog.drawer[open]::backdrop { opacity: 1; }
@starting-style { dialog.drawer[open]::backdrop { opacity: 0; } }

dialog.drawer--right { top: 0; right: 0; left: auto; height: 100dvh; width: ${width}; max-width: 90vw; border-radius: ${radius}; transform: translateX(100%); transition: transform ${dur} ease, overlay ${dur} allow-discrete, display ${dur} allow-discrete; }
dialog.drawer--right[open] { transform: translateX(0); }
@starting-style { dialog.drawer--right[open] { transform: translateX(100%); } }

dialog.drawer--bottom { bottom: 0; left: 0; right: 0; top: auto; width: 100%; max-height: 80dvh; border-radius: ${radius}; transform: translateY(100%); transition: transform ${dur} ease, overlay ${dur} allow-discrete, display ${dur} allow-discrete; }
dialog.drawer--bottom[open] { transform: translateY(0); }
@starting-style { dialog.drawer--bottom[open] { transform: translateY(100%); } }

.drawer__content { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; font-family: ${cv("family.sans")}; }
.drawer__header { flex-shrink: 0; box-sizing: border-box; position: relative; display: flex; align-items: center; justify-content: center; gap: ${px(resolve("spacing.2"))}; height: ${px(resolve("spacing.10"))}; padding: 0 ${px(resolve("spacing.10"))}; background: ${cv("surface.raised")}; }
.drawer__title { margin: 0; color: ${cv("text.default")}; text-align: center; ${typoCss(titleType)} }
.drawer__hcounter { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: ${cv("lighten.2")}; color: ${cv("text.default")}; font-weight: 700; font-size: 12px; }
.drawer__body { flex: 1; box-sizing: border-box; overflow: auto; padding: ${padding}; }
.drawer__body-text { margin: 0; color: ${cv("text.secondary")}; ${typoCss(bodyType)} }
.drawer__footer { flex-shrink: 0; box-sizing: border-box; display: flex; gap: ${gap}; justify-content: flex-end; padding: ${padding}; border-top: 1px solid ${cv("outline.default")}; }

.drawer__close { position: absolute; right: ${px(resolve("spacing.2"))}; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: ${px(resolve("radius.default"))}; background: transparent; padding: 0; cursor: pointer; color: ${cv("icon.secondary")}; }
.drawer__close:hover { background: ${cv("fill.neutralHover")}; }
.drawer__close:active { background: ${cv("fill.neutralPressed")}; }
.drawer__close:focus-visible { outline: ${px(resolve("spacing.1"))} solid ${cv("outline.accent")}; outline-offset: ${px(resolve("spacing.0_5"))}; }
.drawer__close-icon { width: 20px; height: 20px; display: block; }`;
}

// open on any [data-drawer-open="id"]; light-dismiss on backdrop click (showModal
// gives Escape for free but not click-outside). Returned as a <script> body string.
export const script = `document.querySelectorAll('[data-drawer-open]').forEach((btn) => {
    btn.addEventListener('click', () => { document.getElementById(btn.dataset.drawerOpen).showModal(); });
  });
  document.querySelectorAll('dialog.drawer').forEach((dlg) => {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  });`;
