/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import {
  handleGamesQuestionReportClick,
  type HandleGamesQuestionReportClickOptions,
} from "./question-report";

/** Создаёт options для тестов click-событий жалобы на вопрос. */
function createOptions(overrides: Partial<HandleGamesQuestionReportClickOptions> = {}) {
  const options: HandleGamesQuestionReportClickOptions = {
    state: {
      reportConfirmQuestionKey: "room-1:q-1",
    },
    closeGamesMenus: () => ({
      playerMenuProfileId: "",
      questionMenuKey: "",
      titleMenuOpen: false,
      passwordMenuOpen: false,
    }),
    handleReportQuestion: vi.fn().mockResolvedValue(undefined),
    handleReportQuestionError: vi.fn(),
    setQuestionReportOverlayState: vi.fn(),
    ...overrides,
  };
  return options;
}

describe("games question report events", () => {
  it("открывает confirm-модалку жалобы", () => {
    const button = document.createElement("button");
    button.dataset.gamesReportQuestion = "room-1:q-2";
    const options = createOptions();

    expect(handleGamesQuestionReportClick(new MouseEvent("click"), button, options)).toBe(true);

    expect(options.setQuestionReportOverlayState).toHaveBeenCalledWith({
      playerMenuProfileId: "",
      questionMenuKey: "",
      titleMenuOpen: false,
      passwordMenuOpen: false,
      reportConfirmQuestionKey: "room-1:q-2",
      disbandConfirmOpen: false,
      startConfirmOpen: false,
      leaveConfirmOpen: false,
      kickConfirmProfileId: "",
      adminConfirmProfileId: "",
      message: "",
      error: "",
    });
  });

  it("закрывает confirm-модалку жалобы по overlay", () => {
    const modal = document.createElement("div");
    modal.dataset.gamesReportModal = "";
    const options = createOptions();

    handleGamesQuestionReportClick(new MouseEvent("click"), modal, options);

    expect(options.setQuestionReportOverlayState).toHaveBeenCalledWith({
      reportConfirmQuestionKey: "",
    });
  });

  it("отправляет жалобу с текущим ключом вопроса", async () => {
    const button = document.createElement("button");
    button.dataset.gamesReportConfirm = "";
    const options = createOptions();

    handleGamesQuestionReportClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.setQuestionReportOverlayState).toHaveBeenCalledWith({
      reportConfirmQuestionKey: "",
    });
    expect(options.handleReportQuestion).toHaveBeenCalledWith("room-1:q-1");
  });

  it("передает ошибку отправки жалобы в page action слой", async () => {
    const button = document.createElement("button");
    button.dataset.gamesReportConfirm = "";
    const error = new Error("report failed");
    const options = createOptions({
      handleReportQuestion: vi.fn().mockRejectedValue(error),
    });

    handleGamesQuestionReportClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.handleReportQuestionError).toHaveBeenCalledWith("room-1:q-1", error);
  });
});
