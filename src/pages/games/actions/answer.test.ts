import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { submitGameAnswer } from "../../../api/games";
import { submitRoomAnswer, submitRoomAnswerValue } from "./answer";

vi.mock("../../../api/games", () => ({
  submitGameAnswer: vi.fn(),
}));

const room = {
  id: "room-1",
} as GameRoom;

describe("submitRoomAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("фиксирует ответ локально после WebSocket отправки", async () => {
    const acceptCurrentAnswerLocally = vi.fn();

    await submitRoomAnswer({
      room,
      answer: 42,
      sendAnswerBySocket: vi.fn(() => true),
      acceptCurrentAnswerLocally,
    });

    expect(submitGameAnswer).not.toHaveBeenCalled();
    expect(acceptCurrentAnswerLocally).toHaveBeenCalledWith(42);
  });

  it("использует API fallback, если WebSocket недоступен", async () => {
    const nextRoom = { id: "room-1" } as GameRoom;
    vi.mocked(submitGameAnswer).mockResolvedValue(nextRoom);
    const acceptCurrentAnswerLocally = vi.fn();

    await submitRoomAnswer({
      room,
      answer: 42,
      sendAnswerBySocket: vi.fn(() => false),
      acceptCurrentAnswerLocally,
    });

    expect(submitGameAnswer).toHaveBeenCalledWith("room-1", 42);
    expect(acceptCurrentAnswerLocally).toHaveBeenCalledWith(42, nextRoom);
  });

  it("фиксирует ответ без комнаты, если API вернул пустой результат", async () => {
    vi.mocked(submitGameAnswer).mockResolvedValue(null);
    const acceptCurrentAnswerLocally = vi.fn();

    await submitRoomAnswer({
      room,
      answer: 42,
      sendAnswerBySocket: vi.fn(() => false),
      acceptCurrentAnswerLocally,
    });

    expect(acceptCurrentAnswerLocally).toHaveBeenCalledWith(42);
  });

  it("парсит значение формы и отправляет ответ", async () => {
    const acceptCurrentAnswerLocally = vi.fn();

    await submitRoomAnswerValue({
      room,
      value: "42,5",
      sendAnswerBySocket: vi.fn(() => true),
      acceptCurrentAnswerLocally,
      setGamesState: vi.fn(),
    });

    expect(acceptCurrentAnswerLocally).toHaveBeenCalledWith(42.5);
  });

  it("пишет ошибку для нечислового ответа", async () => {
    const setGamesState = vi.fn();
    const sendAnswerBySocket = vi.fn(() => true);

    await submitRoomAnswerValue({
      room,
      value: "oops",
      sendAnswerBySocket,
      acceptCurrentAnswerLocally: vi.fn(),
      setGamesState,
    });

    expect(sendAnswerBySocket).not.toHaveBeenCalled();
    expect(setGamesState).toHaveBeenCalledWith({
      error: "Введите числовой ответ.",
      errorTarget: "answer",
      message: "",
    });
  });
});
