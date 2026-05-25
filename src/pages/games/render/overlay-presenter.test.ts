/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import {
  getGamesOverlayRenderOptions,
  renderGamesFloatingMenuPresenter,
  renderGamesOverlayPresenter,
} from "./overlay-presenter";

/** Создаёт options overlay presenter. */
function createOptions() {
  return {
    state: createInitialGamesState(),
    reportedQuestionKeys: new Set<string>(),
    reportingQuestionKeys: new Set<string>(),
    getRoomTitleValue: (room: GameRoom) => room.title,
    getPlayerAvatarUrl: () => "",
    isCurrentRoomCreator: () => true,
  };
}

describe("games overlay presenter", () => {
  it("собирает overlay render options", () => {
    const options = createOptions();

    const renderOptions = getGamesOverlayRenderOptions(options);

    expect(renderOptions.state).toBe(options.state);
    expect(renderOptions.reportingQuestionKeys).toBe(options.reportingQuestionKeys);
  });

  it("рендерит floating menu по состоянию title menu", () => {
    const options = createOptions();
    options.state.room = { id: "room-1" } as GameRoom;
    options.state.titleMenuOpen = true;
    options.state.floatingMenuAnchorX = 100;
    options.state.floatingMenuAnchorY = 120;

    const html = renderGamesFloatingMenuPresenter(options);

    expect(html).toContain("Скопировать");
    expect(html).toContain("Переименовать");
  });

  it("рендерит общий overlay", () => {
    const options = createOptions();
    options.state.disbandConfirmOpen = true;

    const html = renderGamesOverlayPresenter(options);

    expect(html).toContain("data-games-report-overlay");
  });
});
