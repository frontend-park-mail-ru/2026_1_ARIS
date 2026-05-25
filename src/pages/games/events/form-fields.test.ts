/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { bindGamesFormFieldEvents, type BindGamesFormFieldEventsOptions } from "./form-fields";

/** Создаёт options для тестов form-field событий. */
function createOptions(
  overrides: Partial<BindGamesFormFieldEventsOptions> = {},
): BindGamesFormFieldEventsOptions {
  return {
    patchGamesState: vi.fn(),
    validateTitleField: vi.fn().mockReturnValue(true),
    showRankedLockedCreateFieldError: vi.fn().mockReturnValue(false),
    validateNumericField: vi.fn().mockReturnValue(true),
    applyCreateRoomRankedRules: vi.fn(),
    validateInviteCodeField: vi.fn().mockReturnValue(true),
    setJoinPasswordFieldError: vi.fn(),
    ...overrides,
  };
}

describe("games form field events", () => {
  it("нормализует invite-код и сбрасывает ошибки входа", () => {
    const root = document.createElement("div");
    const input = document.createElement("input");
    input.dataset.gamesInviteCodeField = "";
    input.value = "ab12";
    root.appendChild(input);
    const options = createOptions();

    bindGamesFormFieldEvents(root, options);
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));

    expect(input.value).toBe("AB12");
    expect(options.patchGamesState).toHaveBeenCalledWith({
      joinInviteCodeValue: "AB12",
      joinInviteCodeError: "",
      joinPasswordError: "",
    });
    expect(options.validateInviteCodeField).toHaveBeenCalledWith(input);
  });

  it("сбрасывает ошибку поля пароля входа", () => {
    const root = document.createElement("div");
    const modal = document.createElement("div");
    modal.dataset.gamesJoinPasswordModal = "";
    const wrapper = document.createElement("div");
    wrapper.className = "input input--error";
    const input = document.createElement("input");
    input.dataset.gamesJoinPasswordField = "";
    input.value = "secret";
    const error = document.createElement("p");
    error.className = "games-join-password-modal__error";
    error.textContent = "Ошибка";
    wrapper.appendChild(input);
    modal.append(wrapper, error);
    root.appendChild(modal);
    const options = createOptions();

    bindGamesFormFieldEvents(root, options);
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));

    expect(options.patchGamesState).toHaveBeenCalledWith({
      joinPasswordValue: "secret",
      joinPasswordError: "",
      error: "",
      errorTarget: "",
    });
    expect(options.setJoinPasswordFieldError).toHaveBeenCalledWith(input, "");
    expect(wrapper.classList.contains("input--error")).toBe(false);
    expect(wrapper.classList.contains("input--default")).toBe(true);
    expect(error.textContent).toBe("");
  });

  it("применяет ranked-правила на input и change", () => {
    const root = document.createElement("div");
    const form = document.createElement("form");
    form.dataset.gamesCreateRoom = "";
    const input = document.createElement("input");
    input.name = "isRanked";
    form.appendChild(input);
    root.appendChild(form);
    const options = createOptions();

    bindGamesFormFieldEvents(root, options);
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(options.applyCreateRoomRankedRules).toHaveBeenCalledTimes(2);
    expect(options.applyCreateRoomRankedRules).toHaveBeenCalledWith(form);
  });
});
