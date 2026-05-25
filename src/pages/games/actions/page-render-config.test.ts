import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createGamesPageRenderConfig } from "./page-render-config";

describe("games page render config", () => {
  it("собирает route/state/API render options", async () => {
    const hasSessionUser = vi.fn(() => true);
    const renderPageShell = vi.fn(() => "<main></main>");
    const hydrateRoom = vi.fn(async (room: GameRoom) => room);
    const recoverRoomAccess = vi.fn(async () => null);

    const options = createGamesPageRenderConfig({
      hasSessionUser,
      renderPageShell,
      hydrateRoom,
      rememberRoomTitle: vi.fn(),
      recoverRoomAccess,
    });

    expect(options.hasSessionUser()).toBe(true);
    expect(options.renderPageShell()).toBe("<main></main>");
    await expect(options.hydrateRoom({ id: "room-1" } as GameRoom)).resolves.toEqual({
      id: "room-1",
    });
    await expect(options.recoverRoomAccess("room-1")).resolves.toBeNull();
  });
});
