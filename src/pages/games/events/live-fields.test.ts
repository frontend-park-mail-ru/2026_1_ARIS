/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { bindGamesLiveFieldEvents } from "./live-fields";

describe("games live field events", () => {
  it("сохраняет черновик чата комнаты", () => {
    const root = document.createElement("div");
    const input = document.createElement("textarea");
    input.dataset.gamesRoomChatInput = "";
    root.appendChild(input);
    const patchGamesState = vi.fn();

    bindGamesLiveFieldEvents(root, {
      patchGamesState,
      setRoomChatState: vi.fn(),
      renderRoomsList: vi.fn(),
    });
    input.value = "Привет";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(patchGamesState).toHaveBeenCalledWith({ roomChatDraft: "Привет" });
  });

  it("обновляет поисковую строку и html списка комнат", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <input data-games-rooms-search>
      <div data-games-room-list></div>
    `;
    const input = root.querySelector<HTMLInputElement>("[data-games-rooms-search]")!;
    const patchGamesState = vi.fn();

    bindGamesLiveFieldEvents(root, {
      patchGamesState,
      setRoomChatState: vi.fn(),
      renderRoomsList: () => "<article>Room</article>",
    });
    input.value = "room";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(patchGamesState).toHaveBeenCalledWith({ roomsSearchQuery: "room" });
    expect(root.querySelector("[data-games-room-list]")?.innerHTML).toBe("<article>Room</article>");
  });

  it("переключает системные сообщения чата с принудительным scroll", () => {
    const root = document.createElement("div");
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.dataset.gamesRoomChatSystemToggle = "";
    root.appendChild(toggle);
    const setRoomChatState = vi.fn();

    bindGamesLiveFieldEvents(root, {
      patchGamesState: vi.fn(),
      setRoomChatState,
      renderRoomsList: vi.fn(),
    });
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));

    expect(setRoomChatState).toHaveBeenCalledWith(
      { roomChatShowSystemMessages: true },
      { scrollToBottom: true, forceScrollToBottom: true },
    );
  });
});
