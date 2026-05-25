/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { PendingVoluntaryLeave } from "./lifecycle";
import { createGamesPageRoomServices } from "./page-room-services";

describe("games page room services", () => {
  it("собирает room services, feedback и access recovery в один фасад", () => {
    const pending = { roomId: "room-1" } as PendingVoluntaryLeave;
    const setPendingVoluntaryLeave = vi.fn();
    const services = createGamesPageRoomServices({
      getPasswordVisible: () => false,
      getPendingVoluntaryLeave: () => pending,
      setPendingVoluntaryLeave,
      setGamesState: vi.fn(),
    });

    services.clearPendingVoluntaryLeave("room-1");

    expect(services.getCurrentProfileId).toBeTypeOf("function");
    expect(services.hydrateGameRoomAvatars).toBeTypeOf("function");
    expect(services.recoverRoomAccess).toBeTypeOf("function");
    expect(services.canRecoverRoomAccess).toBeTypeOf("function");
    expect(setPendingVoluntaryLeave).toHaveBeenCalledWith(null);
  });
});
