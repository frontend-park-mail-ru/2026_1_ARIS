/**
 * Renders a sidebar navigation item.
 * @param {Object} options
 * @param {string} options.href
 * @param {string} options.label
 * @param {string} options.icon
 * @param {boolean} [options.isActive=false]
 * @returns {string}
 */
function renderSidebarItem({
  href = "#",
  label,
  icon,
  isActive = false,
  isStub = false,
  attributes = "",
}) {
  const itemClass = isActive ? "sidebar-item sidebar-item--active" : "sidebar-item";

  if (isStub) {
    return `
      <button type="button" class="${itemClass} sidebar-item--button" ${attributes}>
        <span class="sidebar-item__icon" aria-hidden="true">
          <img src="${icon}" alt="">
        </span>
        <span class="sidebar-item__label">${label}</span>
      </button>
    `;
  }

  return `
    <a href="${href}" data-link class="${itemClass}" ${attributes}>
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
export function renderSidebar({ isAuthorised = false } = {}) {
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
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          isStub: isAuthorised,
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Друзья",
          icon: "/assets/img/icons/friends.svg",
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          isStub: isAuthorised,
        })}

        ${renderSidebarItem({
          href: "/login",
          label: "Чаты",
          icon: "/assets/img/icons/chat.svg",
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          isStub: isAuthorised,
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Настройки",
          icon: "/assets/img/icons/settings.svg",
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          isStub: isAuthorised,
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
