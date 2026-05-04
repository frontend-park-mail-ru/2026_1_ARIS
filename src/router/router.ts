/**
 * Конфигурация клиентского роутера.
 *
 * Связывает маршруты, скелетоны страниц и post-render инициализацию.
 */
import { createRouter as createWorkspaceRouter, type AppRouter, type Route } from "@aris/router";
import { initPostcardExpand } from "../components/postcard/postcard";
import { initAuthForm } from "../components/auth-form/auth-form-controller";
import { initAuthModal } from "../components/auth-modal/auth-modal-controller";
import { initEyeToggle } from "../components/eye-toggle/eye-toggle-controller";
import { initInputMasks } from "../components/input/input-mask-controller";
import { renderFeedSkeleton } from "../pages/feed/skeleton";
import { renderChatsSkeleton } from "../pages/chats/skeleton";
import { renderFriendsSkeleton } from "../pages/friends/skeleton";
import { renderProfileSkeleton } from "../pages/profile/skeleton";
import { renderCommunitiesSkeleton } from "../pages/communities/skeleton";
import { initAvatarFallback } from "../utils/avatar-fallback";

export { type Route, type RouteParams } from "@aris/router";

function normalisePath(p: string): string {
  return (p || "/").replace(/\/+$/, "") || "/";
}

function stripChatIdFromNonChatsUrl(): void {
  const pathname = normalisePath(window.location.pathname);
  if (pathname === "/chats") {
    return;
  }

  const nextUrl = new URL(window.location.href);
  if (!nextUrl.searchParams.has("chatId")) {
    return;
  }

  nextUrl.searchParams.delete("chatId");
  const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextPath !== currentPath) {
    window.history.replaceState({}, "", nextPath);
  }
}

/**
 * Создаёт основной роутер приложения.
 *
 * Помимо маршрутизации, роутер отвечает за:
 * - показ скелетонов во время переключения страниц
 * - подключение поведенческих инициализаторов после рендера
 * - ленивую загрузку тяжёлых страниц
 *
 * @param {HTMLElement} root Корневой контейнер приложения.
 * @param {Route[]} routes Список маршрутов.
 * @returns {AppRouter} Настроенный экземпляр роутера.
 *
 * @example
 * const router = createRouter(root, routes);
 */
export function createRouter(root: HTMLElement, routes: Route[]): AppRouter {
  return createWorkspaceRouter(root, routes, {
    getSkeleton(path: string): string | null {
      const p = normalisePath(path);
      if (p === "/" || p === "/feed") return renderFeedSkeleton();
      if (p.startsWith("/chats")) return renderChatsSkeleton();
      if (p === "/friends") return renderFriendsSkeleton();
      if (p.startsWith("/communities")) return renderCommunitiesSkeleton(p);
      if (p.startsWith("/profile") || p.startsWith("/id")) return renderProfileSkeleton();
      return null;
    },
    afterRender: async (nextRoot) => {
      // Очищаем `chatId` вне страницы чатов, чтобы состояние URL не протекало между разделами.
      stripChatIdFromNonChatsUrl();
      initAvatarFallback(nextRoot);
      initAuthForm(document);
      initPostcardExpand(nextRoot);
      initAuthModal(document);
      initEyeToggle(document);
      initInputMasks(document);

      if (nextRoot.querySelector("[data-chats-page]")) {
        const { initChats } = await import(
          /* webpackChunkName: "page-chats" */ "../pages/chats/chats"
        );
        initChats(nextRoot);
      }
      if (nextRoot.querySelector("[data-friends-page]")) {
        const { initFriends } = await import(
          /* webpackChunkName: "page-friends" */ "../pages/friends/friends"
        );
        initFriends(nextRoot);
      }
      if (nextRoot.querySelector("[data-communities-page]")) {
        const { initCommunities } = await import(
          /* webpackChunkName: "page-communities" */ "../pages/communities/communities"
        );
        initCommunities(nextRoot);
      }
      if (nextRoot.querySelector(".profile-page")) {
        const { initProfileToggle } = await import(
          /* webpackChunkName: "page-profile" */ "../pages/profile/profile"
        );
        initProfileToggle(nextRoot);
      }
      if (nextRoot.querySelector("[data-support-page]")) {
        const { initSupport } = await import(
          /* webpackChunkName: "page-support" */ "../pages/support/support"
        );
        void initSupport(nextRoot);
      }
      if (nextRoot.querySelector("[data-support-stats-page]")) {
        const { initSupportStats } = await import(
          /* webpackChunkName: "page-support-stats" */ "../pages/support-stats/support-stats"
        );
        initSupportStats(nextRoot);
      }
      if (nextRoot.querySelector("[data-support-admin-page]")) {
        const { initSupportAdmin } = await import(
          /* webpackChunkName: "page-support-admin" */ "../pages/support-admin/support-admin"
        );
        void initSupportAdmin(nextRoot as HTMLElement);
      }
      if (nextRoot.querySelector("[data-search-page]")) {
        const { initSearch } = await import(
          /* webpackChunkName: "page-search" */ "../pages/search/search"
        );
        initSearch(nextRoot);
      }
      if (nextRoot.querySelector("[data-settings-page]")) {
        const { initSettings } = await import(
          /* webpackChunkName: "page-settings" */ "../pages/settings/settings"
        );
        initSettings(nextRoot);
      }
    },
  });
}
