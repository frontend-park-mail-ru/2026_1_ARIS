/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import {
  getProfileNavigationConfirmFromLink,
  navigateToConfirmedProfileAction,
  openProfileNavigationConfirmFromLink,
} from "./profile-navigation";

const player = {
  profileId: "42",
  name: "Ada Lovelace",
  avatarUrl: "/avatar.png",
} as GamePlayer;

/** Создаёт комнату с игроком для проверки profile navigation. */
function createRoom(): GameRoom {
  return {
    players: [player],
  } as GameRoom;
}

describe("games profile navigation action", () => {
  it("собирает подтверждение из data-атрибутов ссылки", () => {
    const link = document.createElement("a");
    link.href = "/id42?tab=games";
    link.dataset.gamesProfileId = "42";
    link.dataset.gamesProfileName = "Ada";
    link.dataset.gamesProfileAvatar = "/data-avatar.png";

    expect(
      getProfileNavigationConfirmFromLink(link, {
        room: createRoom(),
        getPlayerFullName: vi.fn(),
        getPlayerAvatarUrl: vi.fn(),
      }),
    ).toEqual({
      profileId: "42",
      href: "/id42?tab=games",
      name: "Ada",
      avatarUrl: "/data-avatar.png",
    });
  });

  it("использует данные игрока комнаты как fallback", () => {
    const link = document.createElement("a");
    link.href = "/id42";

    expect(
      getProfileNavigationConfirmFromLink(link, {
        room: createRoom(),
        getPlayerFullName: () => "Ada Lovelace",
        getPlayerAvatarUrl: () => "/avatar.png",
      }),
    ).toMatchObject({
      profileId: "42",
      name: "Ada Lovelace",
      avatarUrl: "/avatar.png",
    });
  });

  it("не создаёт подтверждение для внешней ссылки", () => {
    const link = document.createElement("a");
    link.href = "https://example.com/id42";

    expect(
      getProfileNavigationConfirmFromLink(link, {
        room: createRoom(),
        getPlayerFullName: vi.fn(),
        getPlayerAvatarUrl: vi.fn(),
      }),
    ).toBeNull();
  });

  it("открывает overlay подтверждения и закрывает другие меню", () => {
    const link = document.createElement("a");
    link.href = "/id42";
    const setGamesOverlayState = vi.fn();

    openProfileNavigationConfirmFromLink(link, {
      room: createRoom(),
      getPlayerFullName: () => "Ada Lovelace",
      getPlayerAvatarUrl: () => "/avatar.png",
      closeMenus: () => ({ titleMenuOpen: false }),
      setGamesOverlayState,
    });

    expect(setGamesOverlayState).toHaveBeenCalledWith(
      expect.objectContaining({
        profileNavigationConfirm: expect.objectContaining({ profileId: "42" }),
        titleMenuOpen: false,
        disbandConfirmOpen: false,
        reportConfirmQuestionKey: "",
      }),
    );
  });

  it("переходит в подтверждённый профиль", () => {
    const setGamesOverlayState = vi.fn();
    const pushState = vi.fn();
    const dispatchPopState = vi.fn();

    navigateToConfirmedProfileAction({
      href: "/id42",
      setGamesOverlayState,
      pushState,
      dispatchPopState,
    });

    expect(setGamesOverlayState).toHaveBeenCalledWith({ profileNavigationConfirm: null });
    expect(pushState).toHaveBeenCalledWith("/id42");
    expect(dispatchPopState).toHaveBeenCalledOnce();
  });
});
