/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GameRoom } from "../../../../api/games";
import {
  getRoomAuthorHref,
  renderPlayerList,
  renderProtectedGameProfileLink,
  renderResultsPlayerCell,
  renderRoomRankedToggle,
} from "./players";

const player: GameRoom["players"][number] = {
  profileId: "2",
  userAccountId: "20",
  name: "Bob Builder",
  firstName: "Bob",
  lastName: "Builder",
  gender: "",
  username: "bob",
  avatarId: "",
  avatarUrl: "/avatars/bob.png",
  score: 0,
  isReady: false,
  hasAnswered: false,
  pauseUsed: false,
  forceResumeRequested: false,
  isMe: false,
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
  isRanked: true,
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
  creator: { ...player, profileId: "1", name: "Alice Admin", username: "alice" },
  players: [{ ...player, profileId: "1", name: "Alice Admin" }, player],
  currentQuestion: null,
  questions: [],
  ratingChanges: [],
  winnerProfileId: "",
  profileStats: null,
};

describe("games render players", () => {
  it("строит ссылку профиля по profileId", () => {
    expect(getRoomAuthorHref("42")).toBe("/id42");
    expect(getRoomAuthorHref("")).toBe("/profile");
  });

  it("рендерит защищённую ссылку профиля с экранированием", () => {
    const html = renderProtectedGameProfileLink({
      profileId: "2",
      className: "profile-link",
      label: "Bob <Builder>",
      content: "<strong>Bob</strong>",
      avatarUrl: "/avatar.png",
    });

    expect(html).toContain('data-games-profile-id="2"');
    expect(html).toContain("Bob &lt;Builder&gt;");
    expect(html).toContain("<strong>Bob</strong>");
    expect(html).toContain('data-games-profile-avatar="/avatar.png"');
  });

  it("рендерит меню игрока только для администратора комнаты ожидания", () => {
    const html = renderPlayerList({
      room,
      playerMenuProfileId: "2",
      isCurrentRoomCreator: () => true,
      getPlayerAvatarUrl: (item) => item.avatarUrl,
    });

    expect(html).toContain('data-games-player-menu-toggle="2"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Свободных мест: 2");
  });

  it("рендерит ranked toggle и ячейку результата через профильные ссылки", () => {
    expect(renderRoomRankedToggle(room, false)).toContain("games-room-ranked-segmented--locked");

    const html = renderResultsPlayerCell({
      player,
      playerLabel: "Bob",
      getPlayerAvatarUrl: (item) => item.avatarUrl,
    });

    expect(html).toContain("games-results-table__avatar-link");
    expect(html).toContain("games-results-table__player-link");
    expect(html).toContain("Открыть профиль Bob Builder");
  });
});
