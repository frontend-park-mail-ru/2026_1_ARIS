/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { createGamesCountdownRuntime } from "./countdown";
import { createGamesPollingRuntime } from "./polling";
import { createGamesRoomChatRuntime } from "./room-chat";
import { createGamesRoomSocketRuntime } from "./room-socket";
import { createGamesPageRuntimes } from "./page-runtimes";

vi.mock("./countdown", () => ({
  createGamesCountdownRuntime: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));

vi.mock("./polling", () => ({
  createGamesPollingRuntime: vi.fn(() => ({ sync: vi.fn(), stop: vi.fn() })),
}));

vi.mock("./room-chat", () => ({
  createGamesRoomChatRuntime: vi.fn(() => ({
    loadMessages: vi.fn(),
    reset: vi.fn(),
    sync: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock("./room-socket", () => ({
  createGamesRoomSocketRuntime: vi.fn(() => ({
    close: vi.fn(),
    isOpen: vi.fn(() => false),
    sendAnswer: vi.fn(() => false),
    sync: vi.fn(),
  })),
}));

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    status: "waiting",
    ...patch,
  } as GameRoom;
}

function createOptions() {
  const root = document.createElement("main");
  return {
    getRoot: vi.fn(() => root),
    getRoom: vi.fn(() => null as GameRoom | null),
    getSocketOpenState: vi.fn(() => false),
    getMessages: vi.fn(() => [] as GameRoomMessage[]),
    getChatLoading: vi.fn(() => false),
    fetchMessages: vi.fn(async () => [] as GameRoomMessage[]),
    getStoredSystemMessages: vi.fn(() => [] as GameRoomMessage[]),
    mergeMessages: vi.fn((existing: GameRoomMessage[], incoming: GameRoomMessage[]) => [
      ...existing,
      ...incoming,
    ]),
    hydrateAuthorAvatars: vi.fn(async () => [] as string[]),
    prepareAvatarLinks: vi.fn(),
    canRecoverAccess: vi.fn(() => false),
    recoverAccess: vi.fn(async () => null),
    clearAccessRecovery: vi.fn(),
    setRecoveredRoom: vi.fn(),
    setChatState: vi.fn(),
    handleUnavailable: vi.fn(),
    formatError: vi.fn(() => "error"),
    subscribe: vi.fn(),
    handleRoomSocketState: vi.fn(),
    handleRoomSocketMessage: vi.fn(),
    setRoomSocketOpenState: vi.fn(),
    getLobbyMode: vi.fn(() => "rooms" as const),
    getRoomsAutoRefreshEnabled: vi.fn(() => true),
    getRoomsLoading: vi.fn(() => false),
    loadWaitingRoomsSilently: vi.fn(),
    refreshCurrentRoomSilently: vi.fn(),
    formatScore: vi.fn((value: number) => String(value)),
    onFinalResultsExpired: vi.fn(),
    onQuestionDeadlineExpired: vi.fn(),
  };
}

describe("games page runtimes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("создаёт runtime-обвязки страницы игр", () => {
    const options = createOptions();

    const runtimes = createGamesPageRuntimes(options);

    expect(runtimes.countdown).toBeDefined();
    expect(runtimes.roomChat).toBeDefined();
    expect(runtimes.roomSocket).toBeDefined();
    expect(runtimes.roomsAutoRefresh).toBeDefined();
    expect(runtimes.roomStateRefresh).toBeDefined();
    expect(createGamesCountdownRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        formatScore: options.formatScore,
        onQuestionDeadlineExpired: options.onQuestionDeadlineExpired,
      }),
    );
    expect(createGamesRoomChatRuntime).toHaveBeenCalledWith(
      expect.objectContaining({ fetchMessages: options.fetchMessages }),
    );
    expect(createGamesRoomSocketRuntime).toHaveBeenCalledWith(
      expect.objectContaining({ subscribe: options.subscribe }),
    );
  });

  it("настраивает socket handlers и polling условия", () => {
    const options = createOptions();

    createGamesPageRuntimes(options);

    const socketOptions = vi.mocked(createGamesRoomSocketRuntime).mock.calls[0]?.[0];
    socketOptions?.handlers.onOpen?.();
    socketOptions?.handlers.onClose?.();
    socketOptions?.handlers.onError?.();

    expect(options.setRoomSocketOpenState).toHaveBeenNthCalledWith(1, true);
    expect(options.setRoomSocketOpenState).toHaveBeenNthCalledWith(2, false);
    expect(options.setRoomSocketOpenState).toHaveBeenNthCalledWith(3, false);

    const roomsPollingOptions = vi.mocked(createGamesPollingRuntime).mock.calls[0]?.[0];
    expect(roomsPollingOptions?.shouldRun()).toBe(true);
    roomsPollingOptions?.onTick();
    expect(options.loadWaitingRoomsSilently).toHaveBeenCalledTimes(1);

    options.getRoom.mockReturnValue(createRoom());
    const roomStatePollingOptions = vi.mocked(createGamesPollingRuntime).mock.calls[1]?.[0];
    expect(roomStatePollingOptions?.shouldRun()).toBe(true);
    roomStatePollingOptions?.onTick();
    expect(options.refreshCurrentRoomSilently).toHaveBeenCalledTimes(1);
  });
});
