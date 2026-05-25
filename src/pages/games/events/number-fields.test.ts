/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { bindGamesNumberFieldEvents } from "./number-fields";

/** Создаёт тестовое числовое поле игр. */
function createNumberInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.dataset.gamesNumberField = "";
  input.dataset.gamesNumberInvalidMessage = "Только цифры";
  document.body.appendChild(input);
  return input;
}

describe("games number field events", () => {
  it("блокирует ввод нечисловых символов", () => {
    const root = document.createElement("div");
    const input = createNumberInput();
    root.appendChild(input);
    const setNumericFieldError = vi.fn();

    bindGamesNumberFieldEvents(root, {
      showRankedLockedCreateFieldError: () => false,
      setNumericFieldError,
      getInvalidNumberMessage: (target) => target.dataset.gamesNumberInvalidMessage ?? "",
    });

    const event = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      data: "x",
    });

    expect(input.dispatchEvent(event)).toBe(false);
    expect(setNumericFieldError).toHaveBeenCalledWith(input, "Только цифры");
  });

  it("не блокирует числовой ввод", () => {
    const root = document.createElement("div");
    const input = createNumberInput();
    root.appendChild(input);
    const setNumericFieldError = vi.fn();

    bindGamesNumberFieldEvents(root, {
      showRankedLockedCreateFieldError: () => false,
      setNumericFieldError,
      getInvalidNumberMessage: () => "Только цифры",
    });

    const event = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      data: "7",
    });

    expect(input.dispatchEvent(event)).toBe(true);
    expect(setNumericFieldError).not.toHaveBeenCalled();
  });

  it("проверяет ranked-lock при фокусе", () => {
    const root = document.createElement("div");
    const input = createNumberInput();
    root.appendChild(input);
    const showRankedLockedCreateFieldError = vi.fn().mockReturnValue(false);

    bindGamesNumberFieldEvents(root, {
      showRankedLockedCreateFieldError,
      setNumericFieldError: vi.fn(),
      getInvalidNumberMessage: () => "Только цифры",
    });

    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(showRankedLockedCreateFieldError).toHaveBeenCalledWith(input);
  });
});
