import { createRouter } from "./router/router.js";
import { renderLogin } from "./pages/login/login.js";
import { renderRegister } from "./pages/register/register.js";
import { renderFeed } from "./pages/feed/feed.js";
import { renderProfile } from "./pages/profile/profile.js";
import { getCurrentUser } from "./api/auth.js";
import { setSessionUser, clearSessionUser } from "./mock/session.js";
import { logoutUser } from "./api/auth.js";

const root = document.getElementById("app");

const router = createRouter(root, [
  { path: "/", title: "ARISNET — Feed", render: renderFeed },
  { path: "/feed", title: "ARISNET — Feed", render: renderFeed },
  { path: "/login", title: "ARISNET — Login", render: renderLogin },
  { path: "/register", title: "ARISNET — Register", render: renderRegister },
  { path: "/profile", title: "ARISNET — Profile", render: renderProfile },
]);

async function bootstrap() {
  try {
    const user = await getCurrentUser();

    if (user && user.firstName && user.lastName) {
      setSessionUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } else {
      clearSessionUser();
    }
  } catch {
    clearSessionUser();
  }

  router.render();
}

bootstrap();

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-logout]");
  if (!btn) return;

  try {
    await logoutUser();
    clearSessionUser();

    window.location.href = "/feed";
  } catch (err) {
    console.error("logout error", err);
  }
});
