/**
 * Левая навигационная колонка приложения.
 */
import { getFeedMode, getSessionUser, setFeedMode, type FeedMode } from "../../state/session";
import { createPublicGameRoom } from "../../api/games";
import { isAdmin } from "../../state/role";
import { clearFeedCache } from "../../pages/feed/cache";
import { clearWidgetbarCache } from "../widgetbar/widgetbar";
import { domPatch } from "../../vdom/patch";
import { t } from "../../state/i18n";

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

const BACK_TO_TOP_VISIBLE_OFFSET = 360;
const PUBLIC_LOBBY_ANSWER_TIMEOUT_DEFAULT = 10;
const PUBLIC_LOBBY_ROUND_PAUSE_DEFAULT = 14;
let isBackToTopVisibilityBound = false;
let publicLobbyBackdropPointerDown = false;

function normalisePath(path: string): string {
  const noTrailing = (path || "/").replace(/\/+$/g, "");
  return noTrailing === "" ? "/" : noTrailing;
}

function shouldUseSmoothScroll(): boolean {
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function scrollPageToTop(): void {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: shouldUseSmoothScroll() ? "smooth" : "auto",
  });
}

function syncBackToTopVisibility(): void {
  const shouldShow = window.scrollY > BACK_TO_TOP_VISIBLE_OFFSET;
  document.querySelectorAll<HTMLElement>("[data-scroll-top-card]").forEach((card) => {
    card.hidden = !shouldShow;
  });
}

function bindBackToTopVisibility(): void {
  if (isBackToTopVisibilityBound) return;
  window.addEventListener("scroll", syncBackToTopVisibility, { passive: true });
  isBackToTopVisibilityBound = true;
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

function renderBackToTopControl(): string {
  const label = t("sidebar.backToTop");

  return `
    <section class="sidebar-card sidebar-card--scroll-top" data-scroll-top-card hidden>
      ${renderSidebarItem({
        label,
        icon: "/assets/img/icons/arrow-up.svg",
        isStub: true,
        attributes: `data-scroll-top aria-label="${label}" title="${label}"`,
      })}
    </section>
  `;
}

function renderPublicLobbySettingsDialog(): string {
  return `
    <div class="sidebar-public-lobby-modal" data-public-lobby-dialog hidden>
      <form class="sidebar-public-lobby-modal__dialog" data-public-lobby-form novalidate>
        <header class="sidebar-public-lobby-modal__header">
          <h2>${t("sidebar.publicLobbySettingsTitle")}</h2>
        </header>
        <label class="sidebar-public-lobby-modal__field">
          <span>${t("sidebar.publicLobbyAnswerTimeout")}</span>
          <input type="text" name="answerTimeoutSec" inputmode="numeric" pattern="[0-9]*" value="${PUBLIC_LOBBY_ANSWER_TIMEOUT_DEFAULT}" autocomplete="off" required>
        </label>
        <label class="sidebar-public-lobby-modal__field">
          <span>${t("sidebar.publicLobbyRoundPause")}</span>
          <input type="text" name="roundPauseSec" inputmode="numeric" pattern="[0-9]*" value="${PUBLIC_LOBBY_ROUND_PAUSE_DEFAULT}" autocomplete="off" required>
        </label>
        <p class="sidebar-public-lobby-modal__error" data-public-lobby-error aria-live="polite"></p>
        <div class="sidebar-public-lobby-modal__actions">
          <button type="button" class="sidebar-public-lobby-modal__button" data-public-lobby-cancel>
            ${t("sidebar.publicLobbyCancel")}
          </button>
          <button type="submit" class="sidebar-public-lobby-modal__button sidebar-public-lobby-modal__button--primary">
            ${t("sidebar.createPublicLobbySubmit")}
          </button>
        </div>
      </form>
    </div>
  `;
}

function getPublicLobbyDialog(root: Document | HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>("[data-public-lobby-dialog]");
}

function setPublicLobbyError(form: HTMLFormElement, message: string): void {
  const error = form.querySelector<HTMLElement>("[data-public-lobby-error]");
  if (error) error.textContent = message;
}

function parsePublicLobbyNumber(
  form: HTMLFormElement,
  name: string,
  min: number,
  max: number,
  message: string,
): number | null {
  const field = form.elements.namedItem(name);
  if (!(field instanceof HTMLInputElement)) return null;
  const value = Number(field.value.trim());
  if (!Number.isInteger(value) || value < min || value > max) {
    setPublicLobbyError(form, message);
    field.focus();
    return null;
  }
  return value;
}

function openPublicLobbyDialog(root: Document | HTMLElement): void {
  const dialog = getPublicLobbyDialog(root);
  if (!dialog) return;
  dialog.hidden = false;
  const form = dialog.querySelector<HTMLFormElement>("[data-public-lobby-form]");
  setPublicLobbyError(form!, "");
  form?.querySelector<HTMLInputElement>('input[name="answerTimeoutSec"]')?.focus();
}

function closePublicLobbyDialog(root: Document | HTMLElement): void {
  const dialog = getPublicLobbyDialog(root);
  if (!dialog) return;
  dialog.hidden = true;
}

function setPublicLobbyFormLoading(form: HTMLFormElement, loading: boolean): void {
  form
    .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")
    .forEach((control) => {
      control.disabled = loading;
    });
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
  const isCommunitiesListRoute = currentPath === "/groups" || currentPath === "/communities";
  const isCommunitiesRoute =
    isCommunitiesListRoute ||
    currentPath.startsWith("/groups/") ||
    currentPath.startsWith("/communities/");
  const isChatsRoute = currentPath === "/chats";
  const isGamesRoute = currentPath === "/games" || currentPath.startsWith("/games/");
  const isGamesCatalogRoute = currentPath === "/games";
  const isSettingsRoute = currentPath === "/settings";
  const isForYouActive = getFeedMode() === "for-you";
  const isByTimeActive = getFeedMode() === "by-time";
  const canCreatePublicLobby = isAuthorised && isAdmin();

  const mobileNav = `
    <nav class="mobile-nav" aria-label="${t("sidebar.mainNavigation")}">
      ${renderMobileNavItem({
        href: feedHref,
        label: t("nav.feed"),
        icon: "/assets/img/icons/home.svg",
        isActive: isFeedRoute,
      })}
      ${renderMobileNavItem({
        href: "/friends",
        label: t("nav.friends"),
        icon: "/assets/img/icons/friends.svg",
        isActive: isFriendsRoute,
        attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
      })}
      ${renderMobileNavItem({
        href: "/groups",
        label: t("nav.communities"),
        icon: "/assets/img/icons/communities.svg",
        isActive: isCommunitiesRoute,
        attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
      })}
      ${renderMobileNavItem({
        href: "/chats",
        label: t("nav.chats"),
        icon: "/assets/img/icons/chat.svg",
        isActive: isChatsRoute,
        attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
      })}
      ${renderMobileNavItem({
        href: "/games",
        label: t("nav.games"),
        icon: "/assets/img/icons/star.svg",
        isActive: isGamesRoute,
        attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
      })}
    </nav>
  `;

  return `
    <aside class="sidebar">
      <section class="sidebar-card sidebar-card--menu">
        ${renderSidebarItem({
          href: feedHref,
          label: t("nav.feed"),
          icon: "/assets/img/icons/home.svg",
          isActive: isFeedRoute,
          reloadOnClick: isFeedRoute,
          attributes: isFeedRoute ? 'data-sidebar-feed-refresh="true"' : "",
        })}

        ${renderSidebarItem({
          href: "/profile",
          label: t("nav.profile"),
          icon: "/assets/img/icons/profile.svg",
          isActive: isProfileRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: true,
        })}

        ${renderSidebarItem({
          href: "/friends",
          label: t("nav.friends"),
          icon: "/assets/img/icons/friends.svg",
          isActive: isFriendsRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: true,
        })}

        ${renderSidebarItem({
          href: "/groups",
          label: t("nav.communities"),
          icon: "/assets/img/icons/communities.svg",
          isActive: isCommunitiesRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: isCommunitiesListRoute,
        })}

        ${renderSidebarItem({
          href: "/chats",
          label: t("nav.chats"),
          icon: "/assets/img/icons/chat.svg",
          isActive: isChatsRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: true,
        })}

        ${renderSidebarItem({
          href: "/games",
          label: t("nav.games"),
          icon: "/assets/img/icons/star.svg",
          isActive: isGamesRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: isGamesCatalogRoute,
        })}

        ${renderSidebarItem({
          href: "/settings",
          label: t("nav.settings"),
          icon: "/assets/img/icons/settings.svg",
          isActive: isSettingsRoute,
          attributes: isAuthorised ? "" : 'data-open-auth-modal="login"',
          preventWhenActive: true,
        })}

        ${
          canCreatePublicLobby
            ? renderSidebarItem({
                label: t("sidebar.createPublicLobby"),
                icon: "/assets/img/icons/star.svg",
                isStub: true,
                attributes: `data-create-public-lobby title="${t("sidebar.createPublicLobby")}"`,
              })
            : ""
        }
      </section>

      ${
        isFeedRoute
          ? `
            <section class="sidebar-card sidebar-card--feed-type">
              <h3 class="sidebar-card__title">${t("sidebar.feedType")}</h3>

              ${renderSidebarItem({
                label: t("sidebar.forYou"),
                icon: "/assets/img/icons/star.svg",
                isActive: isForYouActive,
                isStub: true,
                attributes: 'data-feed-mode="for-you"',
              })}

              ${renderSidebarItem({
                label: t("sidebar.byTime"),
                icon: "/assets/img/icons/clock.svg",
                isActive: isByTimeActive,
                isStub: true,
                attributes: 'data-feed-mode="by-time"',
              })}
            </section>
          `
          : ""
      }

      ${renderBackToTopControl()}
    </aside>
    ${mobileNav}
    ${canCreatePublicLobby ? renderPublicLobbySettingsDialog() : ""}
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
  bindBackToTopVisibility();
  syncBackToTopVisibility();
  if (bindableRoot.__sidebarBound) return;

  root.addEventListener(
    "pointerdown",
    (event: Event) => {
      const target = event.target;
      const dialog = getPublicLobbyDialog(root);
      publicLobbyBackdropPointerDown = Boolean(
        target instanceof Element && dialog && target === dialog,
      );
    },
    true,
  );

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

      const scrollTopButton = target.closest("[data-scroll-top]");
      if (scrollTopButton instanceof HTMLButtonElement) {
        event.preventDefault();
        scrollPageToTop();
        return;
      }

      const createPublicLobbyButton = target.closest("[data-create-public-lobby]");
      if (createPublicLobbyButton instanceof HTMLButtonElement) {
        event.preventDefault();
        openPublicLobbyDialog(root);
        return;
      }

      if (target.closest("[data-public-lobby-cancel]")) {
        event.preventDefault();
        closePublicLobbyDialog(root);
        return;
      }

      const publicLobbyDialog = target.closest("[data-public-lobby-dialog]");
      if (
        publicLobbyDialog instanceof HTMLElement &&
        target === publicLobbyDialog &&
        publicLobbyBackdropPointerDown
      ) {
        event.preventDefault();
        publicLobbyBackdropPointerDown = false;
        closePublicLobbyDialog(root);
        return;
      }
      publicLobbyBackdropPointerDown = false;

      const button = target.closest("[data-feed-mode]");
      if (!button) return;

      event.preventDefault();

      const mode = button.getAttribute("data-feed-mode");
      if (mode !== "for-you" && mode !== "by-time") return;

      if (mode === getFeedMode()) return;

      if (mode === "for-you") {
        clearFeedCache();
      }

      setFeedMode(mode as FeedMode);
      refreshSidebar();
      void import("../../pages/feed/feed").then((m) => m.refreshFeedCenter());
    },
    true,
  );

  root.addEventListener(
    "submit",
    (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches("[data-public-lobby-form]")) return;
      event.preventDefault();

      const answerTimeoutSec = parsePublicLobbyNumber(
        form,
        "answerTimeoutSec",
        3,
        120,
        t("sidebar.publicLobbyAnswerTimeoutError"),
      );
      if (answerTimeoutSec === null) return;

      const roundPauseSec = parsePublicLobbyNumber(
        form,
        "roundPauseSec",
        1,
        60,
        t("sidebar.publicLobbyRoundPauseError"),
      );
      if (roundPauseSec === null) return;

      setPublicLobbyError(form, "");
      setPublicLobbyFormLoading(form, true);
      void createPublicGameRoom({ answerTimeoutSec, roundPauseSec })
        .then((room) => {
          closePublicLobbyDialog(root);
          window.history.pushState({}, "", `/games/quiz/${encodeURIComponent(room.id)}`);
          window.dispatchEvent(new PopStateEvent("popstate"));
        })
        .catch(() => {
          setPublicLobbyFormLoading(form, false);
          setPublicLobbyError(form, t("sidebar.createPublicLobbyError"));
        });
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
  const newPublicLobbyDialog = template.content.querySelector("[data-public-lobby-dialog]");
  const publicLobbyDialog = document.querySelector("[data-public-lobby-dialog]");

  if (sidebar instanceof HTMLElement && newSidebar instanceof HTMLElement) {
    domPatch(sidebar, newSidebar);
  }

  if (mobileNav instanceof HTMLElement && newMobileNav instanceof HTMLElement) {
    domPatch(mobileNav, newMobileNav);
  }

  if (publicLobbyDialog instanceof HTMLElement && newPublicLobbyDialog instanceof HTMLElement) {
    publicLobbyDialog.replaceWith(newPublicLobbyDialog);
  } else if (!publicLobbyDialog && newPublicLobbyDialog instanceof HTMLElement) {
    document.body.appendChild(newPublicLobbyDialog);
  } else if (publicLobbyDialog instanceof HTMLElement && !newPublicLobbyDialog) {
    publicLobbyDialog.remove();
  }

  syncBackToTopVisibility();
}
