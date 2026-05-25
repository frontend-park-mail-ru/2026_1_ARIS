import { describe, expect, it, vi } from "vitest";
import type { GameRoomSocketHandlers, GameRoomSocketSubscription } from "../../../api/games";
import { createGamesRoomSocketRuntime } from "./room-socket";

function createSubscription(
  overrides: Partial<GameRoomSocketSubscription> = {},
): GameRoomSocketSubscription {
  return {
    sendAnswer: vi.fn(() => true),
    isOpen: vi.fn(() => true),
    close: vi.fn(),
    ...overrides,
  };
}

describe("games room socket runtime", () => {
  it("создаёт подписку на новую комнату", () => {
    const subscription = createSubscription();
    const subscribe = vi.fn(() => subscription);
    const handlers: GameRoomSocketHandlers = { onRoom: vi.fn() };
    const runtime = createGamesRoomSocketRuntime({ subscribe, handlers });

    runtime.sync("room-1");

    expect(subscribe).toHaveBeenCalledWith("room-1", handlers);
    expect(runtime.isOpen()).toBe(true);
  });

  it("не пересоздаёт подписку для той же комнаты", () => {
    const subscribe = vi.fn(() => createSubscription());
    const runtime = createGamesRoomSocketRuntime({
      subscribe,
      handlers: { onRoom: vi.fn() },
    });

    runtime.sync("room-1");
    runtime.sync("room-1");

    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("закрывает старую подписку при смене комнаты", () => {
    const firstSubscription = createSubscription();
    const secondSubscription = createSubscription();
    const subscribe = vi.fn((roomId: string) =>
      roomId === "room-1" ? firstSubscription : secondSubscription,
    );
    const runtime = createGamesRoomSocketRuntime({
      subscribe,
      handlers: { onRoom: vi.fn() },
    });

    runtime.sync("room-1");
    runtime.sync("room-2");

    expect(firstSubscription.close).toHaveBeenCalledTimes(1);
    expect(secondSubscription.close).not.toHaveBeenCalled();
  });

  it("отправляет ответ через активную подписку", () => {
    const sendAnswer = vi.fn(() => true);
    const runtime = createGamesRoomSocketRuntime({
      subscribe: vi.fn(() => createSubscription({ sendAnswer })),
      handlers: { onRoom: vi.fn() },
    });

    runtime.sync("room-1");

    expect(runtime.sendAnswer(42)).toBe(true);
    expect(sendAnswer).toHaveBeenCalledWith(42);
  });
});
