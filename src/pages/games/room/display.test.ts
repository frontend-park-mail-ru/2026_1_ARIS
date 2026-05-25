import { describe, expect, it } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createGameRoomDisplayService } from "./display";

const room: GameRoom = {
  id: "room-1",
  title: "Room title",
  inviteCode: "123456",
  gameType: "number_duel",
  status: "waiting",
  createdByProfileId: "1",
  maxPlayers: 4,
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

describe("game room display", () => {
  it("кэширует последнее непустое название комнаты", () => {
    const service = createGameRoomDisplayService();

    expect(service.getRoomTitleValue(room)).toBe("Room title");
    expect(service.getRoomTitleValue({ ...room, title: "" })).toBe("Room title");
  });

  it("возвращает отображаемое значение пароля", () => {
    const service = createGameRoomDisplayService();

    expect(service.getRoomPasswordDisplayValue({ ...room, hasPassword: false }, false)).toBe(
      "Без пароля",
    );
    expect(service.getRoomPasswordDisplayValue(room, true)).toBe("secret");
    expect(service.getRoomPasswordDisplayValue(room, false)).toBe("********");
  });

  it("показывает fallback для пустого полученного пароля", () => {
    const service = createGameRoomDisplayService();

    expect(service.getRoomPasswordDisplayValue({ ...room, password: "" }, true)).toBe(
      "Пароль не получен",
    );
  });
});
