/**
 * Левая навигационная колонка приложения.
 */
import { getFeedMode, getSessionUser, setFeedMode, type FeedMode } from "../../state/session";
import { clearFeedCache } from "../../pages/feed/cache";
import { clearWidgetbarCache } from "../widgetbar/widgetbar";
import { domPatch } from "../../vdom/patch";

type SidebarItemOptions = {
  href?: string;
  label: string;
  icon: string;
  isActive?: boolean;
  isStub?: boolean;
  reloadOnClick?: boolean;
  preventWhenActive?: boolean;
  attributes?: string;
};

type MobileNavItemOptions = {
  href: string;
  label: string;
  icon: string;
  isActive?: boolean;
  attributes?: string;
};

type RenderSidebarOptions = {
  isAuthorised?: boolean;
};

type SidebarRoot = (Document | HTMLElement) & {
  __sidebarBound?: boolean;
};

function normalisePath(path: string): string {
  const noTrailing = (path || "/").replace(/\/+$/g, "");
  return noTrailing === "" ? "/" : noTrailing;
}

/**
 * Рендерит элемент навигации боковой панели.
 *
 * @param {SidebarItemOptions} options Параметры элемента меню.
 * @returns {string} HTML-разметка пункта боковой панели.
 */
function renderSidebarItem({
  href = "#",
  label,
  icon,
  isActive = false,
  isStub = false,
  reloadOnClick = false,
  preventWhenActive = false,
  attributes = "",
}: SidebarItemOptions): string {
  const itemClass = isActive ? "sidebar-item sidebar-item--active" : "sidebar-item";
  const hasAuthModalTrigger = attributes.includes("data-open-auth-modal=");
  const linkAttributes = [
    reloadOnClick || hasAuthModalTrigger ? "" : "data-link",
    preventWhenActive && isActive ? 'data-sidebar-current="true"' : "",
    attributes,
  ]
    .filter(Boolean)
    .join(" ");

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
    <a href="${href}" class="${itemClass}" ${linkAttributes}>
      <span class="sidebar-item__icon" aria-hidden="true">
        <img src="${icon}" alt="">
      </span>
      <span class="sidebar-item__label">${label}</span>
    </a>
  `;
}

function renderMobileNavItem({
  href,
  label,
  icon,
  isActive = false,
  attributes = "",
}: MobileNavItemOptions): string {
  const itemClass = isActive ? "mobile-nav__item mobile-nav__item--active" : "mobile-nav__item";
  const hasAuthModalTrigger = attributes.includes("data-open-auth-modal=");
  const linkAttributes = [hasAuthModalTrigger ? "" : "data-link", attributes]
    .filter(Boolean)
    .join(" ");

  return `
    <a href="${href}" class="${itemClass}" ${linkAttributes} aria-label="${label}">
      <span class="mobile-nav__icon" aria-hidden="true">
        <img src="${icon}" alt="">
      </span>
      <span class="mobile-nav__label">${label}</span>
    </a>
  `;
}

/**
 * Рендерит левую боковую панель.
 *
 * @param {RenderSidebarOptions} [options={}] Параметры рендера.
 * @returns {string} HTML-разметка боковой панели.
 */
export function renderSidebar({ isAuthorised = false }: RenderSidebarOptions = {}): string {
  const currentPath = normalisePath(window.location.pathname);
  const isFeedRoute = currentPath === "/" || currentPath === "/feed";
  const feedHref = currentPath === "/" ? "/" : "/feed";
  const isProfileRoute =
    currentPath === "/profile" ||
    currentPath.startsWith("/profile/") ||
    /^\/id[^/]+$/.test(currentPath);
  const isFriendsRoute = currentPath === "/friends";
  const isCommunitiesListRoute = currentPath === "/communities";
  const isCommunitiesRoute = isCommunitiesListRoute || currentPath.startsWith("/communities/");
  const isChatsRoute = currentPath === "/chats";
  const isSettingsRoute = currentPath === "/settings";
  const isForYouActive = getFeedMode() === "for-you";
  const isByTimeActive = getFeedMode() === "by-time";

  const mobileNav = `
    <nav class="mobile-nav" aria-label="Основная навигация">
      ${renderMobileNavItem({
        href: feedHref,
        label: "Лента",
        icon: "/assets/img/icons/home.svg",
        isActive: isFeedRoute,
      })}
      ${renderMobileNavItem({
        href: "/profile",
        label: "Профиль",
        icon: "/assets/img/icons/profile.svg",
        isActive: isProfileRoute,
        attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
      })}
      ${renderMobileNavItem({
        href: "/friends",
        label: "Друзья",
        icon: "/assets/img/icons/friends.svg",
        isActive: isFriendsRoute,
        attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
      })}
      ${renderMobileNavItem({
        href: "/communities",
        label: "Сообщества",
        icon: "/assets/img/icons/communities.svg",
        isActive: isCommunitiesRoute,
        attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
      })}
      ${renderMobileNavItem({
        href: "/chats",
        label: "Чаты",
        icon: "/assets/img/icons/chat.svg",
        isActive: isChatsRoute,
        attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
      })}
      ${renderMobileNavItem({
        href: "/settings",
        label: "Настройки",
        icon: "/assets/img/icons/settings.svg",
        isActive: isSettingsRoute,
        attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
      })}
    </nav>
  `;

  return `
    <aside class="sidebar">
      <section class="sidebar-card sidebar-card--menu">
        ${renderSidebarItem({
          href: feedHref,
          label: "Лента",
          icon: "/assets/img/icons/home.svg",
          isActive: isFeedRoute,
          reloadOnClick: true,
          attributes: isFeedRoute ? 'data-sidebar-feed-refresh="true"' : "",
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Профиль",
          icon: "/assets/img/icons/profile.svg",
          isActive: isProfileRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: true,
        })}

        ${renderSidebarItem({
          href: "/friends",
          label: "Друзья",
          icon: "/assets/img/icons/friends.svg",
          isActive: isFriendsRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: true,
        })}

        ${renderSidebarItem({
          href: "/communities",
          label: "Сообщества",
          icon: "/assets/img/icons/communities.svg",
          isActive: isCommunitiesRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: isCommunitiesListRoute,
        })}

        ${renderSidebarItem({
          href: "/chats",
          label: "Чаты",
          icon: "/assets/img/icons/chat.svg",
          isActive: isChatsRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: true,
        })}

        ${renderSidebarItem({
          href: "/settings",
          label: "Настройки",
          icon: "/assets/img/icons/settings.svg",
          isActive: isSettingsRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: true,
        })}
      </section>

      ${
        isFeedRoute
          ? `
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
          `
          : ""
      }
    </aside>
    ${mobileNav}
  `;
}

/**
 * Инициализирует элементы управления боковой панели.
 *
 * @param {Document|HTMLElement} [root=document] Корень, внутри которого живёт sidebar.
 * @returns {void}
 */
export function initSidebar(root: Document | HTMLElement = document): void {
  const bindableRoot = root as SidebarRoot;
  if (bindableRoot.__sidebarBound) return;

  root.addEventListener(
    "click",
    (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const currentSidebarLink = target.closest('a[data-sidebar-current="true"]');
      if (currentSidebarLink instanceof HTMLAnchorElement) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const feedRefreshLink = target.closest('a[data-sidebar-feed-refresh="true"]');
      if (feedRefreshLink instanceof HTMLAnchorElement) {
        event.preventDefault();
        event.stopPropagation();
        clearFeedCache();
        clearWidgetbarCache();
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }

      const button = target.closest("[data-feed-mode]");
      if (!button) return;

      event.preventDefault();

      const mode = button.getAttribute("data-feed-mode");
      if (mode !== "for-you" && mode !== "by-time") return;

      if (mode === "for-you") {
        clearFeedCache();
      }

      setFeedMode(mode as FeedMode);
      refreshSidebar();
      void import("../../pages/feed/feed").then((m) => m.refreshFeedCenter());
    },
    true,
  );

  bindableRoot.__sidebarBound = true;
}

/**
 * Обновляет боковую панель на месте.
 *
 * @returns {void}
 */
export function refreshSidebar(): void {
  const sidebar = document.querySelector(".sidebar");
  const mobileNav = document.querySelector(".mobile-nav");
  if (!sidebar && !mobileNav) return;

  const isAuthorised = getSessionUser() !== null;
  const template = document.createElement("template");
  template.innerHTML = renderSidebar({ isAuthorised }).trim();

  const newSidebar = template.content.querySelector(".sidebar");
  const newMobileNav = template.content.querySelector(".mobile-nav");

  if (sidebar instanceof HTMLElement && newSidebar instanceof HTMLElement) {
    domPatch(sidebar, newSidebar);
  }

  if (mobileNav instanceof HTMLElement && newMobileNav instanceof HTMLElement) {
    domPatch(mobileNav, newMobileNav);
  }
}
