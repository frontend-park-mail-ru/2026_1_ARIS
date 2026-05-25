/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GamePlayer, GameRoom, GameRoomMessage } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { createGamesPageRendering } from "./page-rendering";

describe("games page rendering composition", () => {
  it("создаёт renderer с question-report adapter", () => {
    const root = document.createElement("main");
    root.innerHTML = '<button data-games-report-question="question-1"></button>';
    const state = createInitialGamesState();
    const reportedQuestionKeys = new Set<string>();
    const reportingQuestionKeys = new Set<string>(["question-1"]);
    const renderer = createGamesPageRendering({
      getRoot: () => root,
      getState: () => state,
      isCatalogRoute: () => false,
      reportedQuestionKeys,
      reportingQuestionKeys,
      getCurrentProfileId: () => "profile-1",
      getCurrentPlayer: () => null,
      getPlayerAvatarUrl: () => "",
      getRoomTitleValue: (room: GameRoom | null) => room?.title ?? "",
      getRoomPasswordDisplayValue: () => "Без пароля",
      getRoomChatAuthorName: (_room: GameRoom, message: GameRoomMessage) =>
        message.authorName || "Игрок",
      getRoomChatAuthorFirstName: (_room: GameRoom, message: GameRoomMessage) =>
        message.authorFirstName || "Игрок",
      getRoomChatAuthorAvatar: () => "",
      getRoomChatPlayer: () => null,
      shouldBlockFullRoomJoin: () => false,
      isCurrentRoomCreator: () => false,
    });

    renderer.syncQuestionReportButtons("question-1");

    expect(root.querySelector("button")?.disabled).toBe(true);
    expect(
      renderer.getLobbyRenderOptions().getPlayerFullName({ name: "Игрок" } as GamePlayer),
    ).toBe("Игрок");
  });
});
