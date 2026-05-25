/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createGamesRoomServices } from "./services";

/** Создаёт минимальную комнату для тестов room services. */
function createRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "",
    hasPassword: false,
    password: "",
    players: [],
    ...overrides,
  } as GameRoom;
}

describe("games room services", () => {
  it("собирает room display и current-user сервисы", () => {
    const services = createGamesRoomServices({
      getSessionUser: () => ({ id: "profile-1" }),
      loadProfile: vi.fn(),
    });

    services.rememberRoomTitle("room-1", "Комната");

    expect(services.getCurrentProfileId()).toBe("profile-1");
    expect(services.getRoomTitleValue(createRoom())).toBe("Комната");
  });

  it("передаёт disconnect-removal tracker в сервис сообщений", () => {
    const services = createGamesRoomServices({
      getSessionUser: () => ({ id: "profile-1" }),
      loadProfile: vi.fn(),
    });
    const previousRoom = createRoom({
      players: [{ profileId: "profile-2", name: "Игрок" }] as GameRoom["players"],
    });
    const nextRoom = createRoom({ players: [] });

    services.rememberRoomDisconnectRemovalMessage({
      id: "system:disconnect:room-1:profile-2:remove",
    } as Parameters<typeof services.rememberRoomDisconnectRemovalMessage>[0]);

    const messages = services.getRoomSystemMessages(previousRoom, nextRoom);

    expect(messages).toEqual([]);
  });
});
