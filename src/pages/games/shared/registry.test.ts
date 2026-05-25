import { afterEach, describe, expect, it } from "vitest";
import { languageStore } from "../../../state/language";
import {
  getGameCatalogItemById,
  getGameCatalogItems,
  getGameDefinitionById,
  getPrimaryGameCatalogItem,
} from "./registry";

describe("games registry", () => {
  afterEach(() => {
    languageStore.reset({ language: "RU" });
  });

  it("возвращает общий каталог игр с параметрами комнаты", () => {
    const [game] = getGameCatalogItems();

    expect(game).toMatchObject({
      id: "quiz",
      gameType: "number_duel",
      href: "/games/quiz",
      minPlayers: 2,
      maxPlayers: 8,
      playerCount: "2-8",
    });
  });

  it("локализует основную игру по текущему языку интерфейса", () => {
    languageStore.reset({ language: "EN" });

    expect(getPrimaryGameCatalogItem().title).toBe("Number Quiz");
  });

  it("ищет игру по route-id для будущих общих комнат", () => {
    expect(getGameDefinitionById("quiz")?.gameType).toBe("number_duel");
    expect(getGameCatalogItemById("missing")).toBeNull();
  });
});
