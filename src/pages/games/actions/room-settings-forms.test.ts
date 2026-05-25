/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { renameRoomTitle, updateRoomPassword } from "./room-settings";
import {
  removeRoomPasswordAction,
  renameRoomTitleFromFormAction,
  updateRoomPasswordFromFormAction,
} from "./room-settings-forms";

vi.mock("./room-settings", () => ({
  renameRoomTitle: vi.fn(),
  updateRoomPassword: vi.fn(),
}));

/** Создаёт зависимости формы переименования комнаты. */
function createRenameOptions() {
  return {
    room: { id: "room-1" } as GameRoom,
    currentMessages: [] as GameRoomMessage[],
    getSystemMessages: vi.fn(() => []),
    mergeMessages: vi.fn((existing, incoming) => [...existing, ...incoming]),
    rememberRoomTitle: vi.fn(),
    setGamesState: vi.fn(),
  };
}

/** Создаёт зависимости формы пароля комнаты. */
function createPasswordOptions() {
  return {
    room: { id: "room-1" } as GameRoom,
    refreshCurrentRoom: vi.fn().mockResolvedValue(undefined),
    showToast: vi.fn(),
    setGamesState: vi.fn(),
  };
}

describe("games room settings form actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("валидирует и передаёт новое название комнаты", async () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <label class="games-field">
        <input name="title" value="New room">
        <span data-games-title-error></span>
      </label>
    `;
    const options = createRenameOptions();

    await renameRoomTitleFromFormAction(form, options);

    expect(renameRoomTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New room",
        room: options.room,
      }),
    );
  });

  it("пишет ошибку пустого пароля", async () => {
    const form = document.createElement("form");
    form.innerHTML = `<input name="password" value="">`;
    const options = createPasswordOptions();

    await updateRoomPasswordFromFormAction(form, options);

    expect(updateRoomPassword).not.toHaveBeenCalled();
    expect(options.setGamesState).toHaveBeenCalledWith({
      message: "",
      error: "Введите пароль.",
      errorTarget: "password",
    });
  });

  it("обновляет и удаляет пароль через общий action", async () => {
    const form = document.createElement("form");
    form.innerHTML = `<input name="password" value="secret">`;
    const options = createPasswordOptions();

    await updateRoomPasswordFromFormAction(form, options);
    await removeRoomPasswordAction(options);

    expect(updateRoomPassword).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ password: "secret", successMessage: "Пароль комнаты обновлен" }),
    );
    expect(updateRoomPassword).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ password: "", successMessage: "Пароль комнаты убран" }),
    );
  });
});
