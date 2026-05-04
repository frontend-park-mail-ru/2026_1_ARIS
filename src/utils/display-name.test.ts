import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyLanguage, languageStore } from "../state/language";
import { formatPersonName, transliterateCyrillic } from "./display-name";

describe("display-name", () => {
  beforeEach(() => {
    languageStore.reset({ language: "RU" });
  });

  afterEach(() => {
    languageStore.reset({ language: "RU" });
  });

  it("транслитерирует кириллицу в латиницу", () => {
    expect(transliterateCyrillic("Софья Ситниченко")).toBe("Sofya Sitnichenko");
    expect(transliterateCyrillic("Сергей Шульгиненко")).toBe("Sergey Shulginenko");
  });

  it("оставляет имя без изменений в русском режиме", () => {
    expect(formatPersonName("Софья", "Ситниченко")).toBe("Софья Ситниченко");
  });

  it("транслитерирует имя в английском режиме", () => {
    applyLanguage("EN", { persist: false, emit: false });

    expect(formatPersonName("Константин", "Галанин")).toBe("Konstantin Galanin");
  });
});
