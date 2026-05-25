/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoomMessage } from "../../../api/games";
import { createRoomDisconnectRemovalTracker } from "./disconnect-removal";

const message: GameRoomMessage = {
  id: "system:disconnect:room-1:profile-1:123",
  roomId: "room-1",
  authorProfileId: "",
  authorUserAccountId: "",
  authorName: "Сервер",
  authorFirstName: "Сервер",
  authorLastName: "",
  authorUsername: "server",
  authorAvatarId: "",
  authorAvatarUrl: "",
  text: "Игрок удалён",
  createdAt: "2026-05-25T00:00:00.000Z",
};

describe("room disconnect removal tracker", () => {
  it("создаёт стабильный ключ удаления", () => {
    const tracker = createRoomDisconnectRemovalTracker();

    expect(tracker.getRoomDisconnectRemovalKey("room", "profile")).toBe("room:profile");
  });

  it("запоминает и один раз поглощает удаление игрока", () => {
    const tracker = createRoomDisconnectRemovalTracker();

    tracker.rememberRoomDisconnectRemovalMessage(message);

    expect(tracker.consumeRoomDisconnectRemoval("room-1", "profile-1")).toBe(true);
    expect(tracker.consumeRoomDisconnectRemoval("room-1", "profile-1")).toBe(false);
  });

  it("очищает pending-removal по таймеру", () => {
    vi.useFakeTimers();
    const tracker = createRoomDisconnectRemovalTracker(100);

    tracker.rememberRoomDisconnectRemovalMessage(message);
    vi.advanceTimersByTime(100);

    expect(tracker.consumeRoomDisconnectRemoval("room-1", "profile-1")).toBe(false);
    vi.useRealTimers();
  });
});
