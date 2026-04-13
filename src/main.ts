import "./styles/tokens.css";
import "./styles/main.css";
import "./styles/layout.scss";

import "./components/button/button.scss";
import "./components/header/header.scss";
import "./components/input/input.scss";
import "./components/logo/logo.scss";
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

import { createRouter } from "./router/router";
import { renderLogin } from "./pages/login/login";
import { renderRegister } from "./pages/register/register";
import { renderFeed, refreshFeedCenter } from "./pages/feed/feed";
import { renderChats } from "./pages/chats/chats";
import { renderFriends } from "./pages/friends/friends";
import { renderProfile } from "./pages/profile/profile";
import { initSession } from "./state/session";
import { initHeader } from "./components/header/header";
import { initSidebar, refreshSidebar } from "./components/sidebar/sidebar";
import { initAvatarFallback } from "./utils/avatar-fallback";
import { initOfflineIndicator } from "./utils/offline-indicator";
import { registerServiceWorker } from "./utils/register-service-worker";

const root = document.getElementById("app");

if (!(root instanceof HTMLElement)) {
  throw new Error('Root element "#app" not found');
}

registerServiceWorker();

const router = createRouter(root, [
  { path: "/", title: "ARISNET — Feed", render: renderFeed },
  { path: "/feed", title: "ARISNET — Feed", render: renderFeed },
  { path: "/login", title: "ARISNET — Login", render: renderLogin },
  { path: "/register", title: "ARISNET — Register", render: renderRegister },
  { path: "/friends", title: "ARISNET — Friends", render: renderFriends },
  { path: "/chats", title: "ARISNET — Chats", render: renderChats },
  { path: "/profile", title: "ARISNET — Profile", render: renderProfile },
  { path: "/profile/:id", title: "ARISNET — Profile", render: renderProfile },
  { path: "/id:id", title: "ARISNET — Profile", render: renderProfile },
]);

void (async () => {
  try {
    await initSession();
  } catch (error) {
    console.error("[session] init failed", error);
  }

  await router.render();
  initHeader();
  initSidebar();
  initAvatarFallback(document);
  initOfflineIndicator();
})();

/**
 * Handles global session state changes by refreshing UI fragments.
 */
window.addEventListener("sessionchange", async () => {
  try {
    refreshSidebar();
    await refreshFeedCenter();
  } catch (error) {
    console.error(error);
  }
});
