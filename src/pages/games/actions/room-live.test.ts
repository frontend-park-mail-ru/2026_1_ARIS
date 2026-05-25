/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../api/core/client";
import type { GameRoom } from "../../../api/games";
import {
  applyRoomSocketState,
  refreshCurrentRoomAction,
  refreshCurrentRoomSilentlyAction,
  type ApplyRoomSocketStateDeps,
  type RefreshCurrentRoomActionDeps,
  type RefreshCurrentRoomSilentlyDeps,
} from "./room-live";

/** Создаёт игрока комнаты для live-тестов. */
function createPlayer(overrides: Partial<GameRoom["players"][number]> = {}) {
  return {
    profileId: "1",
    userAccountId: "10",
    name: "Ada Lovelace",
    firstName: "Ada",
    lastName: "Lovelace",
    gender: "",
    username: "ada",
    avatarId: "",
    avatarUrl: "",
    score: 0,
    isReady: true,
    hasAnswered: false,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: true,
    ...overrides,
  } satisfies GameRoom["players"][number];
}

/** Создаёт комнату для live-тестов. */
function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const player = createPlayer();
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 3,
    answerTimeoutSec: 30,
    currentQuestionIndex: 0,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: player,
    players: [player],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

/** Создаёт зависимости применения socket-обновления. */
function createSocketDeps(
  room: GameRoom | null,
  overrides: Partial<ApplyRoomSocketStateDeps> = {},
): ApplyRoomSocketStateDeps {
  return {
    getCurrentRoom: () => room,
    getCurrentProfileId: () => "1",
    getSubmittedQuestionId: () => "",
    getSubmittedAnswerValue: () => "",
    getCurrentMessages: () => [],
    hydrateRoom: vi.fn(async (item) => item),
    getSocketOpen: () => true,
    getSystemMessages: () => [],
    mergeMessages: (existing, incoming) => [...existing, ...incoming],
    rememberRoomAccess: vi.fn(),
    clearPendingVoluntaryLeave: vi.fn(),
    patchGamesState: vi.fn(),
    refreshGamesDom: vi.fn(),
    syncCurrentAnswerFormDom: vi.fn(),
    syncPlayersRailAnswerDom: vi.fn(),
    getPendingRankedToast: () => null,
    setPendingRankedToast: vi.fn(),
    showToast: vi.fn(),
    getRankedToastMessage: (isRanked) => (isRanked ? "ranked" : "casual"),
    ...overrides,
  };
}

/** Создаёт зависимости silent-refresh комнаты. */
function createRefreshDeps(
  room: GameRoom | null,
  overrides: Partial<RefreshCurrentRoomSilentlyDeps> = {},
): RefreshCurrentRoomSilentlyDeps {
  return {
    getCurrentRoom: () => room,
    getLoading: () => false,
    getSocketOpen: () => false,
    getCurrentMessages: () => [],
    fetchRoom: vi.fn(async () => room ?? createRoom()),
    hydrateRoom: vi.fn(async (item) => item),
    getSystemMessages: () => [],
    mergeMessages: (existing, incoming) => [...existing, ...incoming],
    rememberRoomAccess: vi.fn(),
    clearRoomAccessRecovery: vi.fn(),
    canRecoverRoomAccess: () => false,
    recoverRoomAccess: vi.fn(async () => null),
    setGamesState: vi.fn(),
    handleRoomUnavailable: vi.fn(async () => undefined),
    ...overrides,
  };
}

/** Создаёт зависимости ручного refresh комнаты. */
function createRefreshActionDeps(
  room: GameRoom | null,
  overrides: Partial<RefreshCurrentRoomActionDeps> = {},
): RefreshCurrentRoomActionDeps {
  return {
    getCurrentRoom: () => room,
    getCurrentMessages: () => [],
    fetchRoom: vi.fn(async () => room ?? createRoom()),
    hydrateRoom: vi.fn(async (item) => item),
    getSystemMessages: () => [],
    mergeMessages: (existing, incoming) => [...existing, ...incoming],
    rememberRoomAccess: vi.fn(),
    setGamesState: vi.fn(),
    ...overrides,
  };
}

describe("games room live actions", () => {
  it("применяет полное socket-обновление комнаты", async () => {
    const previousRoom = createRoom();
    const incomingRoom = createRoom({ title: "Next" });
    const deps = createSocketDeps(previousRoom);

    await applyRoomSocketState(incomingRoom, deps);

    expect(deps.patchGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        room: expect.objectContaining({ title: "Next" }),
        roomId: "room-1",
        socketOpen: true,
      }),
    );
    expect(deps.rememberRoomAccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Next" }),
    );
    expect(deps.refreshGamesDom).toHaveBeenCalledTimes(1);
  });

  it("игнорирует socket-обновление другой комнаты", async () => {
    const deps = createSocketDeps(createRoom());

    await applyRoomSocketState(createRoom({ id: "room-2" }), deps);

    expect(deps.patchGamesState).not.toHaveBeenCalled();
  });

  it("тихо обновляет комнату, если live-signature изменился", async () => {
    const currentRoom = createRoom({ players: [createPlayer({ score: 0 })] });
    const nextRoom = createRoom({ players: [createPlayer({ score: 3 })] });
    const deps = createRefreshDeps(currentRoom, {
      fetchRoom: vi.fn(async () => nextRoom),
    });

    await refreshCurrentRoomSilentlyAction(deps);

    expect(deps.rememberRoomAccess).toHaveBeenCalledWith(nextRoom);
    expect(deps.setGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        room: nextRoom,
        roomId: "room-1",
        error: "",
      }),
    );
  });

  it("пытается восстановить комнату после 403 без открытого socket", async () => {
    const currentRoom = createRoom();
    const recoveredRoom = createRoom({ title: "Recovered" });
    const deps = createRefreshDeps(currentRoom, {
      fetchRoom: vi.fn(async () => {
        throw new ApiError("forbidden", 403, {});
      }),
      canRecoverRoomAccess: () => true,
      recoverRoomAccess: vi.fn(async () => recoveredRoom),
    });

    await refreshCurrentRoomSilentlyAction(deps);

    expect(deps.setGamesState).toHaveBeenCalledWith({
      room: recoveredRoom,
      roomId: "room-1",
      error: "",
    });
    expect(deps.handleRoomUnavailable).not.toHaveBeenCalled();
  });

  it("обновляет текущую комнату явным refresh-action", async () => {
    const previousRoom = createRoom({ title: "Old" });
    const nextRoom = createRoom({ title: "New" });
    const deps = createRefreshActionDeps(previousRoom, {
      fetchRoom: vi.fn(async () => nextRoom),
    });

    await refreshCurrentRoomAction(deps);

    expect(deps.fetchRoom).toHaveBeenCalledWith("room-1");
    expect(deps.rememberRoomAccess).toHaveBeenCalledWith(nextRoom);
    expect(deps.setGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        room: expect.objectContaining({ title: "New" }),
        loading: false,
        message: "",
        error: "",
      }),
    );
  });
});
