/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import {
  getRequestedRoomId,
  isGamesCatalogRoute,
  navigateToGamesMenu,
  navigateToRoom,
  normaliseGamesPath,
  replaceWithGamesMenuRoute,
} from "./navigation";

describe("games navigation", () => {
  it("нормализует параметры комнаты и pathname", () => {
    expect(getRequestedRoomId({ roomId: " room-1 " })).toBe("room-1");
    expect(getRequestedRoomId()).toBe("");
    expect(normaliseGamesPath("/games///")).toBe("/games");
    expect(normaliseGamesPath("///")).toBe("/");
  });

  it("проверяет маршрут каталога игр", () => {
    expect(isGamesCatalogRoute("/games/")).toBe(true);
    expect(isGamesCatalogRoute("/games/quiz")).toBe(false);
  });

  it("обновляет history для переходов внутри игр", () => {
    const listener = vi.fn();
    window.addEventListener("popstate", listener);

    navigateToRoom("room 1");
    expect(window.location.pathname).toBe("/games/quiz/room%201");
    expect(listener).toHaveBeenCalledTimes(1);

    navigateToGamesMenu();
    expect(window.location.pathname).toBe("/games/quiz");
    expect(listener).toHaveBeenCalledTimes(2);

    replaceWithGamesMenuRoute();
    expect(window.location.pathname).toBe("/games/quiz");

    window.removeEventListener("popstate", listener);
  });
});
