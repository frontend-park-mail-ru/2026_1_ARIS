import { createRouter as createWorkspaceRouter, type AppRouter, type Route } from "@aris/router";
import { initPostcardExpand } from "../components/postcard/postcard";
import { initAuthForm } from "../components/auth-form/auth-form-controller";
import { initAuthModal } from "../components/auth-modal/auth-modal-controller";
import { initEyeToggle } from "../components/eye-toggle/eye-toggle-controller";
import { initInputMasks } from "../components/input/input-mask-controller";

export { type RouteParams } from "@aris/router";

export function createRouter(root: HTMLElement, routes: Route[]): AppRouter {
  return createWorkspaceRouter(root, routes, {
    afterRender: async (nextRoot) => {
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
    },
  });
}
