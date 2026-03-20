import "./styles/tokens.css";
import "./styles/main.css";

import "./components/sidebar/sidebar.css";
import "./components/header/header.css";
import "./pages/feed/feed.css";
import "./components/widgetbar/widgetbar.css";
import "./components/postcard/postcard.css";
import "./pages/login/login.css";
import "./components/eye-toggle/eye-toggle.css";
import "./pages/register/register.css";
import "./components/auth-modal/auth-modal.css";
import "./components/auth-form/auth-form.css";

import { createRouter } from "./router/router.js";
import { renderLogin } from "./pages/login/login.js";
import { renderRegister } from "./pages/register/register.js";
import { renderFeed, refreshFeedCenter } from "./pages/feed/feed.js";
import { renderProfile } from "./pages/profile/profile.js";
import { initSession } from "./mock/session.js";
import { initHeader } from "./components/header/header.js";
import { initSidebar, refreshSidebar } from "./components/sidebar/sidebar.js";

const root = document.getElementById("app");

const router = createRouter(root, [
  { path: "/", title: "ARISNET — Feed", render: renderFeed },
  { path: "/feed", title: "ARISNET — Feed", render: renderFeed },
  { path: "/login", title: "ARISNET — Login", render: renderLogin },
  { path: "/register", title: "ARISNET — Register", render: renderRegister },
  { path: "/profile", title: "ARISNET — Profile", render: renderProfile },
]);

initSession().then(() => {
  router.render();
  initHeader();
  initSidebar();
});

/**
 * Handles feed mode changes by refreshing sidebar and feed content.
 * @returns {void}
 */
window.addEventListener("feedmodechange", () => {
  refreshSidebar();

  refreshFeedCenter().catch((error) => {
    console.error(error);
  });
});
