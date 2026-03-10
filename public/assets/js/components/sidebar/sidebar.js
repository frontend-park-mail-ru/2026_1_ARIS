/**
 * Renders a sidebar navigation item.
 * @param {Object} options
 * @param {string} options.href
 * @param {string} options.label
 * @param {string} options.icon
 * @param {boolean} [options.isActive=false]
 * @returns {string}
 */
function renderSidebarItem({ href, label, icon, isActive = false, attributes = "" }) {
  const itemClass = isActive ? "sidebar-item sidebar-item--active" : "sidebar-item";

  return `
    <a href="${href}" ${attributes} class="${itemClass}">
        <span class="sidebar-item__icon" aria-hidden="true">
            <img src="${icon}" alt="">
    </span>
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
          icon: "/assets/img/icons/home.svg",
          isActive: true,
        })}

        ${renderSidebarItem({
          href: "/login",
          label: "Профиль",
          icon: "/assets/img/icons/profile.svg",
          attributes: 'data-open-auth-modal="login"',
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Друзья",
          icon: "/assets/img/icons/friends.svg",
          attributes: 'data-open-auth-modal="login"',
        })}

        ${renderSidebarItem({
          href: "/login",
          label: "Чаты",
          icon: "/assets/img/icons/chat.svg",
          attributes: 'data-open-auth-modal="login"',
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Настройки",
          icon: "/assets/img/icons/settings.svg",
          attributes: 'data-open-auth-modal="login"',
        })}
      </section>

      <section class="sidebar-card sidebar-card--feed-type">
        <h3 class="sidebar-card__title">Тип ленты</h3>

        ${renderSidebarItem({
          href: "/feed",
          label: "Для вас",
          icon: "/assets/img/icons/star.svg",
          isActive: true,
        })}

        ${renderSidebarItem({
          href: "/feed",
          label: "По времени",
          icon: "/assets/img/icons/clock.svg",
        })}
      </section>
    </aside>
  `;
}
