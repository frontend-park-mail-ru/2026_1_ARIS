import { getFeedMode, getSessionUser, setFeedMode, type FeedMode } from "../../state/session";
import { isSupportAgent } from "../../state/role";
import { clearFeedCache } from "../../pages/feed/cache";
import { domPatch } from "../../vdom/patch";

type SidebarItemOptions = {
  href?: string;
  label: string;
  icon: string;
  isActive?: boolean;
  isStub?: boolean;
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
 * @param {SidebarItemOptions} options
 * @returns {string}
 */
function renderSidebarItem({
  href = "#",
  label,
  icon,
  isActive = false,
  isStub = false,
  attributes = "",
}: SidebarItemOptions): string {
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
 * Рендерит левую боковую панель.
 *
 * @param {RenderSidebarOptions} [options={}]
 * @returns {string}
 */
export function renderSidebar({ isAuthorised = false }: RenderSidebarOptions = {}): string {
  const currentPath = normalisePath(window.location.pathname);
  const isFeedRoute = currentPath === "/" || currentPath === "/feed";
  const isProfileRoute =
    currentPath === "/profile" ||
    currentPath.startsWith("/profile/") ||
    /^\/id[^/]+$/.test(currentPath);
  const isFriendsRoute = currentPath === "/friends";
  const isChatsRoute = currentPath === "/chats";
  const supportHref = isSupportAgent() ? "/support/admin" : "/support/stats";
  const supportLabel = isSupportAgent() ? "Тикеты" : "Поддержка";
  const isForYouActive = getFeedMode() === "for-you";
  const isByTimeActive = getFeedMode() === "by-time";

  return `
    <aside class="sidebar">
      <section class="sidebar-card sidebar-card--menu">
        ${renderSidebarItem({
          href: "/feed",
          label: "Лента",
          icon: "/assets/img/icons/home.svg",
          isActive: isFeedRoute,
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Профиль",
          icon: "/assets/img/icons/profile.svg",
          isActive: isProfileRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          isStub: false,
        })}

        ${renderSidebarItem({
          href: "/friends",
          label: "Друзья",
          icon: "/assets/img/icons/friends.svg",
          isActive: isFriendsRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          isStub: false,
        })}

        ${renderSidebarItem({
          href: "/chats",
          label: "Чаты",
          icon: "/assets/img/icons/chat.svg",
          isActive: isChatsRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          isStub: false,
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: "Настройки",
          icon: "/assets/img/icons/settings.svg",
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          isStub: isAuthorised,
        })}

        ${
          isAuthorised
            ? renderSidebarItem({
                href: supportHref,
                label: supportLabel,
                icon: "/assets/img/icons/chat.svg",
                isActive: currentPath === supportHref,
              })
            : ""
        }
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
  `;
}

/**
 * Инициализирует элементы управления боковой панели.
 *
 * @param {Document|HTMLElement} [root=document]
 * @returns {void}
 */
export function initSidebar(root: Document | HTMLElement = document): void {
  const bindableRoot = root as SidebarRoot;
  if (bindableRoot.__sidebarBound) return;

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

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
  });

  bindableRoot.__sidebarBound = true;
}

/**
 * Обновляет боковую панель на месте.
 *
 * @returns {void}
 */
export function refreshSidebar(): void {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  const isAuthorised = getSessionUser() !== null;
  const template = document.createElement("template");
  template.innerHTML = renderSidebar({ isAuthorised }).trim();

  const newSidebar = template.content.firstElementChild;
  if (!(newSidebar instanceof HTMLElement)) return;

  domPatch(sidebar, newSidebar);
}
