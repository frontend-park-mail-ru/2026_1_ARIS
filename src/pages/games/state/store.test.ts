import { afterEach, describe, expect, it } from "vitest";
import {
  createInitialGamesState,
  gamesState,
  getGamesState,
  patchGamesState,
  replaceGamesState,
  resetGamesState,
} from "./store";

describe("games state", () => {
  afterEach(() => {
    resetGamesState();
  });

  it("создаёт начальное состояние меню игр", () => {
    expect(createInitialGamesState()).toMatchObject({
      room: null,
      lobbyMode: "menu",
      roomChatShowSystemMessages: true,
      roomsAutoRefreshEnabled: true,
    });
  });

  it("обновляет readonly-снимок через patchGamesState", () => {
    patchGamesState({ lobbyMode: "rooms", roomsSearchQuery: "мария" });

    expect(getGamesState()).toMatchObject({
      lobbyMode: "rooms",
      roomsSearchQuery: "мария",
    });
    expect(gamesState.lobbyMode).toBe("rooms");
  });

  it("заменяет и сбрасывает состояние", () => {
    replaceGamesState({ ...createInitialGamesState(), lobbyMode: "leaderboard" });
    expect(gamesState.lobbyMode).toBe("leaderboard");

    resetGamesState();
    expect(gamesState.lobbyMode).toBe("menu");
  });
});
