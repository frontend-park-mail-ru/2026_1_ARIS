import { describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { connectGamesPageRuntimeRefs, createGamesPageRuntimeRefs } from "./page-runtime-refs";

describe("games page runtime refs", () => {
  it("бросает ошибку при вызове неподключённого handler", () => {
    const refs = createGamesPageRuntimeRefs();

    expect(() => refs.loadWaitingRoomsSilently()).toThrow(
      "loadWaitingRooms handler is not initialized.",
    );
  });

  it("делегирует runtime wrappers в подключённые handlers", () => {
    const refs = createGamesPageRuntimeRefs();
    const handleRoomUnavailable = vi.fn(async () => undefined);
    const loadWaitingRooms = vi.fn(async () => undefined);
    const refreshCurrentRoomSilently = vi.fn(async () => undefined);
    const handleRoomSocketState = vi.fn(async () => undefined);
    const handleRoomSocketMessage = vi.fn();
    const room = { id: "room-1" } as GameRoom;
    const message = { id: "message-1" } as GameRoomMessage;

    refs.setHandleRoomUnavailable(handleRoomUnavailable);
    refs.setLoadWaitingRooms(loadWaitingRooms);
    refs.setRefreshCurrentRoomSilently(refreshCurrentRoomSilently);
    refs.setHandleRoomSocketState(handleRoomSocketState);
    refs.setHandleRoomSocketMessage(handleRoomSocketMessage);

    refs.handleUnavailableWithoutRecovery();
    refs.loadWaitingRoomsSilently();
    refs.refreshCurrentRoomSilentlyRef();
    refs.handleRoomSocketStateRef(room);
    refs.handleRoomSocketMessageRef(message);

    expect(handleRoomUnavailable).toHaveBeenCalledWith({ recover: false });
    expect(loadWaitingRooms).toHaveBeenCalledWith({ preserveMessage: true, silent: true });
    expect(refreshCurrentRoomSilently).toHaveBeenCalledOnce();
    expect(handleRoomSocketState).toHaveBeenCalledWith(room);
    expect(handleRoomSocketMessage).toHaveBeenCalledWith(message);
  });

  it("подключает action handlers одним вызовом", () => {
    const refs = createGamesPageRuntimeRefs();
    const handlers = {
      handleRoomUnavailable: vi.fn(async () => undefined),
      loadWaitingRooms: vi.fn(async () => undefined),
      refreshCurrentRoomSilently: vi.fn(async () => undefined),
      handleRoomSocketState: vi.fn(async () => undefined),
      handleRoomSocketMessage: vi.fn(),
    };
    const room = { id: "room-1" } as GameRoom;
    const message = { id: "message-1" } as GameRoomMessage;

    connectGamesPageRuntimeRefs(refs, handlers);
    refs.handleUnavailableWithoutRecovery();
    refs.loadWaitingRoomsSilently();
    refs.refreshCurrentRoomSilentlyRef();
    refs.handleRoomSocketStateRef(room);
    refs.handleRoomSocketMessageRef(message);

    expect(handlers.handleRoomUnavailable).toHaveBeenCalledWith({ recover: false });
    expect(handlers.loadWaitingRooms).toHaveBeenCalledWith({
      preserveMessage: true,
      silent: true,
    });
    expect(handlers.refreshCurrentRoomSilently).toHaveBeenCalledOnce();
    expect(handlers.handleRoomSocketState).toHaveBeenCalledWith(room);
    expect(handlers.handleRoomSocketMessage).toHaveBeenCalledWith(message);
  });
});
