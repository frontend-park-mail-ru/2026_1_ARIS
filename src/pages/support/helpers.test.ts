/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { escapeHtml, formatDate, hideError, showError } from "./helpers";

describe("support helpers", () => {
  it("экранирует HTML", () => {
    expect(escapeHtml(`<b title="x&y">`)).toBe("&lt;b title=&quot;x&amp;y&quot;&gt;");
  });

  it("форматирует дату и возвращает исходную строку для invalid date", () => {
    expect(formatDate("2026-05-04T10:00:00.000Z")).toContain("04.05.2026");
    expect(formatDate("not a date")).toBe("not a date");
    expect(formatDate("")).toBe("");
  });

  it("показывает и скрывает ошибку", () => {
    const element = document.createElement("p");

    showError(element, "Ошибка");
    expect(element.textContent).toBe("Ошибка");
    expect(element.hidden).toBe(false);

    hideError(element);
    expect(element.textContent).toBe("");
    expect(element.hidden).toBe(true);
  });
});
