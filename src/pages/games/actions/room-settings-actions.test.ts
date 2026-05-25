/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { createRoomSettingsActions } from "./room-settings-actions";
import {
  removeRoomPasswordAction,
  renameRoomTitleFromFormAction,
  updateRoomPasswordFromFormAction,
} from "./room-settings-forms";

vi.mock("./room-settings-forms", () => ({
  removeRoomPasswordAction: vi.fn(),
  renameRoomTitleFromFormAction: vi.fn(),
  updateRoomPasswordFromFormAction: vi.fn(),
}));

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    hasPassword: true,
    password: "secret",
    ...patch,
  } as GameRoom;
}

function createOptions(room = createRoom()) {
  return {
    getRoom: vi.fn(() => room),
    getCurrentMessages: vi.fn(() => [] as GameRoomMessage[]),
    getPasswordVisible: vi.fn(() => false),
    getSystemMessages: vi.fn(() => [] as GameRoomMessage[]),
    mergeMessages: vi.fn((existing: GameRoomMessage[], incoming: GameRoomMessage[]) => [
      ...existing,
      ...incoming,
    ]),
    rememberRoomTitle: vi.fn(),
    refreshCurrentRoom: vi.fn().mockResolvedValue(undefined),
    showToast: vi.fn(),
    setGamesState: vi.fn(),
  };
}

describe("room settings actions facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(removeRoomPasswordAction).mockResolvedValue(undefined);
    vi.mocked(renameRoomTitleFromFormAction).mockResolvedValue(undefined);
    vi.mocked(updateRoomPasswordFromFormAction).mockResolvedValue(undefined);
  });

  it("собирает rename-room options", async () => {
    const options = createOptions();
    const actions = createRoomSettingsActions(options);
    const form = document.createElement("form");

    await actions.handleRenameRoomTitle(form);

    expect(renameRoomTitleFromFormAction).toHaveBeenCalledWith(
      form,
      expect.objectContaining({
        room: options.getRoom(),
        currentMessages: [],
        rememberRoomTitle: options.rememberRoomTitle,
      }),
    );
  });

  it("собирает password actions с общим refresh", async () => {
    const options = createOptions();
    const actions = createRoomSettingsActions(options);
    const form = document.createElement("form");

    await actions.handlePasswordForm(form);
    await actions.handleRemovePassword();

    expect(updateRoomPasswordFromFormAction).toHaveBeenCalledWith(
      form,
      expect.objectContaining({
        room: options.getRoom(),
        refreshCurrentRoom: options.refreshCurrentRoom,
      }),
    );
    expect(removeRoomPasswordAction).toHaveBeenCalledWith(
      expect.objectContaining({
        room: options.getRoom(),
        showToast: options.showToast,
      }),
    );
  });

  it("переключает видимость пароля через state patch", async () => {
    const options = createOptions();
    const actions = createRoomSettingsActions(options);

    await actions.handleShowPassword();

    expect(options.setGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordVisible: true,
        passwordMenuOpen: false,
      }),
    );
  });
});
