import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createAnswerLocalAdapter } from "./answer-local-adapter";
import { acceptCurrentAnswerLocally } from "./answer-local";

vi.mock("./answer-local", () => ({
  acceptCurrentAnswerLocally: vi.fn(),
}));

/** Создаёт зависимости adapter локального ответа для тестов. */
function createOptions(currentRoom: GameRoom | null = { id: "room-1" } as GameRoom) {
  return {
    getCurrentRoom: vi.fn(() => currentRoom),
    setGamesState: vi.fn(),
    patchGamesState: vi.fn(),
    syncCurrentAnswerFormDom: vi.fn(),
    syncPlayersRailAnswerDom: vi.fn(),
  };
}

describe("answer local adapter", () => {
  it("передаёт текущую и входящую комнату в optimistic action", () => {
    const currentRoom = { id: "room-1" } as GameRoom;
    const incomingRoom = { id: "room-2" } as GameRoom;
    const options = createOptions(currentRoom);
    const adapter = createAnswerLocalAdapter(options);

    adapter.acceptCurrentAnswerLocally(42, incomingRoom);

    expect(acceptCurrentAnswerLocally).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: 42,
        incomingRoom,
        currentRoom,
        setGamesState: options.setGamesState,
        patchGamesState: options.patchGamesState,
      }),
    );
  });

  it("использует текущую комнату как incoming fallback", () => {
    const currentRoom = { id: "room-1" } as GameRoom;
    const options = createOptions(currentRoom);
    const adapter = createAnswerLocalAdapter(options);

    adapter.acceptCurrentAnswerLocally(7);

    expect(acceptCurrentAnswerLocally).toHaveBeenCalledWith(
      expect.objectContaining({
        incomingRoom: currentRoom,
        currentRoom,
      }),
    );
  });
});
