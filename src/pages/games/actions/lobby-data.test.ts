import { describe, expect, it, vi } from "vitest";
import type { GameLeaderboard, GamePlayer, GameRoom } from "../../../api/games";
import { loadLeaderboardAction, loadWaitingRoomsAction } from "./lobby-data";

const player = {
  profileId: "1",
  avatarUrl: "/avatar.png",
} as GamePlayer;
const room = {
  id: "room-1",
  players: [player],
} as GameRoom;
const leaderboard = {
  gameType: "number_duel",
  season: {
    id: "season-1",
    title: "Season",
    seasonNumber: 1,
    startsAt: "2026-05-01T00:00:00.000Z",
    endsAt: "2026-06-01T00:00:00.000Z",
  },
  entries: [
    {
      rank: 1,
      profileId: "1",
      player,
      rating: 1000,
      gamesPlayed: 1,
      wins: 1,
      draws: 0,
    },
  ],
} as GameLeaderboard;

describe("games lobby data actions", () => {
  it("загружает комнаты и сбрасывает состояние загрузки", async () => {
    const setGamesState = vi.fn();

    await loadWaitingRoomsAction(undefined, {
      fetchRooms: vi.fn(async () => [room]),
      hydrateRooms: vi.fn(async (rooms) => rooms),
      getRoomsErrorMessage: vi.fn(),
      setGamesState,
    });

    expect(setGamesState).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ roomsLoading: true, roomsError: "" }),
    );
    expect(setGamesState).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ rooms: [room], roomsLoading: false, roomsError: "" }),
    );
  });

  it("не трогает состояние при silent-ошибке списка комнат", async () => {
    const setGamesState = vi.fn();

    await loadWaitingRoomsAction(
      { silent: true },
      {
        fetchRooms: vi.fn(async () => {
          throw new Error("network");
        }),
        hydrateRooms: vi.fn(),
        getRoomsErrorMessage: () => "Ошибка",
        setGamesState,
      },
    );

    expect(setGamesState).not.toHaveBeenCalled();
  });

  it("загружает leaderboard и подготавливает аватары", async () => {
    const setGamesState = vi.fn();
    const hydratedPlayer = { ...player, avatarUrl: "/hydrated.png" } as GamePlayer;
    const prepareAvatarLinks = vi.fn(async () => undefined);

    await loadLeaderboardAction(undefined, {
      gameType: "number_duel",
      fetchLeaderboard: vi.fn(async () => leaderboard),
      hydratePlayers: vi.fn(async () => [hydratedPlayer]),
      prepareAvatarLinks,
      getPlayerAvatarUrl: (item) => item.avatarUrl,
      getErrorMessage: vi.fn(),
      setGamesState,
    });

    expect(prepareAvatarLinks).toHaveBeenCalledWith(["/hydrated.png"]);
    expect(setGamesState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        leaderboard: expect.objectContaining({
          entries: [expect.objectContaining({ player: hydratedPlayer })],
        }),
        leaderboardLoading: false,
        leaderboardError: "",
      }),
    );
  });

  it("показывает ошибку leaderboard без silent-режима", async () => {
    const setGamesState = vi.fn();

    await loadLeaderboardAction(undefined, {
      gameType: "number_duel",
      fetchLeaderboard: vi.fn(async () => {
        throw new Error("network");
      }),
      hydratePlayers: vi.fn(),
      prepareAvatarLinks: vi.fn(),
      getPlayerAvatarUrl: vi.fn(),
      getErrorMessage: () => "Не удалось",
      setGamesState,
    });

    expect(setGamesState).toHaveBeenLastCalledWith({
      leaderboardLoading: false,
      leaderboardError: "Не удалось",
    });
  });
});
