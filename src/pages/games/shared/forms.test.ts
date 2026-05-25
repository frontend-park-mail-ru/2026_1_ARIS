/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { languageStore } from "../../../state/language";
import {
  getInviteCodeFieldError,
  getNumericFieldError,
  getTitleFieldError,
  validateInviteCodeField,
} from "./forms";

describe("games forms", () => {
  afterEach(() => {
    languageStore.reset({ language: "RU" });
  });

  it("возвращает локализованные ошибки обязательных полей", () => {
    languageStore.reset({ language: "EN" });
    const titleInput = document.createElement("input");
    const inviteInput = document.createElement("input");

    expect(getTitleFieldError(titleInput, true)).toBe("Enter a room title");
    expect(getInviteCodeFieldError(inviteInput, true)).toBe("Enter an invite code");
  });

  it("берет ошибку числового поля из data-атрибутов формы", () => {
    const input = document.createElement("input");
    input.value = "abc";
    input.dataset.gamesNumberInvalidMessage = "Только цифры";

    expect(getNumericFieldError(input, true)).toBe("Только цифры");
  });

  it("синхронизирует DOM-ошибку кода приглашения", () => {
    const field = document.createElement("label");
    field.className = "games-field";
    field.innerHTML = `
      <input name="inviteCode">
      <span data-games-invite-code-error></span>
    `;
    const input = field.querySelector<HTMLInputElement>("input")!;

    expect(validateInviteCodeField(input, true)).toBe(false);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(field.classList.contains("games-field--invalid")).toBe(true);
    expect(field.querySelector("[data-games-invite-code-error]")?.textContent).toBe(
      "Введите код приглашения",
    );
  });
});
