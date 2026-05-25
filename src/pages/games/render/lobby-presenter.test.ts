/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createInitialGamesState } from "../state/store";
import { getRoomsRenderOptions, renderLobbyContent } from "./lobby-presenter";

/** Создаёт adapter presenter лобби. */
function createOptions() {
  const state = createInitialGamesState();
  return {
    state,
    getPlayerAvatarUrl: () => "",
    getPlayerFullName: (player: GameRoom["players"][number]) => player.name,
    getRoomTitleValue: (room: GameRoom) => room.title,
    shouldBlockFullRoomJoin: () => false,
  };
}

describe("games lobby presenter", () => {
  it("собирает options списка комнат из состояния", () => {
    const room = { id: "room-1", title: "Room" } as GameRoom;
    const options = createOptions();
    options.state.rooms = [room];
    options.state.roomsSearchQuery = "room";

    const roomsOptions = getRoomsRenderOptions(options);

    expect(roomsOptions.rooms).toEqual([room]);
    expect(roomsOptions.roomsSearchQuery).toBe("room");
    expect(roomsOptions.getRoomTitleValue(room)).toBe("Room");
  });

  it("рендерит форму входа по invite-коду", () => {
    const options = createOptions();
    options.state.lobbyMode = "join";
    options.state.joinInviteCodeValue = "ABC123";

    const html = renderLobbyContent(options);

    expect(html).toContain("ABC123");
    expect(html).toContain("data-games-join-room");
  });

  it("рендерит меню лобби по умолчанию", () => {
    const html = renderLobbyContent(createOptions());

    expect(html).toContain("data-games-lobby-mode");
  });
});
