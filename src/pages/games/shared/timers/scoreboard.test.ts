/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { scoreboardSortAnimationMs } from "../constants";
import { syncScoreboardAnimations } from "./scoreboard";

function rectAt(top: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    left: 0,
    right: 240,
    bottom: top + 44,
    width: 240,
    height: 44,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("scoreboard timers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("плавно сортирует игроков и прячет временный scroll overflow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T10:00:00.000Z"));
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(performance.now());
      return 1;
    });

    document.body.innerHTML = `
      <div
        class="games-game-scoreboard__list"
        data-games-scoreboard-list
        data-games-scoreboard-sort-at="${Date.now() - 1}"
        data-games-scoreboard-final-order="2,1"
      >
        <article class="games-game-player" data-games-scoreboard-card="1" data-games-player-final-place="2">
          <span class="games-game-player__place">#1</span>
        </article>
        <article class="games-game-player" data-games-scoreboard-card="2" data-games-player-final-place="1">
          <span class="games-game-player__place">#2</span>
        </article>
      </div>
    `;

    const list = document.querySelector<HTMLElement>("[data-games-scoreboard-list]")!;
    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-games-scoreboard-card]"));
    cards.forEach((card) => {
      vi.spyOn(card, "getBoundingClientRect").mockImplementation(() =>
        rectAt(Array.from(list.children).indexOf(card) * 52),
      );
    });
    list.scrollTop = 18;

    syncScoreboardAnimations(document, String);

    expect(
      Array.from(list.children).map((item) => (item as HTMLElement).dataset.gamesScoreboardCard),
    ).toEqual(["2", "1"]);
    expect(list.scrollTop).toBe(18);
    expect(list.classList.contains("games-game-scoreboard__list--sorting")).toBe(true);
    expect(cards[0]?.classList.contains("games-game-player--sorting")).toBe(true);
    expect(cards[1]?.querySelector(".games-game-player__place")?.textContent).toBe("#1");

    vi.advanceTimersByTime(scoreboardSortAnimationMs + 80);

    expect(list.classList.contains("games-game-scoreboard__list--sorting")).toBe(false);
    expect(cards[0]?.classList.contains("games-game-player--sorting")).toBe(false);
  });
});
