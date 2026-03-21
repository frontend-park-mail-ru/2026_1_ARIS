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

import { createRouter } from "./router/router.js";
import { renderLogin } from "./pages/login/login.js";
import { renderRegister } from "./pages/register/register.js";
import { renderFeed, refreshFeedCenter } from "./pages/feed/feed.js";
import { renderProfile } from "./pages/profile/profile.js";
import { initSession } from "./state/session.js";
import { initHeader } from "./components/header/header.js";
import { initSidebar, refreshSidebar } from "./components/sidebar/sidebar.js";

const root = document.getElementById("app");

const router = createRouter(root, [
  { path: "/", title: "ARISNET — Feed", render: renderFeed },
  { path: "/feed", title: "ARISNET — Feed", render: renderFeed },
  { path: "/login", title: "ARISNET — Login", render: renderLogin },
  { path: "/register", title: "ARISNET — Register", render: renderRegister },
  { path: "/profile", title: "ARISNET — Profile", render: renderProfile },
  { path: "/profile/:id", title: "ARISNET — Profile", render: renderProfile },
]);

initSession().then(() => {
  router.render();
  initHeader();
  initSidebar();
});

/**
 * Handles global session state changes by refreshing UI fragments.
 * @returns {void}
 */
window.addEventListener("sessionchange", async () => {
  try {
    refreshSidebar();
    await refreshFeedCenter();
  } catch (error) {
    console.error(error);
  }
});
