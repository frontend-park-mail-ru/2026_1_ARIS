/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { createInitialGamesState } from "../state/store";
import { renderGamesContent, renderGamesMessage, renderGamesShell } from "./page";

describe("games page render", () => {
  it("рендерит ссылку возврата в сообщении", () => {
    const state = createInitialGamesState();
    state.message = "Вы вышли из комнаты.";
    state.messageReturnRoomId = "room-1";
    state.messageReturnRoomLabel = "Вернуться?";

    const html = renderGamesMessage(state);

    expect(html).toContain("Вы вышли из комнаты.");
    expect(html).toContain('data-games-return-room="room-1"');
    expect(html).toContain("Вернуться?");
  });

  it("возвращает каталог для catalog route", () => {
    const state = createInitialGamesState();

    expect(
      renderGamesContent({
        state,
        isCatalogRoute: true,
        catalog: "<section>Catalog</section>",
        mainPanel: "<main>Main</main>",
        roomChat: "",
      }),
    ).toBe("<section>Catalog</section>");
  });

  it("рендерит shell с data-room-id", () => {
    const state = createInitialGamesState();
    state.roomId = "room-1";

    const html = renderGamesShell({
      state,
      content: "<main>Content</main>",
      overlay: "<div>Overlay</div>",
    });

    expect(html).toContain('data-room-id="room-1"');
    expect(html).toContain("<main>Content</main>");
    expect(html).toContain("<div>Overlay</div>");
  });
});
