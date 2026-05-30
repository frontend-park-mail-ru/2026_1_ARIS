import { afterEach, describe, expect, it } from "vitest";
import type { GameRoom, GameRoomStatus } from "../../../../api/games";
import { languageStore } from "../../../../state/language";
import {
  formatRoomModeLabel,
  getRemovedVerb,
  getRoomSystemMessages,
  normalizeRenderedSystemMessageText,
} from "./system-messages";

function createPlayer(
  profileId: string,
  overrides: Partial<GameRoom["players"][number]> = {},
): GameRoom["players"][number] {
  return {
    profileId,
    userAccountId: `user-${profileId}`,
    name: `Игрок ${profileId}`,
    firstName: "Игрок",
    lastName: profileId,
    gender: "",
    username: `player${profileId}`,
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
  return {
    id: "room-1",
    title: "Комната",
    inviteCode: "ABC123",
    gameType: "number_duel",
    status: "waiting" as GameRoomStatus,
    createdByProfileId: "1",
    maxPlayers: 2,
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
    creator: null,
    players: [createPlayer("1"), createPlayer("2")],
    currentQuestion: null,
    questions: [],
    ratingChanges: [],
    winnerProfileId: "",
    profileStats: null,
    ...overrides,
  };
}

describe("games room system messages", () => {
  afterEach(() => {
    languageStore.reset({ language: "RU" });
  });

  it("нормализует старые названия рейтингового режима", () => {
    expect(normalizeRenderedSystemMessageText('Тип игры изменен: "На рейтинг".')).toBe(
      'Тип игры изменен: "Рейтинговая".',
    );
    expect(formatRoomModeLabel(false)).toBe("Обычная");
  });

  it("учитывает пол игрока в сообщениях удаления", () => {
    expect(getRemovedVerb(createPlayer("2", { firstName: "Анна" }))).toBe("была удалена");
    expect(getRemovedVerb(createPlayer("3", { firstName: "Илья" }))).toBe("был удален");
  });

  it("создаёт сообщения по изменениям комнаты", () => {
    const previousRoom = createRoom({
      players: [createPlayer("1", { isReady: false }), createPlayer("2")],
    });
    const nextRoom = createRoom({
      title: "Новая комната",
      isRanked: true,
      players: [
        createPlayer("1", { isReady: true }),
        createPlayer("2"),
        createPlayer("3", { firstName: "Мария", lastName: "Соколова" }),
      ],
    });

    const messages = getRoomSystemMessages(previousRoom, nextRoom).map((message) => message.text);

    expect(messages).toContain('Комната переименована: "Новая комната".');
    expect(messages).toContain('Тип игры изменен: "Рейтинговая".');
    expect(messages).toContain("Мария Соколова присоединилась к комнате.");
    expect(messages).not.toContain('Игрок 1 поставил статус "Готов" (2/3).');
  });

  it("пишет вход гостей публичного лобби в мужском роде", () => {
    const previousRoom = createRoom({
      isPublicLobby: true,
      players: [],
    });
    const nextRoom = createRoom({
      isPublicLobby: true,
      players: [
        createPlayer("3", {
          userAccountId: "0",
          username: "guest",
          firstName: "Софья",
          lastName: "Ситниченко",
        }),
      ],
    });

    const messages = getRoomSystemMessages(previousRoom, nextRoom).map((message) => message.text);

    expect(messages).toContain("Софья Ситниченко присоединился к комнате.");
    expect(messages).not.toContain("Софья Ситниченко присоединилась к комнате.");
  });

  it("переводит сохранённые русские системные сообщения для EN-интерфейса", () => {
    languageStore.reset({ language: "EN" });

    expect(normalizeRenderedSystemMessageText("Софья Ситниченко присоединилась к комнате.")).toBe(
      "Софья Ситниченко joined the room.",
    );
    expect(
      normalizeRenderedSystemMessageText('Сергей Шульгиненко поставил статус "Готов" (1/2).'),
    ).toBe('Сергей Шульгиненко is now "Ready" (1/2).');
    expect(normalizeRenderedSystemMessageText("Игра начинается.")).toBe("Game starting.");
    expect(normalizeRenderedSystemMessageText('Тип игры изменен: "На рейтинг".')).toBe(
      'Game type changed: "Ranked".',
    );
  });

  it("подавляет сообщение выхода после обработанного disconnect/remove", () => {
    const previousRoom = createRoom({
      players: [createPlayer("1"), createPlayer("2", { firstName: "Анна" })],
    });
    const nextRoom = createRoom({ players: [createPlayer("1")] });

    const messages = getRoomSystemMessages(previousRoom, nextRoom, {
      consumeDisconnectRemoval: () => true,
    });

    expect(messages).toHaveLength(0);
  });

  it("не пишет изменения готовности в публичном лобби", () => {
    const previousRoom = createRoom({
      isPublicLobby: true,
      players: [createPlayer("1", { isReady: false })],
    });
    const nextRoom = createRoom({
      isPublicLobby: true,
      players: [createPlayer("1", { isReady: true })],
    });

    const messages = getRoomSystemMessages(previousRoom, nextRoom).map((message) => message.text);

    expect(messages).not.toContain('Игрок 1 поставил статус "Готов" (1/1).');
  });
});
