/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { renderGamesOverlay, renderQuestionReportOverlay } from "./overlay";

const room = {
  id: "room-1",
  title: "Room",
  inviteCode: "ABC123",
  players: [
    {
      profileId: "1",
      name: "Ada Lovelace",
    },
  ],
} as GameRoom;

/** Создаёт базовые зависимости overlay-рендера. */
function createOptions(state = createInitialGamesState()) {
  return {
    state,
    reportingQuestionKeys: new Set<string>(),
    getRoomTitleValue: (item: GameRoom) => item.title,
    renderPlayerProfileLink: (player: GameRoom["players"][number]) => `<span>${player.name}</span>`,
    renderRoomAuthor: (item: GameRoom) => `<span>${item.title}</span>`,
    renderFloatingMenu: () => "<div data-floating-menu></div>",
  };
}

describe("games overlay render", () => {
  it("рендерит overlay-контейнер жалобы только при открытой жалобе", () => {
    const state = createInitialGamesState();
    state.room = room;
    state.reportConfirmQuestionKey = "room-1:q1";

    expect(renderQuestionReportOverlay(createOptions(state))).toContain("data-games-report-modal");
  });

  it("рендерит join password modal с названием комнаты", () => {
    const state = createInitialGamesState();
    state.rooms = [room];
    state.joinPasswordRoomId = "room-1";
    state.joinPasswordError = "Неверный пароль";

    const html = renderGamesOverlay(createOptions(state));

    expect(html).toContain("Room");
    expect(html).toContain("Неверный пароль");
    expect(html).toContain("data-floating-menu");
  });
});
