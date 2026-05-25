/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import {
  handleGamesConfirmModalsClick,
  type HandleGamesConfirmModalsClickOptions,
} from "./confirm-modals";

/** Создаёт options для тестов confirm-модалок комнаты. */
function createOptions(overrides: Partial<HandleGamesConfirmModalsClickOptions> = {}) {
  const options: HandleGamesConfirmModalsClickOptions = {
    state: {
      kickConfirmProfileId: "player-1",
      adminConfirmProfileId: "player-2",
    },
    handleDisbandRoom: vi.fn().mockResolvedValue(undefined),
    handleStartRoom: vi.fn().mockResolvedValue(undefined),
    handleExitGameToMenu: vi.fn().mockResolvedValue(undefined),
    handleKickPlayer: vi.fn().mockResolvedValue(undefined),
    handleAssignAdmin: vi.fn().mockResolvedValue(undefined),
    setGamesState: vi.fn(),
    setGamesOverlayState: vi.fn(),
    getErrorMessage: (error, fallback) => (error instanceof Error ? error.message : fallback),
    ...overrides,
  };
  return options;
}

describe("games confirm modal events", () => {
  it("открывает confirm роспуска комнаты", () => {
    const button = document.createElement("button");
    button.dataset.gamesDisbandOpen = "";
    const options = createOptions();

    expect(handleGamesConfirmModalsClick(new MouseEvent("click"), button, options)).toBe(true);

    expect(options.setGamesState).toHaveBeenCalledWith({
      disbandConfirmOpen: true,
      startConfirmOpen: false,
      leaveConfirmOpen: false,
      reportConfirmQuestionKey: "",
      kickConfirmProfileId: "",
      adminConfirmProfileId: "",
      playerMenuProfileId: "",
      message: "",
      error: "",
    });
  });

  it("открывает confirm выхода через overlay-state", () => {
    const button = document.createElement("button");
    button.dataset.gamesLeaveOpen = "";
    const options = createOptions();

    handleGamesConfirmModalsClick(new MouseEvent("click"), button, options);

    expect(options.setGamesOverlayState).toHaveBeenCalledWith({
      leaveConfirmOpen: true,
      startConfirmOpen: false,
      disbandConfirmOpen: false,
      kickConfirmProfileId: "",
      message: "",
      error: "",
    });
  });

  it("открывает confirm удаления игрока", () => {
    const button = document.createElement("button");
    button.dataset.gamesKickPlayer = "player-3";
    const options = createOptions();

    handleGamesConfirmModalsClick(new MouseEvent("click"), button, options);

    expect(options.setGamesState).toHaveBeenCalledWith({
      kickConfirmProfileId: "player-3",
      playerMenuProfileId: "",
      disbandConfirmOpen: false,
      startConfirmOpen: false,
      leaveConfirmOpen: false,
      adminConfirmProfileId: "",
      message: "",
      error: "",
    });
  });

  it("закрывает start confirm по overlay", () => {
    const modal = document.createElement("div");
    modal.dataset.gamesStartModal = "";
    const options = createOptions();

    handleGamesConfirmModalsClick(new MouseEvent("click"), modal, options);

    expect(options.setGamesState).toHaveBeenCalledWith({ startConfirmOpen: false });
  });

  it("запускает kick action с текущим profileId", async () => {
    const button = document.createElement("button");
    button.dataset.gamesKickConfirm = "";
    const options = createOptions();

    handleGamesConfirmModalsClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.handleKickPlayer).toHaveBeenCalledWith("player-1");
  });

  it("пишет ошибку start action в footer", async () => {
    const button = document.createElement("button");
    button.dataset.gamesStartConfirm = "";
    const options = createOptions({
      handleStartRoom: vi.fn().mockRejectedValue(new Error("start failed")),
    });

    handleGamesConfirmModalsClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.setGamesState).toHaveBeenCalledWith({
      loading: false,
      startConfirmOpen: false,
      message: "",
      error: "start failed",
      errorTarget: "footer",
    });
  });
});
