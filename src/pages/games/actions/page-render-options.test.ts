import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createGamesPageRenderOptions } from "./page-render-options";

/** Создаёт минимальные render-опции страницы игр для тестов. */
function createParams() {
  return {
    hasSessionUser: vi.fn(() => true),
    isCatalogRoute: vi.fn(() => true),
    resetGamesState: vi.fn(),
    replaceGamesState: vi.fn(),
    getRequestedRoomId: vi.fn(() => ""),
    renderPageShell: vi.fn(() => "<main></main>"),
    getRoom: vi.fn(async () => ({ id: "room-1" }) as GameRoom),
    joinRoom: vi.fn(async () => ({ id: "room-1" }) as GameRoom),
    hydrateRoom: vi.fn(async (room: GameRoom) => room),
    getStoredRoomSnapshot: vi.fn(() => null),
    getStoredRoomAccess: vi.fn(() => null),
    allowRoomAccessRecovery: vi.fn(),
    rememberRoomTitle: vi.fn(),
    rememberRoomAccess: vi.fn(),
    canRecoverRoomAccess: vi.fn(() => false),
    recoverRoomAccess: vi.fn(async () => null),
    replaceWithGamesMenuRoute: vi.fn(),
    renderGuestPage: vi.fn(async () => "<guest></guest>"),
  };
}

describe("games page render options", () => {
  it("сохраняет переданные render-зависимости", () => {
    const params = createParams();
    const options = createGamesPageRenderOptions(params);

    expect(options.renderPageShell).toBe(params.renderPageShell);
    expect(options.getRoom).toBe(params.getRoom);
  });

  it("использует переданный guest fallback", async () => {
    const params = createParams();
    const options = createGamesPageRenderOptions(params);

    await expect(options.renderGuestPage()).resolves.toBe("<guest></guest>");
    expect(params.renderGuestPage).toHaveBeenCalledOnce();
  });
});
