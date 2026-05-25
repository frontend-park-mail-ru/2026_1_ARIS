import { describe, expect, it, vi } from "vitest";
import { selectLobbyModeAction } from "./lobby-mode";

/** Создаёт зависимости action переключения режима лобби. */
function createOptions() {
  return {
    setGamesState: vi.fn(),
    loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
    loadLeaderboard: vi.fn().mockResolvedValue(undefined),
  };
}

describe("games lobby mode action", () => {
  it("сбрасывает временное состояние и загружает комнаты", async () => {
    const options = createOptions();

    await selectLobbyModeAction("rooms", options);

    expect(options.setGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        lobbyMode: "rooms",
        message: "",
        error: "",
        loading: false,
        joinInviteCodeValue: "",
        joinPasswordValue: "",
      }),
    );
    expect(options.loadWaitingRooms).toHaveBeenCalledOnce();
    expect(options.loadLeaderboard).not.toHaveBeenCalled();
  });

  it("сбрасывает ошибки списка комнат при переходе не в rooms", async () => {
    const options = createOptions();

    await selectLobbyModeAction("leaderboard", options);

    expect(options.setGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        lobbyMode: "leaderboard",
        roomsError: "",
        roomsLoading: false,
      }),
    );
    expect(options.loadLeaderboard).toHaveBeenCalledOnce();
  });
});
