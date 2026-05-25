/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom } from "../../../../api/games";
import type { GameCatalogItem } from "../../shared/registry";
import { renderRoomPanel, type RenderRoomPanelOptions } from "./panel";

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
    isReady: true,
    hasAnswered: false,
    pauseUsed: false,
    forceResumeRequested: false,
    isMe: true,
    ...overrides,
  };
}

function createRoom(status: GameRoom["status"] = "waiting"): GameRoom {
  const player = createPlayer();
  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status,
    createdByProfileId: player.profileId,
    maxPlayers: 8,
    hasPassword: true,
    password: "secret",
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
  };
}

function createGame(): GameCatalogItem {
  return {
    id: "quiz",
    gameType: "number_duel",
    href: "/games/quiz",
    minPlayers: 2,
    maxPlayers: 8,
    titleKey: "game.numberDuel.title",
    descriptionKey: "game.numberDuel.description",
    title: "Числовая дуэль",
    description: "Угадывайте числовые ответы.",
    playerCount: "2-8",
  };
}

function createOptions(overrides: Partial<RenderRoomPanelOptions> = {}): RenderRoomPanelOptions {
  const room = overrides.room ?? createRoom();
  return {
    room,
    game: createGame(),
    headingTitle: "Комната Числовая дуэль",
    loading: false,
    roomTitle: "Room",
    roomPasswordDisplay: "********",
    titleMenuOpen: false,
    passwordMenuOpen: false,
    canManageRanked: true,
    canDisbandRoom: true,
    canLeaveRoom: false,
    canStartRoom: false,
    startTooltipLines: ["В комнате должно быть как минимум 2 игрока."],
    currentPlayer: room.players[0] ?? null,
    rankedBadge: "<span>Обычная</span>",
    rankedToggle: "<fieldset>Тип игры</fieldset>",
    lobbyCreator: "<p>Администратор</p>",
    participantsStatus: "Участники: 1/8",
    readyStatus: "Готовы: 1/1",
    pauseAction: "",
    gamePlay: "<div>Игровая сцена</div>",
    playerList: "<div>Игроки</div>",
    passwordError: "<p>Ошибка пароля</p>",
    footerError: "<p>Ошибка footer</p>",
    ...overrides,
  };
}

describe("games room panel render", () => {
  it("рендерит общую комнату ожидания с доступом и действиями", () => {
    const html = renderRoomPanel(createOptions());

    expect(html).toContain("Комната Числовая дуэль");
    expect(html).toContain("ABC123");
    expect(html).toContain("Название комнаты:");
    expect(html).toContain("Пароль:");
    expect(html).toContain("Начать игру");
    expect(html).toContain("Распустить комнату");
    expect(html).toContain("Игроки");
  });

  it("рендерит активную комнату без lobby-деталей", () => {
    const html = renderRoomPanel(
      createOptions({
        room: createRoom("active"),
        pauseAction: "<button>Пауза</button>",
      }),
    );

    expect(html).toContain("games-panel--play");
    expect(html).toContain("Игровая сцена");
    expect(html).toContain("Пауза");
    expect(html).not.toContain("Код приглашения:");
  });
});
