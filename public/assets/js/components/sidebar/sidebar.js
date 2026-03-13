import { mockSession, setFeedMode } from "../../mock/session.js";

/**
 * Renders a sidebar navigation item.
 * @param {Object} options
 * @param {string} [options.href="#"]
 * @param {string} options.label
 * @param {string} options.icon
 * @param {boolean} [options.isActive=false]
 * @param {boolean} [options.isStub=false]
 * @param {string} [options.attributes=""]
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
  const isModalTrigger = attributes.includes("data-open-auth-modal");

  if (isStub || isModalTrigger) {
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
 * @param {Object} [options={}]
 * @param {boolean} [options.isAuthorised=false]
 * @returns {string}
 */
export function renderSidebar({ isAuthorised = false } = {}) {
  const isForYouActive = mockSession.feedMode === "for-you";
  const isByTimeActive = mockSession.feedMode === "by-time";

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
          label: "Для вас",
          icon: "/assets/img/icons/star.svg",
          isActive: isForYouActive,
          isStub: true,
          attributes: 'data-feed-mode="for-you"',
        })}

        ${renderSidebarItem({
          label: "По времени",
          icon: "/assets/img/icons/clock.svg",
          isActive: isByTimeActive,
          isStub: true,
          attributes: 'data-feed-mode="by-time"',
        })}
      </section>
    </aside>
  `;
}

/**
 * Initializes sidebar controls.
 * @param {Document|HTMLElement} [root=document]
 * @returns {void}
 */
export function initSidebar(root = document) {
  if (root.__sidebarBound) return;

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("[data-feed-mode]");
    if (!button) return;

    event.preventDefault();

    const mode = button.getAttribute("data-feed-mode");
    if (mode !== "for-you" && mode !== "by-time") return;

    setFeedMode(mode);

    window.dispatchEvent(new CustomEvent("feedmodechange"));
  });

  root.__sidebarBound = true;
}

/**
 * Refreshes the sidebar in place.
 * @returns {void}
 */
export function refreshSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  const isAuthorised = mockSession.user !== null;
  const template = document.createElement("template");
  template.innerHTML = renderSidebar({ isAuthorised }).trim();

  const newSidebar = template.content.firstElementChild;
  if (!newSidebar) return;

  sidebar.replaceWith(newSidebar);
}
