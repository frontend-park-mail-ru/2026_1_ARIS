import "./styles/main.css";
import "./styles/tokens.css";
import "./styles/layout.scss";

import "./components/button/button.scss";
import "./components/header/header.scss";
import "./components/input/input.scss";
import "./components/logo/logo.scss";
import "./components/modal-close/modal-close.scss";
import "./components/sidebar/sidebar.scss";
import "./components/widgetbar/widgetbar.scss";
import "./components/postcard/postcard.scss";
import "./components/auth-modal/auth-modal.scss";
import "./components/auth-form/auth-form.scss";
import "./components/eye-toggle/eye-toggle.scss";

import "./pages/auth/auth-page.scss";
import "./pages/chats/chats.css";
import "./pages/friends/friends.css";
import "./pages/profile/profile.css";
import "./pages/support/support.scss";
import "./pages/support-admin/support-admin.scss";
import "./pages/support-stats/support-stats.scss";

import "./components/postcard/postcard-element";
import { createRouter } from "./router/router";
import { registerPrefetch, prefetchRoute } from "./prefetch/prefetch";
import { initSession, getSessionUser } from "./state/session";
import { initHeader } from "./components/header/header";
import { initSidebar, refreshSidebar } from "./components/sidebar/sidebar";
import { clearWidgetbarCache } from "./components/widgetbar/widgetbar";
import { initAvatarFallback } from "./utils/avatar-fallback";
import { initOfflineIndicator } from "./utils/offline-indicator";
import { registerServiceWorker } from "./utils/register-service-worker";
import { onCacheInvalidation } from "./utils/cache-channel";
import { initSupportIframe } from "./utils/support-widget";

// ---------------------------------------------------------------------------
// Ленивые фабрики модулей страниц — webpack нарезает их в отдельные чанки
// ---------------------------------------------------------------------------

const loadFeed = () => import(/* webpackChunkName: "page-feed" */ "./pages/feed/feed");
const loadChats = () => import(/* webpackChunkName: "page-chats" */ "./pages/chats/chats");
const loadFriends = () => import(/* webpackChunkName: "page-friends" */ "./pages/friends/friends");
const loadProfile = () => import(/* webpackChunkName: "page-profile" */ "./pages/profile/profile");
const loadLogin = () => import(/* webpackChunkName: "page-login" */ "./pages/login/login");
const loadRegister = () =>
  import(/* webpackChunkName: "page-register" */ "./pages/register/register");
const loadSupport = () => import(/* webpackChunkName: "page-support" */ "./pages/support/support");
const loadSupportAdmin = () =>
  import(/* webpackChunkName: "page-support-admin" */ "./pages/support-admin/support-admin");
const loadSupportStats = () =>
  import(/* webpackChunkName: "page-support-stats" */ "./pages/support-stats/support-stats");

function normalisePathname(pathname: string): string {
  return pathname.replace(/\/+$/g, "") || "/";
}

function matchesRoutePath(pathname: string, routePath: string): boolean {
  const normalisedPathname = normalisePathname(pathname);
  const normalisedRoutePath = normalisePathname(routePath);

  if (!normalisedRoutePath.includes(":")) {
    return normalisedPathname === normalisedRoutePath;
  }

  if (normalisedRoutePath === "/profile/:id") {
    return /^\/profile\/[^/]+$/i.test(normalisedPathname);
  }

  if (normalisedRoutePath === "/id:id") {
    return /^\/id[^/]+$/i.test(normalisedPathname);
  }

  return false;
}

function getBootstrapDocumentTitle(
  pathname: string,
  routes: Array<{ path: string; title?: string }>,
): string {
  const matchedRoute = routes.find((route) => matchesRoutePath(pathname, route.path));
  return matchedRoute?.title ?? "ARISNET";
}

// ---------------------------------------------------------------------------
// Маршруты
// ---------------------------------------------------------------------------

const root = document.getElementById("app");

if (!(root instanceof HTMLElement)) {
  throw new Error('Root element "#app" not found');
}

const routes = [
  {
    path: "/",
    title: "ARISNET — Feed",
    render: async (p, s) => (await loadFeed()).renderFeed(p, s),
  },
  {
    path: "/feed",
    title: "ARISNET — Feed",
    render: async (p, s) => (await loadFeed()).renderFeed(p, s),
  },
  {
    path: "/login",
    title: "ARISNET — Login",
    render: async () => (await loadLogin()).renderLogin(),
  },
  {
    path: "/register",
    title: "ARISNET — Register",
    render: async () => (await loadRegister()).renderRegister(),
  },
  {
    path: "/friends",
    title: "ARISNET — Friends",
    render: async (p, s) => (await loadFriends()).renderFriends(p, s),
  },
  {
    path: "/chats",
    title: "ARISNET — Chats",
    render: async (p, s) => (await loadChats()).renderChats(p, s),
  },
  {
    path: "/profile",
    title: "ARISNET — Profile",
    render: async (p, s) => (await loadProfile()).renderProfile(p, s),
  },
  {
    path: "/profile/:id",
    title: "ARISNET — Profile",
    render: async (p, s) => (await loadProfile()).renderProfile(p, s),
  },
  {
    path: "/id:id",
    title: "ARISNET — Profile",
    render: async (p, s) => (await loadProfile()).renderProfile(p, s),
  },
  {
    path: "/support",
    title: "ARISNET — Support",
    render: async () => (await loadSupport()).renderSupportWidget(),
  },
  {
    path: "/support/stats",
    title: "ARISNET — Support Stats",
    render: async (p, s) => (await loadSupportStats()).renderSupportStats(p, s),
  },
  {
    path: "/support/admin",
    title: "ARISNET — Support Admin",
    render: async () => (await loadSupportAdmin()).renderSupportAdmin(),
  },
];

document.title = getBootstrapDocumentTitle(window.location.pathname, routes);

registerServiceWorker();

const router = createRouter(root, routes);

// ---------------------------------------------------------------------------
// Prefetch: данные + JS-чанки по hover
// ---------------------------------------------------------------------------

registerPrefetch("/", async () => (await loadFeed()).prefetchFeed());
registerPrefetch("/feed", async () => (await loadFeed()).prefetchFeed());
registerPrefetch("/chats", async () => (await loadChats()).prefetchChats());

// Карта путей → фабрика чанка для prefetch кода при hover
const chunkMap: Record<string, () => Promise<unknown>> = {
  "/": loadFeed,
  "/feed": loadFeed,
  "/chats": loadChats,
  "/friends": loadFriends,
  "/profile": loadProfile,
  "/login": loadLogin,
  "/register": loadRegister,
  "/support/admin": loadSupportAdmin,
};

document.addEventListener(
  "mouseover",
  (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[data-link]");
    if (!(link instanceof HTMLAnchorElement)) return;
    try {
      const path = new URL(link.href).pathname.replace(/\/+$/g, "") || "/";
      void chunkMap[path]?.(); // prefetch JS чанк
      prefetchRoute(path); // prefetch данные
    } catch {
      // Игнорируем невалидные URL
    }
  },
  { passive: true },
);

// ---------------------------------------------------------------------------
// Инициализация
// ---------------------------------------------------------------------------

void (async () => {
  try {
    await initSession();
  } catch (error) {
    console.error("[session] init failed", error);
  }

  if (!getSessionUser() && HTMLScriptElement.supports?.("speculationrules")) {
    const s = document.createElement("script");
    s.type = "speculationrules";
    s.textContent = JSON.stringify({ prerender: [{ source: "list", urls: ["/feed"] }] });
    document.head.appendChild(s);
  }

  initSupportIframe();

  await router.render();
  initHeader();
  initSidebar();
  initAvatarFallback(document);
  initOfflineIndicator();
})();

onCacheInvalidation(async (key) => {
  if (key === "feed") {
    const { clearFeedCacheLocal, refreshFeedCenter } = await loadFeed();
    clearFeedCacheLocal();
    await refreshFeedCenter();
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type !== "ARIS_OUTBOX_DRAINED") {
      return;
    }

    void (async () => {
      const { clearFeedCacheLocal, refreshFeedCenter } = await loadFeed();
      clearFeedCacheLocal();
      clearWidgetbarCache();
      await refreshFeedCenter();
    })();
  });
}

window.addEventListener("sessionchange", async (event: Event) => {
  try {
    const detail =
      event instanceof CustomEvent ? (event.detail as { key?: string } | undefined) : undefined;

    if (detail?.key === "init") {
      return;
    }

    if (detail?.key === "user") {
      await router.render();
      initHeader();
      initSidebar();
      initAvatarFallback(document);
      return;
    }

    refreshSidebar();
    const path = window.location.pathname.replace(/\/+$/g, "") || "/";
    if (path === "/" || path === "/feed") {
      await (await loadFeed()).refreshFeedCenter();
    }
  } catch (error) {
    console.error(error);
  }
});
