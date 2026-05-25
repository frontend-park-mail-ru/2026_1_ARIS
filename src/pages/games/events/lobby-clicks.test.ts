/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { handleGamesLobbyClick, type HandleGamesLobbyClickOptions } from "./lobby-clicks";

/** Создаёт options для тестов lobby click событий. */
function createOptions(overrides: Partial<HandleGamesLobbyClickOptions> = {}) {
  const options: HandleGamesLobbyClickOptions = {
    roomsAutoRefreshEnabled: false,
    messageReturnRoomLabel: "",
    selectLobbyMode: vi.fn().mockResolvedValue(undefined),
    loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
    loadLeaderboard: vi.fn().mockResolvedValue(undefined),
    handleBackToRooms: vi.fn().mockResolvedValue(undefined),
    handleReturnToRoom: vi.fn().mockResolvedValue(undefined),
    setGamesState: vi.fn(),
    showAppToast: vi.fn(),
    getErrorMessage: (error, fallback) => (error instanceof Error ? error.message : fallback),
    getVoluntaryLeaveMessage: () => "Вы вышли из комнаты.",
    getVoluntaryLeaveReturnLabel: () => "Вернуться?",
    ...overrides,
  };
  return options;
}

describe("games lobby click events", () => {
  it("выбирает режим лобби", async () => {
    const button = document.createElement("button");
    button.dataset.gamesLobbyMode = "rooms";
    const options = createOptions();

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    expect(handleGamesLobbyClick(event, button, options)).toBe(true);
    await Promise.resolve();

    expect(event.defaultPrevented).toBe(true);
    expect(options.selectLobbyMode).toHaveBeenCalledWith("rooms");
  });

  it("включает автообновление и запускает тихую загрузку комнат", () => {
    const button = document.createElement("button");
    button.dataset.gamesRoomsAutoRefresh = "true";
    const options = createOptions();

    expect(handleGamesLobbyClick(new MouseEvent("click"), button, options)).toBe(true);

    expect(options.setGamesState).toHaveBeenCalledWith(
      expect.objectContaining({ roomsAutoRefreshEnabled: true }),
    );
    expect(options.loadWaitingRooms).toHaveBeenCalledWith({
      silent: true,
      preserveMessage: true,
    });
  });

  it("восстанавливает return-state при ошибке возврата в комнату", async () => {
    const button = document.createElement("button");
    button.dataset.gamesReturnRoom = "room-1";
    const options = createOptions({
      handleReturnToRoom: vi.fn().mockRejectedValue(new Error("failed")),
      messageReturnRoomLabel: "Старый label",
    });

    handleGamesLobbyClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.showAppToast).toHaveBeenCalledWith("Произошла непредвиденная ошибка");
    expect(options.setGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Вы вышли из комнаты.",
        messageReturnRoomId: "room-1",
        messageReturnRoomLabel: "Старый label",
      }),
    );
  });
});
