/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { renderGamesPageShell } from "./app-shell";

vi.mock("../../../components/header/header", () => ({
  renderHeader: () => "<header>Header</header>",
}));

vi.mock("../../../components/sidebar/sidebar", () => ({
  renderSidebar: () => "<aside>Sidebar</aside>",
}));

describe("games app shell render", () => {
  it("рендерит обычный layout для лобби", () => {
    const html = renderGamesPageShell({
      room: null,
      shell: "<section>Games</section>",
      playersRail: "",
      roomChat: "",
    });

    expect(html).toContain("app-layout--content-wide");
    expect(html).toContain("<aside>Sidebar</aside>");
    expect(html).toContain("<section>Games</section>");
  });

  it("рендерит игровой layout для активной комнаты", () => {
    const html = renderGamesPageShell({
      room: { status: "active" } as GameRoom,
      shell: "<section>Stage</section>",
      playersRail: "<nav>Players</nav>",
      roomChat: "<aside>Chat</aside>",
    });

    expect(html).toContain("app-layout--game-room");
    expect(html).toContain("data-games-room-players-rail");
    expect(html).toContain("<nav>Players</nav>");
    expect(html).toContain("<aside>Chat</aside>");
  });
});
