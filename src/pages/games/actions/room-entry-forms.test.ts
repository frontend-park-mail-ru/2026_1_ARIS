/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createRoomAction, joinListedRoomAction, joinRoomByCodeAction } from "./room-entry";
import {
  createRoomFromFormAction,
  joinListedRoomFromFormAction,
  joinRoomByCodeFromFormAction,
} from "./room-entry-forms";

vi.mock("./room-entry", () => ({
  createRoomAction: vi.fn(),
  joinListedRoomAction: vi.fn(),
  joinRoomByCodeAction: vi.fn(),
}));

/** Создаёт базовые зависимости форм входа в комнату. */
function createBaseOptions() {
  return {
    rememberRoomAccess: vi.fn(),
    navigateToRoom: vi.fn(),
    navigateToGamesMenu: vi.fn(),
    showRoomFullMessage: vi.fn(),
    loadWaitingRooms: vi.fn().mockResolvedValue(undefined),
    setGamesState: vi.fn(),
    setGamesOverlayState: vi.fn(),
  };
}

describe("games room entry form actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("собирает payload создания комнаты из формы", async () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <label class="games-field"><input name="title" value="Room"><span data-games-title-error></span></label>
      <label class="games-field"><input name="maxPlayers" value="3" data-games-number-field><span data-games-field-error></span></label>
      <label class="games-field"><input name="questionCount" value="5" data-games-number-field><span data-games-field-error></span></label>
      <label class="games-field"><input name="answerTimeoutSec" value="30" data-games-number-field><span data-games-field-error></span></label>
      <input name="password" value="secret">
      <input type="checkbox" name="isRanked">
    `;

    await createRoomFromFormAction(form, {
      hydrateRoom: vi.fn(async (room) => room),
      rememberRoomTitle: vi.fn(),
      rememberRoomAccess: vi.fn(),
      navigateToRoom: vi.fn(),
      setGamesState: vi.fn(),
    });

    expect(createRoomAction).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Room",
        password: "secret",
        payload: expect.objectContaining({
          title: "Room",
          maxPlayers: 3,
          questionCount: 5,
          answerTimeoutSec: 30,
        }),
      }),
    );
  });

  it("собирает payload входа по invite-коду", async () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <label class="games-field"><input name="inviteCode" value="abc123"><span data-games-invite-code-error></span></label>
      <input name="password" value="secret">
    `;

    await joinRoomByCodeFromFormAction(form, createBaseOptions());

    expect(joinRoomByCodeAction).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteCode: "ABC123",
        password: "secret",
        payload: { inviteCode: "ABC123", password: "secret" },
      }),
    );
  });

  it("собирает payload входа в комнату из списка", async () => {
    const room = { id: "room-1" } as GameRoom;
    const form = document.createElement("form");
    form.innerHTML = `
      <input name="roomId" value="room-1">
      <input name="inviteCode" value="abc123">
      <input name="password" value="secret">
    `;

    await joinListedRoomFromFormAction(form, {
      ...createBaseOptions(),
      rooms: [room],
      shouldBlockFullRoomJoin: vi.fn(() => false),
    });

    expect(joinListedRoomAction).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "room-1",
        inviteCode: "ABC123",
        password: "secret",
        listedRoom: room,
        payload: { roomId: "room-1", inviteCode: "ABC123", password: "secret" },
      }),
    );
  });
});
