/**
 * Renders a sidebar navigation item.
 * @param {Object} options
 * @param {string} options.href
 * @param {string} options.label
 * @param {string} options.icon
 * @param {boolean} [options.isActive=false]
 * @returns {string}
 */
function renderSidebarItem({ href, label, icon, isActive = false }) {
  const itemClass = isActive ? "sidebar-item sidebar-item--active" : "sidebar-item";

  return `
    <a href="${href}" data-link class="${itemClass}">
      <span class="sidebar-item__icon" aria-hidden="true">${icon}</span>
      <span class="sidebar-item__label">${label}</span>
    </a>
  `;
}

/**
 * Renders the left sidebar.
 * @returns {string}
 */
export function renderSidebar() {
  return `
    <aside class="sidebar">
      <section class="sidebar-card sidebar-card--menu">
        ${renderSidebarItem({
          href: "/feed",
          label: "Лента",
          icon: "⌂",
          isActive: true,
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Профиль",
          icon: "◌",
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Друзья",
          icon: "◎",
        })}

        ${renderSidebarItem({
          href: "/login",
          label: "Чаты",
          icon: "◔",
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Настройки",
          icon: "⚙",
        })}
      </section>

      <section class="sidebar-card sidebar-card--feed-type">
        <h3 class="sidebar-card__title">Тип ленты</h3>

        ${renderSidebarItem({
          href: "/feed",
          label: "Для вас",
          icon: "★",
          isActive: true,
        })}

        ${renderSidebarItem({
          href: "/feed",
          label: "По времени",
          icon: "◷",
        })}
      </section>
    </aside>
  `;
}
