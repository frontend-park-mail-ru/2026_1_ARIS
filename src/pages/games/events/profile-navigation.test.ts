/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { handleGamesProfileNavigationClick } from "./profile-navigation";

const room = {
  id: "room-1",
  status: "active",
} as GameRoom;

describe("games profile navigation events", () => {
  it("закрывает модалку подтверждения профиля", () => {
    const modal = document.createElement("div");
    modal.dataset.gamesProfileNavModal = "";
    const close = document.createElement("button");
    close.dataset.gamesProfileNavClose = "";
    modal.appendChild(close);
    const setGamesOverlayState = vi.fn();

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const handled = handleGamesProfileNavigationClick(event, close, {
      room,
      setGamesOverlayState,
      navigateToConfirmedProfile: vi.fn(),
      openProfileNavigationConfirm: vi.fn(),
    });

    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(setGamesOverlayState).toHaveBeenCalledWith({ profileNavigationConfirm: null });
  });

  it("открывает подтверждение для защищённой ссылки в активной игре", () => {
    const link = document.createElement("a");
    link.dataset.gamesProfileLink = "";
    const openProfileNavigationConfirm = vi.fn();

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const handled = handleGamesProfileNavigationClick(event, link, {
      room,
      setGamesOverlayState: vi.fn(),
      navigateToConfirmedProfile: vi.fn(),
      openProfileNavigationConfirm,
    });

    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(openProfileNavigationConfirm).toHaveBeenCalledWith(link);
  });

  it("не перехватывает профильную ссылку в комнате ожидания", () => {
    const link = document.createElement("a");
    link.dataset.gamesProfileLink = "";

    expect(
      handleGamesProfileNavigationClick(new MouseEvent("click"), link, {
        room: { ...room, status: "waiting" },
        setGamesOverlayState: vi.fn(),
        navigateToConfirmedProfile: vi.fn(),
        openProfileNavigationConfirm: vi.fn(),
      }),
    ).toBe(false);
  });
});
