import { describe, expect, it, vi } from "vitest";
import type { GamesDomRefreshOptions } from "./dom-refresh";
import { createGamesPageStateAdapters } from "./page-state-adapters";

describe("games page state adapters", () => {
  it("патчит состояние через updater после подключения DOM adapters", () => {
    const patchGamesState = vi.fn();
    const adapters = createGamesPageStateAdapters({ patchGamesState });
    const domOptions = { root: null } as GamesDomRefreshOptions;

    adapters.connectDomAdapters({
      getDomRefreshOptions: () => domOptions,
    });
    adapters.setRoomSocketOpenState(true);

    expect(patchGamesState).toHaveBeenCalledWith({ socketOpen: true });
  });

  it("защищает DOM refresh до подключения DOM adapters", () => {
    const adapters = createGamesPageStateAdapters({ patchGamesState: vi.fn() });

    expect(() => adapters.refreshGamesDom()).toThrow(
      "DOM refresh options reader is not initialized.",
    );
  });
});
