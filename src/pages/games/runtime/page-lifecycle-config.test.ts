/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { createGamesPageLifecycleConfig } from "./page-lifecycle-config";

/** Создаёт зависимости lifecycle config для тестов. */
function createOptions() {
  return {
    setRoot: vi.fn(),
    getRoot: vi.fn(() => null),
    bindEvents: vi.fn(),
    countdownRuntime: { start: vi.fn(), stop: vi.fn() },
    roomsAutoRefreshRuntime: { stop: vi.fn() },
    roomStateRefreshRuntime: { stop: vi.fn() },
    roomChatRuntime: { stop: vi.fn() },
    roomSocketRuntime: { close: vi.fn() },
    domAdapters: {
      syncRoomSubscription: vi.fn(),
      syncRoomsAutoRefresh: vi.fn(),
      syncRoomStateRefresh: vi.fn(),
      syncRoomChatRuntime: vi.fn(),
    },
    hasRoom: vi.fn(() => true),
    refreshCurrentRoomSilently: vi.fn(),
  };
}

describe("games page lifecycle config", () => {
  it("собирает lifecycle options из runtime и DOM adapters", () => {
    const options = createOptions();
    const getLifecycleOptions = createGamesPageLifecycleConfig(options);
    const root = document.createElement("main");

    const lifecycleOptions = getLifecycleOptions();
    lifecycleOptions.startCountdown(root);
    lifecycleOptions.syncRoomSubscription();
    lifecycleOptions.stopRoomChat();
    lifecycleOptions.closeRoomSocket();

    expect(options.countdownRuntime.start).toHaveBeenCalledWith(root);
    expect(options.domAdapters.syncRoomSubscription).toHaveBeenCalledOnce();
    expect(options.roomChatRuntime.stop).toHaveBeenCalledOnce();
    expect(options.roomSocketRuntime.close).toHaveBeenCalledOnce();
  });
});
