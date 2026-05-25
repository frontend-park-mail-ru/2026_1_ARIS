import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GamesPageState } from "../state/store";
import { createGamesDomUpdaters } from "./dom-updaters";
import type { GamesDomRefreshOptions } from "./dom-refresh";
import {
  refreshGamesDom,
  refreshGamesOverlayDom,
  refreshQuestionReportOverlayDom,
  refreshRoomChatDom,
} from "./dom-refresh";

vi.mock("./dom-refresh", () => ({
  refreshGamesDom: vi.fn(),
  refreshGamesOverlayDom: vi.fn(),
  refreshQuestionReportOverlayDom: vi.fn(),
  refreshRoomChatDom: vi.fn(),
}));

const refreshOptions = { root: null } as GamesDomRefreshOptions;

/** Создаёт updater-зависимости для тестов DOM state adapter. */
function createSubject() {
  const patchGamesState = vi.fn();
  const getDomRefreshOptions = vi.fn(() => refreshOptions);
  const updaters = createGamesDomUpdaters({ getDomRefreshOptions, patchGamesState });

  return { getDomRefreshOptions, patchGamesState, updaters };
}

describe("games dom updaters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("патчит состояние и обновляет основной DOM", () => {
    const { getDomRefreshOptions, patchGamesState, updaters } = createSubject();
    const patch: Partial<GamesPageState> = { loading: true };

    updaters.setGamesState(patch);

    expect(patchGamesState).toHaveBeenCalledWith(patch);
    expect(getDomRefreshOptions).toHaveBeenCalledOnce();
    expect(refreshGamesDom).toHaveBeenCalledWith(refreshOptions);
  });

  it("патчит состояние и обновляет overlay", () => {
    const { patchGamesState, updaters } = createSubject();
    const patch: Partial<GamesPageState> = { leaveConfirmOpen: true };

    updaters.setGamesOverlayState(patch);

    expect(patchGamesState).toHaveBeenCalledWith(patch);
    expect(refreshGamesOverlayDom).toHaveBeenCalledWith(refreshOptions);
  });

  it("патчит состояние и обновляет overlay жалобы", () => {
    const { patchGamesState, updaters } = createSubject();
    const patch: Partial<GamesPageState> = { reportConfirmQuestionKey: "question-1" };

    updaters.setQuestionReportOverlayState(patch);

    expect(patchGamesState).toHaveBeenCalledWith(patch);
    expect(refreshQuestionReportOverlayDom).toHaveBeenCalledWith(refreshOptions);
  });

  it("сохраняет socket state без DOM refresh", () => {
    const { patchGamesState, updaters } = createSubject();

    updaters.setRoomSocketOpenState(true);

    expect(patchGamesState).toHaveBeenCalledWith({ socketOpen: true });
    expect(refreshGamesDom).not.toHaveBeenCalled();
    expect(refreshGamesOverlayDom).not.toHaveBeenCalled();
    expect(refreshQuestionReportOverlayDom).not.toHaveBeenCalled();
    expect(refreshRoomChatDom).not.toHaveBeenCalled();
  });

  it("патчит состояние чата и обновляет только чат", () => {
    const { patchGamesState, updaters } = createSubject();
    const patch = { roomChatDraft: "Привет" };
    const options = { forceScrollToBottom: true };

    updaters.setRoomChatState(patch, options);

    expect(patchGamesState).toHaveBeenCalledWith(patch);
    expect(refreshRoomChatDom).toHaveBeenCalledWith(refreshOptions, options);
  });
});
