/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../api/games";
import { languageStore } from "../../../state/language";
import { renderRoomsList, renderRoomsPanel } from "./rooms";

function createPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
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
    isReady: false,
    hasAnswered: false,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: false,
    ...overrides,
  };
}

function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const player = createPlayer();
  return {
    id: "room-1",
    title: "Evening room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: false,
    password: "",
    isRanked: false,
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

const adapter = {
  getPlayerAvatarUrl: () => "",
  getProfileHref: (profileId: string) => `/id${profileId}`,
  getRoomTitleValue: (room: GameRoom) => room.title.trim(),
  shouldBlockFullRoomJoin: () => false,
};

describe("games rooms render", () => {
  afterEach(() => {
    languageStore.reset({ language: "RU" });
  });

  it("рендерит список комнат на английском языке", () => {
    languageStore.reset({ language: "EN" });
    const html = renderRoomsList({
      ...adapter,
      rooms: [createRoom()],
      roomsSearchQuery: "",
      roomsLoading: false,
      roomsError: "",
      roomsAutoRefreshEnabled: true,
    });

    expect(html).toContain("Evening room");
    expect(html).toContain("Players: 1/8");
    expect(html).toContain("No password");
    expect(html).toContain("Join");
  });

  it("рендерит панель пустого списка комнат", () => {
    const html = renderRoomsPanel({
      ...adapter,
      rooms: [],
      roomsSearchQuery: "",
      roomsLoading: false,
      roomsError: "",
      roomsAutoRefreshEnabled: false,
    });

    expect(html).toContain("Обновить");
    expect(html).toContain("Сейчас нет ни одной комнаты.");
    expect(html).toContain("Создать?");
  });
});
