/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { createRoomMessagesService } from "./messages";

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    title: "Room",
    createdByProfileId: "profile-1",
    hasPassword: false,
    password: "",
    players: [],
    ...patch,
  } as GameRoom;
}

function createMessage(patch: Partial<GameRoomMessage>): GameRoomMessage {
  return {
    id: "system:room-1:1",
    roomId: "room-1",
    authorProfileId: "",
    authorUserAccountId: "",
    authorName: "Сервер",
    authorFirstName: "Сервер",
    authorLastName: "",
    authorUsername: "server",
    authorAvatarId: "",
    authorAvatarUrl: "",
    text: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

describe("room messages service", () => {
  it("передаёт suppress удаления игрока в системные сообщения", () => {
    const service = createRoomMessagesService({
      consumeDisconnectRemoval: () => true,
    });
    const previousRoom = createRoom({
      players: [{ profileId: "profile-2", name: "Анна", firstName: "Анна" }] as GameRoom["players"],
    });
    const nextRoom = createRoom({ players: [] });

    expect(service.getRoomSystemMessages(previousRoom, nextRoom)).toEqual([]);
  });

  it("дедуплицирует системные сообщения по нормализованному тексту", () => {
    const service = createRoomMessagesService({
      consumeDisconnectRemoval: () => false,
    });
    const merged = service.mergeRoomChatMessages(
      [createMessage({ id: "system:room-1:1", text: 'Тип игры изменен: "На рейтинг".' })],
      [createMessage({ id: "system:room-1:2", text: 'Тип игры изменен: "Рейтинговая".' })],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.text).toBe('Тип игры изменен: "Рейтинговая".');
  });
});
