/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { renderGamesPage, type RenderGamesPageOptions } from "./page-render";

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Room",
    ...patch,
  } as GameRoom;
}

function createOptions(overrides: Partial<RenderGamesPageOptions> = {}): RenderGamesPageOptions {
  const room = createRoom();
  return {
    hasSessionUser: vi.fn(() => true),
    renderGuestPage: vi.fn(async () => "<main>Feed</main>"),
    isCatalogRoute: vi.fn(() => false),
    resetGamesState: vi.fn(),
    replaceGamesState: vi.fn(),
    getRequestedRoomId: vi.fn(() => "room-1"),
    getRequestedPublicInviteCode: vi.fn(() => "ABC123"),
    renderPageShell: vi.fn(() => "<main>Games</main>"),
    getRoom: vi.fn(async () => room),
    joinRoom: vi.fn(async () => room),
    hydrateRoom: vi.fn(async (nextRoom: GameRoom) => nextRoom),
    getStoredRoomSnapshot: vi.fn(() => null),
    getStoredRoomAccess: vi.fn(() => null),
    allowRoomAccessRecovery: vi.fn(),
    rememberRoomTitle: vi.fn(),
    rememberRoomAccess: vi.fn(),
    canRecoverRoomAccess: vi.fn(() => false),
    recoverRoomAccess: vi.fn(async () => null),
    replaceWithGamesMenuRoute: vi.fn(),
    ...overrides,
  };
}

describe("games page render action", () => {
  it("рендерит guest-page без загрузки игр для гостя", async () => {
    const options = createOptions({
      hasSessionUser: () => false,
    });

    await expect(renderGamesPage(undefined, undefined, options)).resolves.toBe("<main>Feed</main>");

    expect(options.renderGuestPage).toHaveBeenCalledTimes(1);
    expect(options.replaceGamesState).not.toHaveBeenCalled();
  });

  it("сбрасывает состояние для catalog route", async () => {
    const options = createOptions({
      isCatalogRoute: () => true,
    });

    await expect(renderGamesPage(undefined, undefined, options)).resolves.toBe(
      "<main>Games</main>",
    );

    expect(options.resetGamesState).toHaveBeenCalledTimes(1);
    expect(options.replaceGamesState).not.toHaveBeenCalled();
  });

  it("загружает initial state для route комнаты", async () => {
    const options = createOptions();

    await renderGamesPage({ roomId: "room-1" }, undefined, options);

    expect(options.getRequestedRoomId).toHaveBeenCalledWith({ roomId: "room-1" });
    expect(options.getRoom).toHaveBeenCalledWith("room-1", undefined);
    expect(options.replaceGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "room-1",
        room: expect.objectContaining({ id: "room-1" }),
      }),
    );
    expect(options.renderPageShell).toHaveBeenCalledTimes(1);
  });

  it("для публичной ссылки авторизованного игрока вызывает обычный join по inviteCode", async () => {
    const options = createOptions({
      isPublicRoute: vi.fn(() => true),
    });

    await renderGamesPage({ inviteCode: "ABC123" }, undefined, options);

    expect(options.getRequestedPublicInviteCode).toHaveBeenCalledWith({ inviteCode: "ABC123" });
    expect(options.joinRoom).toHaveBeenCalledWith({ inviteCode: "ABC123" });
    expect(options.replaceGamesState).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "room-1",
        room: expect.objectContaining({ id: "room-1" }),
      }),
    );
    expect(options.renderGuestPage).not.toHaveBeenCalled();
  });
});
