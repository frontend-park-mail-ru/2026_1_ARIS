/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { handleGamesRoomMenusClick, type HandleGamesRoomMenusClickOptions } from "./room-menus";

/** Создаёт options для тестов меню комнаты. */
function createOptions(overrides: Partial<HandleGamesRoomMenusClickOptions> = {}) {
  const options: HandleGamesRoomMenusClickOptions = {
    state: {
      room: null,
      playerMenuProfileId: "",
      questionMenuKey: "",
      titleMenuOpen: false,
      passwordMenuOpen: false,
    },
    reportedQuestionKeys: new Set(),
    reportingQuestionKeys: new Set(),
    getFloatingMenuAnchor: vi.fn(() => ({ floatingMenuAnchorX: 10, floatingMenuAnchorY: 20 })),
    closeGamesMenus: () => ({
      playerMenuProfileId: "",
      questionMenuKey: "",
      titleMenuOpen: false,
      passwordMenuOpen: false,
    }),
    getRoomTitleValue: () => "Room",
    handleCopyQuestionAnswer: vi.fn().mockResolvedValue(undefined),
    handleCopyRoomTitle: vi.fn().mockResolvedValue(undefined),
    handleShowPassword: vi.fn().mockResolvedValue(undefined),
    handleRemovePassword: vi.fn().mockResolvedValue(undefined),
    setGamesState: vi.fn(),
    setGamesOverlayState: vi.fn(),
    showAppToast: vi.fn(),
    getErrorMessage: (error, fallback) => (error instanceof Error ? error.message : fallback),
    ...overrides,
  };
  return options;
}

describe("games room menu events", () => {
  it("переключает player floating menu", () => {
    const button = document.createElement("button");
    button.dataset.gamesPlayerMenuToggle = "player-1";
    const options = createOptions();

    expect(handleGamesRoomMenusClick(new MouseEvent("click"), button, options)).toBe(true);

    expect(options.setGamesState).toHaveBeenCalledWith({
      playerMenuProfileId: "player-1",
      floatingMenuAnchorX: 10,
      floatingMenuAnchorY: 20,
      questionMenuKey: "",
      titleMenuOpen: false,
      passwordMenuOpen: false,
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("открывает report confirm из floating menu", () => {
    const button = document.createElement("button");
    button.dataset.floatingMenuAction = "question-report:q-1";
    const options = createOptions();

    handleGamesRoomMenusClick(new MouseEvent("click"), button, options);

    expect(options.setGamesOverlayState).toHaveBeenCalledWith({
      playerMenuProfileId: "",
      questionMenuKey: "",
      titleMenuOpen: false,
      passwordMenuOpen: false,
      reportConfirmQuestionKey: "q-1",
      disbandConfirmOpen: false,
      startConfirmOpen: false,
      leaveConfirmOpen: false,
      kickConfirmProfileId: "",
      adminConfirmProfileId: "",
      message: "",
      error: "",
    });
  });

  it("закрывает меню для уже отправленной жалобы", () => {
    const button = document.createElement("button");
    button.dataset.floatingMenuAction = "question-report:q-1";
    const options = createOptions({
      reportedQuestionKeys: new Set(["q-1"]),
    });

    handleGamesRoomMenusClick(new MouseEvent("click"), button, options);

    expect(options.setGamesState).toHaveBeenCalledWith({
      playerMenuProfileId: "",
      questionMenuKey: "",
      titleMenuOpen: false,
      passwordMenuOpen: false,
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("копирует название комнаты из floating menu", async () => {
    const button = document.createElement("button");
    button.dataset.floatingMenuAction = "title-copy";
    const options = createOptions();

    handleGamesRoomMenusClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.handleCopyRoomTitle).toHaveBeenCalledWith("Room");
  });

  it("открывает password-модалку из action", () => {
    const button = document.createElement("button");
    button.dataset.floatingMenuAction = "password-change";
    const options = createOptions();

    handleGamesRoomMenusClick(new MouseEvent("click"), button, options);

    expect(options.setGamesState).toHaveBeenCalledWith({
      playerMenuProfileId: "",
      questionMenuKey: "",
      titleMenuOpen: false,
      passwordMenuOpen: false,
      passwordModalMode: "change",
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("открывает confirm удаления игрока из action", () => {
    const button = document.createElement("button");
    button.dataset.floatingMenuAction = "player-kick:player-1";
    const options = createOptions();

    handleGamesRoomMenusClick(new MouseEvent("click"), button, options);

    expect(options.setGamesState).toHaveBeenCalledWith({
      playerMenuProfileId: "",
      questionMenuKey: "",
      titleMenuOpen: false,
      passwordMenuOpen: false,
      kickConfirmProfileId: "player-1",
      disbandConfirmOpen: false,
      startConfirmOpen: false,
      leaveConfirmOpen: false,
      adminConfirmProfileId: "",
      message: "",
      error: "",
    });
  });

  it("пишет ошибку удаления пароля в password target", async () => {
    const button = document.createElement("button");
    button.dataset.gamesPasswordRemoveConfirm = "";
    const options = createOptions({
      handleRemovePassword: vi.fn().mockRejectedValue(new Error("remove failed")),
    });

    handleGamesRoomMenusClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.setGamesState).toHaveBeenCalledWith({
      loading: false,
      message: "",
      error: "remove failed",
      errorTarget: "password",
    });
  });
});
