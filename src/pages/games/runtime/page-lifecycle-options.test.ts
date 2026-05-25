import { describe, expect, it, vi } from "vitest";
import { createGamesPageLifecycleOptionsFactory } from "./page-lifecycle-options";

/** Создаёт параметры factory lifecycle-опций для тестов. */
function createParams() {
  return {
    setRoot: vi.fn(),
    getRoot: vi.fn(() => null),
    bindEvents: vi.fn(),
    startCountdown: vi.fn(),
    focusAnswerInput: vi.fn(),
    syncRoomSubscription: vi.fn(),
    syncRoomsAutoRefresh: vi.fn(),
    syncRoomStateRefresh: vi.fn(),
    syncRoomChatRuntime: vi.fn(),
    hasRoom: vi.fn(() => false),
    refreshCurrentRoomSilently: vi.fn(async () => undefined),
    schedulePopoverOffsets: vi.fn(),
    scrollRoomChatToBottom: vi.fn(),
    stopCountdown: vi.fn(),
    stopRoomsAutoRefresh: vi.fn(),
    stopRoomStateRefresh: vi.fn(),
    stopRoomChat: vi.fn(),
    closeRoomSocket: vi.fn(),
  };
}

describe("games page lifecycle options factory", () => {
  it("возвращает свежие lifecycle-опции с теми же зависимостями", () => {
    const params = createParams();
    const getOptions = createGamesPageLifecycleOptionsFactory(params);

    const firstOptions = getOptions();
    const secondOptions = getOptions();

    expect(firstOptions).not.toBe(secondOptions);
    expect(firstOptions.bindEvents).toBe(params.bindEvents);
    expect(secondOptions.stopRoomChat).toBe(params.stopRoomChat);
  });

  it("адаптирует async refresh комнаты к sync lifecycle callback", () => {
    const params = createParams();
    const getOptions = createGamesPageLifecycleOptionsFactory(params);

    getOptions().refreshCurrentRoomSilently();

    expect(params.refreshCurrentRoomSilently).toHaveBeenCalledOnce();
  });
});
