/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import {
  handleGamesRoomActionsClick,
  type HandleGamesRoomActionsClickOptions,
} from "./room-actions";

const room = {
  id: "room-1",
  isRanked: false,
} as GameRoom;

/** Создаёт options для тестов room-action событий. */
function createOptions(overrides: Partial<HandleGamesRoomActionsClickOptions> = {}) {
  const options: HandleGamesRoomActionsClickOptions = {
    room,
    currentPlayerReady: false,
    handlePauseRoom: vi.fn().mockResolvedValue(undefined),
    handleForceResumeRoom: vi.fn().mockResolvedValue(undefined),
    handleRoomRankedToggle: vi.fn().mockResolvedValue(undefined),
    handleReadyToggle: vi.fn().mockResolvedValue(undefined),
    handleReplayToggle: vi.fn().mockResolvedValue(undefined),
    setGamesState: vi.fn(),
    getErrorMessage: (error, fallback) => (error instanceof Error ? error.message : fallback),
    ...overrides,
  };
  return options;
}

describe("games room action events", () => {
  it("запускает pause action", async () => {
    const button = document.createElement("button");
    button.dataset.gamesPauseRoom = "";
    const options = createOptions();

    expect(handleGamesRoomActionsClick(new MouseEvent("click"), button, options)).toBe(true);
    await Promise.resolve();

    expect(options.handlePauseRoom).toHaveBeenCalled();
  });

  it("переключает ranked mode", async () => {
    const label = document.createElement("label");
    label.dataset.gamesRoomRankedToggle = "true";
    const options = createOptions();

    handleGamesRoomActionsClick(new MouseEvent("click"), label, options);
    await Promise.resolve();

    expect(options.handleRoomRankedToggle).toHaveBeenCalledWith(true);
  });

  it("не отправляет ready action, если состояние не изменилось", () => {
    const label = document.createElement("label");
    label.dataset.gamesReadyToggle = "true";
    const options = createOptions({ currentPlayerReady: true });

    expect(handleGamesRoomActionsClick(new MouseEvent("click"), label, options)).toBe(true);
    expect(options.handleReadyToggle).not.toHaveBeenCalled();
  });

  it("пишет ошибку action в footer", async () => {
    const button = document.createElement("button");
    button.dataset.gamesForceResume = "";
    const options = createOptions({
      handleForceResumeRoom: vi.fn().mockRejectedValue(new Error("resume failed")),
    });

    handleGamesRoomActionsClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.setGamesState).toHaveBeenCalledWith({
      loading: false,
      message: "",
      error: "resume failed",
      errorTarget: "footer",
    });
  });
});
