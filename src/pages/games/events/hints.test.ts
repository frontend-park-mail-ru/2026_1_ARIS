/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { handleGamesHintsClick, type HandleGamesHintsClickOptions } from "./hints";

/** Создаёт options для тестов hint-событий. */
function createOptions(overrides: Partial<HandleGamesHintsClickOptions> = {}) {
  const root = document.createElement("div");
  const options: HandleGamesHintsClickOptions = {
    root,
    participantsStatusHintOpen: false,
    readyStatusHintOpen: false,
    closeGameCatalogHints: vi.fn(),
    getGameHintById: vi.fn(() => null),
    hideGameHint: vi.fn(),
    showGameHint: vi.fn(),
    updateGamesPopoverViewportOffset: vi.fn(),
    scheduleGamesPopoverViewportOffsets: vi.fn(),
    setGamesState: vi.fn(),
    ...overrides,
  };
  return options;
}

describe("games hint events", () => {
  it("открывает catalog hint", () => {
    const button = document.createElement("button");
    button.dataset.gamesCatalogHint = "";
    button.setAttribute("aria-controls", "hint");
    const hint = document.createElement("span");
    const options = createOptions({
      getGameHintById: vi.fn(() => hint),
    });

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const handled = handleGamesHintsClick(event, button, options);

    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(button.classList.contains("games-catalog-card__hint-button--open")).toBe(true);
    expect(options.showGameHint).toHaveBeenCalledWith(hint, button);
  });

  it("переключает подсказку участников", () => {
    const button = document.createElement("button");
    button.dataset.gamesParticipantsStatusToggle = "";
    const options = createOptions({ participantsStatusHintOpen: true });

    expect(handleGamesHintsClick(new MouseEvent("click"), button, options)).toBe(true);
    expect(options.setGamesState).toHaveBeenCalledWith({
      participantsStatusHintOpen: false,
      readyStatusHintOpen: false,
      message: "",
      error: "",
    });
  });

  it("закрывает открытые статусные подсказки при внешнем клике", () => {
    const target = document.createElement("div");
    const options = createOptions({
      participantsStatusHintOpen: true,
      readyStatusHintOpen: true,
    });

    expect(handleGamesHintsClick(new MouseEvent("click"), target, options)).toBe(false);
    expect(options.setGamesState).toHaveBeenCalledWith({ participantsStatusHintOpen: false });
    expect(options.setGamesState).toHaveBeenCalledWith({ readyStatusHintOpen: false });
  });
});
