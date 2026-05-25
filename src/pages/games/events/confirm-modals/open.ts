import type { HandleGamesConfirmModalsClickOptions } from "./types";
import {
  getOpenAdminConfirmPatch,
  getOpenDisbandConfirmPatch,
  getOpenKickConfirmPatch,
  getOpenLeaveConfirmPatch,
  getOpenStartConfirmPatch,
} from "./patches";

/**
 * Обрабатывает открытие confirm-модалок комнаты.
 */
export function handleConfirmOpenClick(
  event: Event,
  target: Element,
  options: HandleGamesConfirmModalsClickOptions,
): boolean {
  if (target.closest("[data-games-disband-open]")) {
    event.preventDefault();
    options.setGamesState(getOpenDisbandConfirmPatch());
    return true;
  }

  if (target.closest("[data-games-start-open]")) {
    event.preventDefault();
    options.setGamesState(getOpenStartConfirmPatch());
    return true;
  }

  if (target.closest("[data-games-leave-open]")) {
    event.preventDefault();
    options.setGamesOverlayState(getOpenLeaveConfirmPatch());
    return true;
  }

  const kickButton = target.closest("[data-games-kick-player]");
  if (kickButton instanceof HTMLElement) {
    event.preventDefault();
    const profileId = kickButton.getAttribute("data-games-kick-player") ?? "";
    if (!profileId) return true;
    options.setGamesState(getOpenKickConfirmPatch(profileId));
    return true;
  }

  const adminButton = target.closest("[data-games-admin-open]");
  if (adminButton instanceof HTMLElement) {
    event.preventDefault();
    const profileId = adminButton.getAttribute("data-games-admin-open") ?? "";
    if (!profileId) return true;
    options.setGamesState(getOpenAdminConfirmPatch(profileId));
    return true;
  }

  return false;
}
