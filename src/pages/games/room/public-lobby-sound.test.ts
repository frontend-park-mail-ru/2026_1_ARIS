/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import {
  playPublicLobbyStartSound,
  resetPublicLobbyStartSoundForTests,
  shouldPlayPublicLobbyStartSound,
} from "./public-lobby-sound";

function createPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
  return {
    profileId: "profile-1",
    userAccountId: "user-1",
    name: "Admin",
    firstName: "Admin",
    lastName: "",
    gender: "",
    username: "admin",
    avatarId: "",
    avatarUrl: "",
    score: 0,
    isReady: true,
    hasAnswered: false,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: true,
    ...overrides,
  };
}

function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const admin = createPlayer();
  return {
    id: "room-1",
    title: "Public lobby",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: admin.profileId,
    maxPlayers: 80,
    hasPassword: false,
    password: "",
    isRanked: false,
    isPublicLobby: true,
    inviteCodeEnabled: true,
    questionCount: 5,
    answerTimeoutSec: 10,
    currentQuestionIndex: 0,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: admin,
    players: [admin],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

describe("public lobby start sound", () => {
  beforeEach(() => {
    resetPublicLobbyStartSoundForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("разрешает звук только админу при старте публичного лобби", () => {
    const previousRoom = createRoom({ status: "waiting" });
    const nextRoom = createRoom({ status: "active" });

    expect(shouldPlayPublicLobbyStartSound(previousRoom, nextRoom, "profile-1")).toBe(true);
    expect(shouldPlayPublicLobbyStartSound(previousRoom, nextRoom, "profile-2")).toBe(false);
    expect(
      shouldPlayPublicLobbyStartSound(
        { ...previousRoom, isPublicLobby: false },
        { ...nextRoom, isPublicLobby: false },
        "profile-1",
      ),
    ).toBe(false);
  });

  it("проигрывает mp3 один раз для одного старта", () => {
    const play = vi.fn(() => Promise.resolve());
    class FakeAudio {
      preload = "";
      src: string;

      constructor(src: string) {
        this.src = src;
      }

      play = play;
    }
    vi.stubGlobal("Audio", FakeAudio);
    const previousRoom = createRoom({ status: "waiting" });
    const nextRoom = createRoom({ status: "active", nextQuestionAt: "2026-05-30T04:00:00.000Z" });

    playPublicLobbyStartSound(previousRoom, nextRoom, "profile-1");
    playPublicLobbyStartSound(previousRoom, nextRoom, "profile-1");

    expect(play).toHaveBeenCalledTimes(1);
  });
});
