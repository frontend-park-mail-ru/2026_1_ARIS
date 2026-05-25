import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameLeaderboard, GameRoom } from "../../../api/games";
import { createGamesLobbyActions } from "./lobby-actions";
import { loadLeaderboardAction, loadWaitingRoomsAction } from "./lobby-data";
import { selectLobbyModeAction } from "./lobby-mode";

vi.mock("./lobby-data", () => ({
  loadLeaderboardAction: vi.fn(),
  loadWaitingRoomsAction: vi.fn(),
}));

vi.mock("./lobby-mode", () => ({
  selectLobbyModeAction: vi.fn(),
}));

function createOptions() {
  return {
    gameType: "number_duel" as const,
    fetchRooms: vi.fn(async () => [] as GameRoom[]),
    fetchLeaderboard: vi.fn(async () => ({ entries: [] }) as unknown as GameLeaderboard),
    hydrateRooms: vi.fn(async (rooms: GameRoom[]) => rooms),
    hydratePlayers: vi.fn(async (players: GameRoom["players"]) => players),
    prepareAvatarLinks: vi.fn(async () => undefined),
    getPlayerAvatarUrl: vi.fn(() => ""),
    getRoomsErrorMessage: vi.fn(() => "rooms error"),
    getErrorMessage: vi.fn(() => "error"),
    setGamesState: vi.fn(),
  };
}

describe("games lobby actions facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadLeaderboardAction).mockResolvedValue(undefined);
    vi.mocked(loadWaitingRoomsAction).mockResolvedValue(undefined);
    vi.mocked(selectLobbyModeAction).mockResolvedValue(undefined);
  });

  it("собирает зависимости загрузки комнат и рейтинга", async () => {
    const options = createOptions();
    const actions = createGamesLobbyActions(options);

    await actions.loadWaitingRooms({ preserveMessage: true });
    await actions.loadLeaderboard({ silent: true });

    expect(loadWaitingRoomsAction).toHaveBeenCalledWith(
      { preserveMessage: true },
      expect.objectContaining({
        fetchRooms: options.fetchRooms,
        hydrateRooms: options.hydrateRooms,
      }),
    );
    expect(loadLeaderboardAction).toHaveBeenCalledWith(
      { silent: true },
      expect.objectContaining({
        gameType: "number_duel",
        fetchLeaderboard: options.fetchLeaderboard,
      }),
    );
  });

  it("переключает режим лобби через общие загрузчики", async () => {
    const options = createOptions();
    const actions = createGamesLobbyActions(options);

    await actions.selectLobbyMode("rooms");

    expect(selectLobbyModeAction).toHaveBeenCalledWith(
      "rooms",
      expect.objectContaining({
        setGamesState: options.setGamesState,
        loadWaitingRooms: expect.any(Function),
        loadLeaderboard: expect.any(Function),
      }),
    );
  });
});
