import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import {
  getFinalRoundResultsUntil,
  isRoundResultRevealVisible,
  shouldShowFinalRoundResultBeforeSummary,
} from "./reveal";

function createPlayer(): GamePlayer {
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
    hasAnswered: true,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: true,
  };
}

function createRoom(completedAt: string): GameRoom {
  const player = createPlayer();
  return {
    id: "room-1",
    title: "",
    inviteCode: "",
    gameType: "number_duel",
    status: "finished",
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 1,
    answerTimeoutSec: 10,
    currentQuestionIndex: 1,
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    creator: player,
    players: [player],
    currentQuestion: null,
    questions: [
      {
        id: "q1",
        position: 1,
        status: "completed",
        text: "Question",
        correctAnswer: 2,
        answers: [],
        winnerProfileId: "",
        startedAt: "",
        deadlineAt: "",
        completedAt,
      },
    ],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
  };
}

describe("games round reveal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("держит финальный раунд на экране до окна итогов", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:00:04.000Z"));
    const room = createRoom("2026-05-25T00:00:00.000Z");

    expect(getFinalRoundResultsUntil(room, room.questions[0]!)).toEqual(
      new Date("2026-05-25T00:00:05.000Z"),
    );
    expect(shouldShowFinalRoundResultBeforeSummary(room)).toBe(true);
    expect(isRoundResultRevealVisible(room)).toBe(true);
  });

  it("скрывает финальный раунд после окна итогов", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:00:25.000Z"));
    const room = createRoom("2026-05-25T00:00:00.000Z");

    expect(getFinalRoundResultsUntil(room, room.questions[0]!)).toBeNull();
    expect(shouldShowFinalRoundResultBeforeSummary(room)).toBe(false);
    expect(isRoundResultRevealVisible(room)).toBe(false);
  });
});
