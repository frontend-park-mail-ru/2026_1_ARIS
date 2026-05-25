import { describe, expect, it } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createGameCurrentUserService } from "./current-user";

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    createdByProfileId: "profile-1",
    maxPlayers: 2,
    players: [],
    ...patch,
  } as GameRoom;
}

describe("game current user service", () => {
  it("возвращает текущего игрока по profileId из сессии", () => {
    const service = createGameCurrentUserService({
      getSessionUser: () => ({ id: "profile-2" }),
    });
    const room = createRoom({
      players: [
        { profileId: "profile-1", isMe: false },
        { profileId: "profile-2", isMe: false },
      ] as GameRoom["players"],
    });

    expect(service.getCurrentProfileId()).toBe("profile-2");
    expect(service.getCurrentPlayer(room)?.profileId).toBe("profile-2");
  });

  it("проверяет права создателя комнаты", () => {
    const service = createGameCurrentUserService({
      getSessionUser: () => ({ id: "profile-1" }),
    });
    const room = createRoom({
      players: [{ profileId: "profile-1", isMe: true }] as GameRoom["players"],
    });

    expect(service.isCurrentRoomCreator(room)).toBe(true);
    expect(service.isRoomCreatedByCurrentUser(room)).toBe(true);
  });

  it("блокирует вход в заполненную чужую комнату", () => {
    const service = createGameCurrentUserService({
      getSessionUser: () => ({ id: "profile-3" }),
    });
    const room = createRoom({
      players: [
        { profileId: "profile-1", isMe: false },
        { profileId: "profile-2", isMe: false },
      ] as GameRoom["players"],
    });

    expect(service.shouldBlockFullRoomJoin(room)).toBe(true);
  });
});
