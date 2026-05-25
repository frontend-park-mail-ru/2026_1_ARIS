/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { handleGamesCopyClick, type HandleGamesCopyClickOptions } from "./copy-clicks";

/** Создаёт options для тестов copy-click событий. */
function createOptions(overrides: Partial<HandleGamesCopyClickOptions> = {}) {
  const options: HandleGamesCopyClickOptions = {
    handleCopyInviteCode: vi.fn().mockResolvedValue(undefined),
    handleCopyRoomTitle: vi.fn().mockResolvedValue(undefined),
    setGamesState: vi.fn(),
    ...overrides,
  };
  return options;
}

describe("games copy click events", () => {
  it("копирует invite-код", async () => {
    const button = document.createElement("button");
    button.dataset.gamesCopyInvite = "ABC123";
    const options = createOptions();

    expect(handleGamesCopyClick(new MouseEvent("click"), button, options)).toBe(true);
    await Promise.resolve();

    expect(options.handleCopyInviteCode).toHaveBeenCalledWith("ABC123");
  });

  it("копирует название комнаты", async () => {
    const button = document.createElement("button");
    button.dataset.gamesCopyRoomTitle = "Room";
    const options = createOptions();

    handleGamesCopyClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.handleCopyRoomTitle).toHaveBeenCalledWith("Room");
  });

  it("показывает ошибку копирования invite-кода", async () => {
    const button = document.createElement("button");
    button.dataset.gamesCopyInvite = "ABC123";
    const options = createOptions({
      handleCopyInviteCode: vi.fn().mockRejectedValue(new Error("copy failed")),
    });

    handleGamesCopyClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.setGamesState).toHaveBeenCalledWith({
      message: "",
      error: "Не удалось скопировать код приглашения.",
    });
  });
});
