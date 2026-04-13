import { createRouter as createWorkspaceRouter, type AppRouter, type Route } from "@aris/router";
import { initPostcardExpand } from "../components/postcard/postcard";
import { initAuthForm } from "../components/auth-form/auth-form-controller";
import { initAuthModal } from "../components/auth-modal/auth-modal-controller";
import { initEyeToggle } from "../components/eye-toggle/eye-toggle-controller";
import { initInputMasks } from "../components/input/input-mask-controller";
import { initProfileToggle } from "../pages/profile/profile";
import { initChats } from "../pages/chats/chats";
import { initFriends } from "../pages/friends/friends";

export { type RouteParams } from "@aris/router";

export function createRouter(root: HTMLElement, routes: Route[]): AppRouter {
  return createWorkspaceRouter(root, routes, {
    afterRender: (nextRoot) => {
      initAuthForm(document);
      initPostcardExpand(nextRoot);
      initAuthModal(document);
      initEyeToggle(document);
      initInputMasks(document);
      initProfileToggle(nextRoot);
      initChats(nextRoot);
      initFriends(nextRoot);
    },
  });
}
