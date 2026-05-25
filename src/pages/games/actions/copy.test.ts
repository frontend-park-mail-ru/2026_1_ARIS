import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { copyInviteCodeAction, copyQuestionAnswerAction, copyRoomTitleAction } from "./copy";

describe("games copy actions", () => {
  it("копирует invite-код и показывает toast", async () => {
    const copyText = vi.fn().mockResolvedValue(undefined);
    const showToast = vi.fn();

    await copyInviteCodeAction("ABC123", { copyText, showToast });

    expect(copyText).toHaveBeenCalledWith("ABC123");
    expect(showToast).toHaveBeenCalledWith("Код приглашения скопирован в буфер обмена");
  });

  it("копирует название комнаты и закрывает title menu", async () => {
    const copyText = vi.fn().mockResolvedValue(undefined);
    const setGamesState = vi.fn();
    const showToast = vi.fn();

    await copyRoomTitleAction("Комната", { copyText, setGamesState, showToast });

    expect(copyText).toHaveBeenCalledWith("Комната");
    expect(setGamesState).toHaveBeenCalledWith({
      titleMenuOpen: false,
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("копирует вопрос и ответ из комнаты", async () => {
    const room = { id: "room-1" } as GameRoom;
    const question = { id: "q1", text: "2 + 2?", correctAnswer: 4 };
    const copyText = vi.fn().mockResolvedValue(undefined);
    const setGamesState = vi.fn();
    const showToast = vi.fn();

    await copyQuestionAnswerAction("q1", {
      room,
      findQuestion: vi.fn(() => question as never),
      getQuestionClipboardText: vi.fn(() => "2 + 2? Ответ: 4"),
      closeMenus: () => ({ questionMenuKey: "" }),
      copyText,
      setGamesState,
      showToast,
    });

    expect(copyText).toHaveBeenCalledWith("2 + 2? Ответ: 4");
    expect(setGamesState).toHaveBeenCalledWith({
      questionMenuKey: "",
      message: "",
      error: "",
      errorTarget: "",
    });
    expect(showToast).toHaveBeenCalledWith("Вопрос и ответ скопированы в буфер обмена");
  });
});
