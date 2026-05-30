/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { createGamesPageRuntimeRefs } from "./page-runtime-refs";
import { createGamesPageRuntimesOptions } from "./page-runtimes-options";

describe("games page runtimes options", () => {
  it("собирает callbacks runtime из state и refs", () => {
    const state = createInitialGamesState();
    state.room = { id: "room-1" } as GameRoom;
    state.roomChatMessages = [{ id: "message-1" } as GameRoomMessage];
    state.socketOpen = true;
    const runtimeRefs = createGamesPageRuntimeRefs();
    const loadWaitingRooms = vi.fn(async () => undefined);
    const refreshCurrentRoomSilently = vi.fn(async () => undefined);
    runtimeRefs.setLoadWaitingRooms(loadWaitingRooms);
    runtimeRefs.setRefreshCurrentRoomSilently(refreshCurrentRoomSilently);
    const setRecoveredRoom = vi.fn();
    const setRoomSocketOpenState = vi.fn();
    const refreshGamesDom = vi.fn();

    const options = createGamesPageRuntimesOptions({
      getRoot: () => document.body,
      getState: () => state,
      mergeRoomChatMessages: (existing) => existing,
      hydrateRoomChatAuthorAvatars: vi.fn(async () => []),
      canRecoverRoomAccess: vi.fn(() => false),
      recoverRoomAccess: vi.fn(async () => null),
      clearRoomAccessRecovery: vi.fn(),
      setRecoveredRoom,
      setRoomChatState: vi.fn(),
      setRoomSocketOpenState,
      refreshGamesDom,
      runtimeRefs,
    });

    expect(options.getRoom()).toBe(state.room);
    expect(options.getSocketOpenState()).toBe(true);
    expect(options.getMessages()).toEqual(state.roomChatMessages);
    options.setRecoveredRoom(state.room);
    options.setRoomSocketOpenState(false);
    options.loadWaitingRoomsSilently();
    options.refreshCurrentRoomSilently();
    options.onFinalResultsExpired();
    options.onQuestionDeadlineExpired();

    expect(setRecoveredRoom).toHaveBeenCalledWith(state.room);
    expect(setRoomSocketOpenState).toHaveBeenCalledWith(false);
    expect(loadWaitingRooms).toHaveBeenCalledWith({ preserveMessage: true, silent: true });
    expect(refreshCurrentRoomSilently).toHaveBeenCalledTimes(2);
    expect(refreshGamesDom).toHaveBeenCalledOnce();
  });
});
