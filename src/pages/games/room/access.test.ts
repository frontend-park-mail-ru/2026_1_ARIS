import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import {
  allowRoomAccessRecovery,
  canRecoverRoomAccess,
  clearRoomAccessRecovery,
  forgetRoomAccess,
  getStoredRoomAccess,
  getStoredRoomSnapshot,
  rememberRoomAccess,
} from "./access";

function createRoom(id = "room-1"): GameRoom {
  return {
    id,
    title: "Комната",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: "1",
    maxPlayers: 2,
    hasPassword: true,
    password: "secret",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 5,
    answerTimeoutSec: 30,
    currentQuestionIndex: 0,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: null,
    players: [],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
  };
}

describe("games room access storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage });
  });

  afterEach(() => {
    sessionStorage.clear();
    clearRoomAccessRecovery();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("сохраняет и читает доступ к комнате", () => {
    const room = createRoom();

    rememberRoomAccess(room);

    expect(getStoredRoomAccess(room.id)).toMatchObject({
      roomId: room.id,
      inviteCode: room.inviteCode,
      password: room.password,
    });
    expect(getStoredRoomSnapshot(room.id)).toMatchObject({ id: room.id });
  });

  it("удаляет доступ только для совпавшей комнаты", () => {
    rememberRoomAccess(createRoom("room-1"));

    forgetRoomAccess("room-2");
    expect(getStoredRoomAccess("room-1")).not.toBeNull();

    forgetRoomAccess("room-1");
    expect(getStoredRoomAccess("room-1")).toBeNull();
  });

  it("ограничивает окно восстановления доступа", () => {
    vi.useFakeTimers();
    allowRoomAccessRecovery("room-1");

    expect(canRecoverRoomAccess("room-1")).toBe(true);

    vi.advanceTimersByTime(30_001);
    expect(canRecoverRoomAccess("room-1")).toBe(false);
  });
});
