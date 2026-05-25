/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GameRoom } from "../../../../api/games";
import {
  formatParticipants,
  formatReadyPlayers,
  renderParticipantsStatus,
  renderReadyPlayersStatus,
} from "./status";

const player: GameRoom["players"][number] = {
  profileId: "1",
  userAccountId: "10",
  name: "Alice",
  firstName: "Alice",
  lastName: "",
  gender: "",
  username: "alice",
  avatarId: "",
  avatarUrl: "",
  score: 0,
  isReady: true,
  hasAnswered: false,
  pauseUsed: false,
  forceResumeRequested: false,
  isMe: true,
};

const room: GameRoom = {
  id: "room-1",
  title: "Room",
  inviteCode: "123456",
  gameType: "number_duel",
  status: "waiting",
  createdByProfileId: "1",
  maxPlayers: 4,
  hasPassword: false,
  password: "",
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
  creator: player,
  players: [player, { ...player, profileId: "2", isMe: false }],
  currentQuestion: null,
  questions: [],
  ratingChanges: [],
  winnerProfileId: "",
  profileStats: null,
};

describe("games render status", () => {
  it("форматирует счётчики участников и готовности", () => {
    expect(formatParticipants(room)).toBe("Участников в комнате: 2/4");
    expect(formatReadyPlayers(room)).toBe("Готовы: 2/2");
  });

  it("рендерит открытый статус участников", () => {
    const html = renderParticipantsStatus({ room, hintOpen: true });

    expect(html).toContain("Участников в комнате: 2/4");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("games-ready-status__button--ready");
  });

  it("рендерит предупреждение, если не все игроки готовы", () => {
    const html = renderReadyPlayersStatus({
      room: { ...room, players: [player, { ...player, profileId: "2", isReady: false }] },
      hintOpen: false,
    });

    expect(html).toContain("Готовы: 1/2");
    expect(html).toContain("Один или несколько игроков не готовы к игре");
    expect(html).toContain("games-ready-status__button--not-ready");
  });
});
