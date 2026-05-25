import { afterEach, describe, expect, it } from "vitest";
import { languageStore } from "../../../state/language";
import { gameT } from "./i18n";

describe("games i18n", () => {
  afterEach(() => {
    languageStore.reset({ language: "RU" });
  });

  it("возвращает русские строки по умолчанию", () => {
    languageStore.reset({ language: "RU" });

    expect(gameT("catalog.title")).toBe("Игры");
    expect(gameT("catalog.players", { count: "2-8" })).toBe("Игроков: 2-8");
  });

  it("возвращает английские строки для EN-интерфейса", () => {
    languageStore.reset({ language: "EN" });

    expect(gameT("catalog.title")).toBe("Games");
    expect(gameT("catalog.players", { count: "2-8" })).toBe("Players: 2-8");
  });
});
