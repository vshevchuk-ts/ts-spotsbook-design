// Shared sidebar nav — single source of truth for every docs/*.html build script,
// so adding/moving a page (like splitting Components into per-component pages)
// is a one-file change instead of hand-editing every generator's copy-pasted block.
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
};

export function renderNav(activeKey) {
  const link = (key) => {
    const item = NAV_ITEMS[key];
    return `<a class="navlink${key === activeKey ? " active" : ""}" href="${item.href}">${item.label}</a>`;
  };
  return `<p class="brand">Turbo Sportsbook</p>
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
    ${link("chip")}`;
}
