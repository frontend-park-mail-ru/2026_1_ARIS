/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createGamesPageDomAdapters } from "./page-dom-adapters";
import {
  focusCurrentAnswerInput,
  syncCurrentAnswerFormDom,
  syncPlayersRailAnswerDom,
} from "./dom-sync";

vi.mock("./dom-sync", () => ({
  focusCurrentAnswerInput: vi.fn(),
  syncCurrentAnswerFormDom: vi.fn(),
  syncPlayersRailAnswerDom: vi.fn(),
}));

/** Создаёт зависимости DOM adapter для тестов. */
function createOptions(room: GameRoom | null = { id: "room-1" } as GameRoom) {
  return {
    getRoot: vi.fn(() => document.createElement("main")),
    getRoom: vi.fn(() => room),
    getSubmittedQuestionId: vi.fn(() => "question-1"),
    getSubmittedAnswerValue: vi.fn(() => "42"),
    renderContent: vi.fn(() => ""),
    renderPageShell: vi.fn(() => ""),
    renderOverlay: vi.fn(() => ""),
    renderQuestionReportOverlay: vi.fn(() => ""),
    renderPlayersRail: vi.fn(() => ""),
    renderRoomChat: vi.fn(() => ""),
    countdownRuntime: { start: vi.fn() },
    roomChatRuntime: { sync: vi.fn() },
    roomSocketRuntime: { sync: vi.fn() },
    roomsAutoRefreshRuntime: { sync: vi.fn() },
    roomStateRefreshRuntime: { sync: vi.fn() },
    schedulePopoverOffsets: vi.fn(),
    scrollRoomChatToBottom: vi.fn(),
  };
}

describe("games page dom adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("собирает refresh options с актуальными root и room", () => {
    const room = { id: "room-1" } as GameRoom;
    const options = createOptions(room);
    const adapters = createGamesPageDomAdapters(options);

    const refreshOptions = adapters.getDomRefreshOptions();

    expect(refreshOptions.root).toBe(options.getRoot.mock.results[0]?.value);
    expect(refreshOptions.room).toBe(room);
    expect(refreshOptions.focusAnswerInput).toEqual(expect.any(Function));
  });

  it("фокусирует поле ответа один раз на каждый новый вопрос", () => {
    const root = document.createElement("main");
    root.innerHTML = `<input data-games-answer-input>`;
    let room = {
      id: "room-1",
      currentQuestion: { id: "question-1", hasAnswered: false },
    } as GameRoom;
    const options = createOptions(room);
    options.getRoot.mockReturnValue(root);
    options.getRoom.mockImplementation(() => room);
    const adapters = createGamesPageDomAdapters(options);
    const refreshOptions = adapters.getDomRefreshOptions();

    refreshOptions.focusAnswerInput(root);
    refreshOptions.focusAnswerInput(root);

    room = {
      ...room,
      currentQuestion: { id: "question-2", hasAnswered: false },
    } as GameRoom;
    refreshOptions.focusAnswerInput(root);

    expect(focusCurrentAnswerInput).toHaveBeenCalledTimes(2);
    expect(focusCurrentAnswerInput).toHaveBeenNthCalledWith(1, root);
    expect(focusCurrentAnswerInput).toHaveBeenNthCalledWith(2, root);
  });

  it("не фокусирует поле ответа, когда игрок уже ответил", () => {
    const root = document.createElement("main");
    const room = {
      id: "room-1",
      currentQuestion: { id: "question-1", hasAnswered: true },
    } as GameRoom;
    const options = createOptions(room);
    const adapters = createGamesPageDomAdapters(options);

    adapters.getDomRefreshOptions().focusAnswerInput(root);

    expect(focusCurrentAnswerInput).not.toHaveBeenCalled();
  });

  it("фокусирует доступное поле ответа, даже если вопрос уже получил чужой ответ", () => {
    const root = document.createElement("main");
    root.innerHTML = `<input data-games-answer-input>`;
    const room = {
      id: "room-1",
      currentQuestion: { id: "question-1", hasAnswered: true },
    } as GameRoom;
    const options = createOptions(room);
    const adapters = createGamesPageDomAdapters(options);

    adapters.getDomRefreshOptions().focusAnswerInput(root);

    expect(focusCurrentAnswerInput).toHaveBeenCalledWith(root);
  });

  it("синхронизирует runtime-объекты через адаптеры", () => {
    const options = createOptions({ id: "room-1" } as GameRoom);
    const adapters = createGamesPageDomAdapters(options);

    adapters.syncRoomSubscription();
    adapters.syncRoomsAutoRefresh();
    adapters.syncRoomStateRefresh();
    adapters.syncRoomChatRuntime();

    expect(options.roomSocketRuntime.sync).toHaveBeenCalledWith("room-1");
    expect(options.roomsAutoRefreshRuntime.sync).toHaveBeenCalledOnce();
    expect(options.roomStateRefreshRuntime.sync).toHaveBeenCalledOnce();
    expect(options.roomChatRuntime.sync).toHaveBeenCalledOnce();
  });

  it("синхронизирует DOM формы ответа и rail игроков", () => {
    const room = { id: "room-1", currentQuestion: { id: "question-1" } } as GameRoom;
    const options = createOptions(room);
    const adapters = createGamesPageDomAdapters(options);

    adapters.syncCurrentAnswerFormDom();
    adapters.syncPlayersRailAnswerDom();

    expect(syncCurrentAnswerFormDom).toHaveBeenCalledWith(
      options.getRoot.mock.results[0]?.value,
      room.currentQuestion,
      "question-1",
      "42",
    );
    expect(syncPlayersRailAnswerDom).toHaveBeenCalledWith(
      options.getRoot.mock.results[1]?.value,
      room,
    );
  });
});
