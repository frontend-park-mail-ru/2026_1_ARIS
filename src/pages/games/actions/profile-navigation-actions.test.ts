/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createProfileNavigationActions } from "./profile-navigation-actions";
import {
  navigateToConfirmedProfileAction,
  openProfileNavigationConfirmFromLink,
} from "./profile-navigation";

vi.mock("./profile-navigation", () => ({
  navigateToConfirmedProfileAction: vi.fn(),
  openProfileNavigationConfirmFromLink: vi.fn(),
}));

function createOptions() {
  return {
    getRoom: vi.fn(() => ({ players: [] }) as unknown as GameRoom),
    getConfirmedHref: vi.fn(() => "/id42"),
    getPlayerFullName: vi.fn(() => "Ada Lovelace"),
    getPlayerAvatarUrl: vi.fn(() => "/avatar.png"),
    closeMenus: vi.fn(() => ({})),
    setGamesOverlayState: vi.fn(),
    pushState: vi.fn(),
    dispatchPopState: vi.fn(),
  };
}

describe("profile navigation actions facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("собирает зависимости открытия profile confirm", () => {
    const options = createOptions();
    const actions = createProfileNavigationActions(options);
    const link = document.createElement("a");

    actions.openProfileNavigationConfirm(link);

    expect(openProfileNavigationConfirmFromLink).toHaveBeenCalledWith(
      link,
      expect.objectContaining({
        room: options.getRoom(),
        closeMenus: options.closeMenus,
        setGamesOverlayState: options.setGamesOverlayState,
      }),
    );
  });

  it("собирает зависимости подтверждённого перехода", () => {
    const options = createOptions();
    const actions = createProfileNavigationActions(options);

    actions.navigateToConfirmedProfile();

    expect(navigateToConfirmedProfileAction).toHaveBeenCalledWith({
      href: "/id42",
      setGamesOverlayState: options.setGamesOverlayState,
      pushState: options.pushState,
      dispatchPopState: options.dispatchPopState,
    });
  });
});
