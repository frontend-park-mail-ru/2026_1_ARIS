/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GamePlayer, GameRoom } from "../../../../api/games";
import { createInitialGamesState } from "../../state/store";
import { renderRoomPanelPresenter } from "./presenter";

/** Создаёт игрока комнаты для тестов presenter панели. */
function createPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
  return {
    profileId: "profile-1",
    userAccountId: "user-1",
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

/** Создаёт комнату для тестов presenter панели. */
function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const creator = createPlayer();
  const guest = createPlayer({
    profileId: "profile-2",
    userAccountId: "user-2",
    name: "Grace Hopper",
    firstName: "Grace",
    username: "grace",
    isMe: false,
  });

  return {
    id: "room-1",
    title: "Room",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting",
    createdByProfileId: creator.profileId,
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
    creator,
    players: [creator, guest],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

/** Создаёт options presenter панели комнаты. */
function createOptions(room = createRoom()) {
  return {
    state: createInitialGamesState(),
    room,
    game: {
      id: "quiz",
      gameType: "number_duel" as const,
      href: "/games/quiz",
      minPlayers: 2,
      maxPlayers: 8,
      titleKey: "game.numberDuel.title" as const,
      descriptionKey: "game.numberDuel.description" as const,
      title: "Викторина",
      description: "Описание правил",
      playerCount: "2-8",
    },
    currentProfileId: "profile-1",
    getPlayerAvatarUrl: () => "",
    getRoomTitleValue: (value: GameRoom) => value.title,
    getRoomPasswordDisplayValue: () => "",
    renderPauseAction: () => "<button>Pause</button>",
    renderGamePlay: () => "<section>Game</section>",
    renderInlineError: (target: string) => `<p>${target}</p>`,
  };
}

describe("games room panel presenter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("рендерит панель комнаты ожидания", () => {
    const html = renderRoomPanelPresenter(createOptions());

    expect(html).toContain("Room");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("data-games-start-open");
  });

  it("в обычной комнате считает администратора игроком, когда он пришёл отдельно от players", () => {
    const room = createRoom({
      players: [
        createPlayer({
          profileId: "profile-2",
          userAccountId: "user-2",
          name: "Grace Hopper",
          firstName: "Grace",
          username: "grace",
          isMe: false,
        }),
      ],
    });
    const roomWithCreatorAsPlayer = {
      ...room,
      players: [room.creator!, ...room.players],
    };
    const html = renderRoomPanelPresenter(createOptions(roomWithCreatorAsPlayer));

    expect(html).toContain("Участников в комнате: 2/8");
    expect(html).toContain("Готовы: 2/2");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Администратор:");
  });

  it("рендерит публичное лобби обычной комнатой без готовности", () => {
    const html = renderRoomPanelPresenter(
      createOptions(
        createRoom({
          isPublicLobby: true,
          maxPlayers: 80,
        }),
      ),
    );

    expect(html).toContain("Публичная ссылка");
    expect(html).toContain("Участников в комнате: 2/80");
    expect(html).toContain("Администратор:");
    expect(html).not.toContain("Название комнаты:");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Grace Hopper");
    expect(html).not.toContain("Тип игры");
    expect(html).not.toContain("Готовы:");
    expect(html).not.toContain("games-player--ready");
    expect(html).not.toContain("games-player--not-ready");
  });

  it("показывает подсказку старта для неадминистратора", () => {
    const options = createOptions();
    options.room.players = options.room.players.map((player) => ({
      ...player,
      isMe: player.profileId === "profile-2",
    }));
    options.currentProfileId = "profile-2";

    const html = renderRoomPanelPresenter(options);

    expect(html).toContain("Только администратор комнаты может начать игру");
  });

  it("скрывает заголовок комнаты перед финальными итогами", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:00:12.000Z"));
    const room = createRoom({
      status: "finished",
      questionCount: 1,
      currentQuestionIndex: 1,
      questions: [
        {
          id: "q1",
          position: 1,
          status: "completed",
          text: "Question?",
          correctAnswer: 42,
          answers: [],
          winnerProfileId: "",
          startedAt: "2026-05-25T00:00:00.000Z",
          deadlineAt: "2026-05-25T00:00:10.000Z",
          completedAt: "2026-05-25T00:00:10.000Z",
        },
      ],
    });

    const html = renderRoomPanelPresenter(createOptions(room));

    expect(html).not.toContain("games-room-heading");
    expect(html).not.toContain("Вопрос 1 из 1");
    expect(html).not.toContain("Викторина");
    expect(html).not.toContain("games-room-rules-button");
  });
});
