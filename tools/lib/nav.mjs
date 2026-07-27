// Shared sidebar nav — single source of truth for every docs/*.html build script,
// so adding/moving a page (like splitting Components into per-component pages)
// is a one-file change instead of hand-editing every generator's copy-pasted block.
//
// Two top-level sections, switched by the DS / Designs tab bar at the very top of
// the sidebar: DS = the design system itself (NAV_ITEMS), Designs = product
// prototypes for real app tasks (DESIGN_ITEMS). renderNav derives which tab is
// active from whether activeKey belongs to DESIGN_ITEMS, so no build script has to
// declare its section — passing the page key is enough.
export const NAV_ITEMS = {
  overview: { label: "Overview", href: "index.html" },
  colors: { label: "Colors", href: "colors.html" },
  "semantic-colors": { label: "Semantic colors", href: "semantic-colors.html" },
  typography: { label: "Typography", href: "typography.html" },
  layout: { label: "Layout", href: "layout.html" },
  icons: { label: "UI icons", href: "icons.html" },
  disciplines: { label: "Discipline icons", href: "disciplines.html" },
  teams: { label: "Teams", href: "teams.html" },
  championships: { label: "Championships", href: "championships.html" },
  button: { label: "Button", href: "button.html" },
  counter: { label: "Counter", href: "counter.html" },
  input: { label: "Input", href: "input.html" },
  select: { label: "Select", href: "select.html" },
  search: { label: "Search", href: "search.html" },
  pagination: { label: "Pagination", href: "pagination.html" },
  separator: { label: "Separator", href: "separator.html" },
  tabs: { label: "Tabs", href: "tabs.html" },
  checkbox: { label: "Checkbox", href: "checkbox.html" },
  radio: { label: "Radio", href: "radio.html" },
  box: { label: "Box", href: "box.html" },
  card: { label: "Card", href: "card.html" },
  switch: { label: "Switch", href: "switch.html" },
  grid: { label: "Grid", href: "grid.html" },
  tooltip: { label: "Tooltip", href: "tooltip.html" },
  popover: { label: "Popover", href: "popover.html" },
  drawer: { label: "Drawer", href: "drawer.html" },
  modal: { label: "Modal", href: "modal.html" },
  menu: { label: "Menu", href: "menu.html" },
  listbox: { label: "Listbox", href: "listbox.html" },
  badge: { label: "Badge", href: "badge.html" },
  chip: { label: "Chip", href: "chip.html" },
  alert: { label: "Alert", href: "alert.html" },
  toast: { label: "Toast", href: "toast.html" },
  "bet-card": { label: "Bet selection card", href: "bet-card.html" },
};

// Designs section — product prototypes for real app tasks (not design-system docs).
// First page: the mobile betslip.
export const DESIGN_ITEMS = {
  "mobile-betslip": { label: "Mobile betslip", href: "mobile-betslip.html" },
};

// DS tab lands on Overview; Designs tab lands on the first prototype.
const DS_HOME = "index.html";
const DESIGNS_HOME = "mobile-betslip.html";

// Scoped styles for the tab bar — injected once inside <nav class="side"> so the
// tabs work on every generated page without editing each build script's own
// duplicated sidebar CSS. Uses the docs-chrome vars (--bg-card/--accent/etc.)
// already declared by every page's :root, so it themes with the rest of the shell.
const TAB_STYLE = `<style>
    .ds-tabs { display: flex; gap: 4px; padding: 3px; background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 9px; margin: 0 0 1.5rem; }
    .ds-tab { flex: 1; text-align: center; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.01em; text-decoration: none; color: var(--text-secondary); }
    .ds-tab:hover { color: var(--text-primary); }
    .ds-tab.active { background: var(--accent-bg); color: var(--accent); }
  </style>`;

function tabBar(inDesigns) {
  return `<div class="ds-tabs">
    <a class="ds-tab${inDesigns ? "" : " active"}" href="${DS_HOME}">DS</a>
    <a class="ds-tab${inDesigns ? " active" : ""}" href="${DESIGNS_HOME}">Designs</a>
  </div>`;
}

export function renderNav(activeKey) {
  const inDesigns = Object.prototype.hasOwnProperty.call(DESIGN_ITEMS, activeKey);
  if (inDesigns) {
    const link = (key) => {
      const item = DESIGN_ITEMS[key];
      return `<a class="navlink${key === activeKey ? " active" : ""}" href="${item.href}">${item.label}</a>`;
    };
    return `${TAB_STYLE}
    ${tabBar(true)}
    <p class="brand">Turbo Sportsbook</p>
    <p class="brand-sub">Product designs & prototypes</p>
    <p class="nav-category">Betslip</p>
    ${link("mobile-betslip")}`;
  }
  const link = (key) => {
    const item = NAV_ITEMS[key];
    return `<a class="navlink${key === activeKey ? " active" : ""}" href="${item.href}">${item.label}</a>`;
  };
  return `${TAB_STYLE}
    ${tabBar(false)}
    <p class="brand">Turbo Sportsbook</p>
    <p class="brand-sub">Turbo Sportsbook design system</p>
    ${link("overview")}
    <p class="nav-category">Tokens</p>
    ${link("colors")}
    ${link("semantic-colors")}
    ${link("typography")}
    ${link("layout")}
    <p class="nav-category">Assets</p>
    ${link("icons")}
    ${link("disciplines")}
    ${link("teams")}
    ${link("championships")}
    <p class="nav-category">Components</p>
    ${link("button")}
    ${link("counter")}
    ${link("input")}
    ${link("select")}
    ${link("search")}
    ${link("pagination")}
    ${link("separator")}
    ${link("tabs")}
    ${link("checkbox")}
    ${link("radio")}
    ${link("box")}
    ${link("card")}
    ${link("switch")}
    ${link("grid")}
    ${link("tooltip")}
    ${link("popover")}
    ${link("drawer")}
    ${link("modal")}
    ${link("menu")}
    ${link("listbox")}
    ${link("badge")}
    ${link("chip")}
    <p class="nav-category">Feedback</p>
    ${link("alert")}
    ${link("toast")}
    <p class="nav-category">Betslip</p>
    ${link("bet-card")}`;
}
