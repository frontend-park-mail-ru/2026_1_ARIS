/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import {
  initGamesPageLifecycle,
  syncGamesPageResize,
  teardownGamesPageLifecycle,
  teardownGamesPageLifecycleWhenUnmounted,
  type GamesPageLifecycleOptions,
} from "./page-lifecycle";

function createOptions(root: Document | HTMLElement | null = document.createElement("main")) {
  return {
    setRoot: vi.fn(),
    getRoot: vi.fn(() => root),
    bindEvents: vi.fn(),
    startCountdown: vi.fn(),
    focusAnswerInput: vi.fn(),
    syncRoomSubscription: vi.fn(),
    syncRoomsAutoRefresh: vi.fn(),
    syncRoomStateRefresh: vi.fn(),
    syncRoomChatRuntime: vi.fn(),
    hasRoom: vi.fn(() => true),
    refreshCurrentRoomSilently: vi.fn(),
    schedulePopoverOffsets: vi.fn(),
    scrollRoomChatToBottom: vi.fn(),
    stopCountdown: vi.fn(),
    stopRoomsAutoRefresh: vi.fn(),
    stopRoomStateRefresh: vi.fn(),
    stopRoomChat: vi.fn(),
    closeRoomSocket: vi.fn(),
  } satisfies GamesPageLifecycleOptions;
}

describe("games page lifecycle", () => {
  it("запускает runtime после монтирования страницы", () => {
    const root = document.createElement("main");
    const options = createOptions(root);

    initGamesPageLifecycle(root, options);

    expect(options.setRoot).toHaveBeenCalledWith(root);
    expect(options.bindEvents).toHaveBeenCalledWith(root);
    expect(options.startCountdown).toHaveBeenCalledWith(root);
    expect(options.refreshCurrentRoomSilently).toHaveBeenCalledTimes(1);
    expect(options.scrollRoomChatToBottom).toHaveBeenCalledWith(root);
  });

  it("останавливает runtime страницы", () => {
    const options = createOptions();

    teardownGamesPageLifecycle(options);

    expect(options.stopCountdown).toHaveBeenCalledTimes(1);
    expect(options.stopRoomsAutoRefresh).toHaveBeenCalledTimes(1);
    expect(options.stopRoomStateRefresh).toHaveBeenCalledTimes(1);
    expect(options.stopRoomChat).toHaveBeenCalledTimes(1);
    expect(options.closeRoomSocket).toHaveBeenCalledTimes(1);
  });

  it("синхронизирует resize только при наличии root", () => {
    const root = document.createElement("main");
    const options = createOptions(root);

    syncGamesPageResize(options);

    expect(options.schedulePopoverOffsets).toHaveBeenCalledWith(root);

    const emptyOptions = createOptions(null);
    syncGamesPageResize(emptyOptions);
    expect(emptyOptions.schedulePopoverOffsets).not.toHaveBeenCalled();
  });

  it("останавливает runtime только когда страница размонтирована", () => {
    const options = createOptions();
    document.body.innerHTML = "<section data-games-page></section>";

    teardownGamesPageLifecycleWhenUnmounted(options);
    expect(options.closeRoomSocket).not.toHaveBeenCalled();

    document.body.innerHTML = "";
    teardownGamesPageLifecycleWhenUnmounted(options);
    expect(options.closeRoomSocket).toHaveBeenCalledTimes(1);
  });
});
