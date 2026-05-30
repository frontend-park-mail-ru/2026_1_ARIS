/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindGamesAnswerInputFocusEvents } from "./answer-input";

describe("games answer input focus events", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("переносит первый числовой ввод в поле ответа", () => {
    document.body.innerHTML = `<main><input data-games-answer-input></main>`;
    const root = document.querySelector("main")!;
    const input = root.querySelector<HTMLInputElement>("[data-games-answer-input]")!;
    const focusSpy = vi.spyOn(input, "focus");
    const inputListener = vi.fn();
    input.addEventListener("input", inputListener);
    bindGamesAnswerInputFocusEvents(root);

    const event = new KeyboardEvent("keydown", {
      key: "7",
      bubbles: true,
      cancelable: true,
    });
    root.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(input.value).toBe("7");
    expect(inputListener).toHaveBeenCalledOnce();
  });

  it("не перехватывает ввод в другом поле", () => {
    document.body.innerHTML = `
      <main>
        <input data-games-answer-input>
        <input data-chat-input>
      </main>
    `;
    const root = document.querySelector("main")!;
    const answerInput = root.querySelector<HTMLInputElement>("[data-games-answer-input]")!;
    const chatInput = root.querySelector<HTMLInputElement>("[data-chat-input]")!;
    bindGamesAnswerInputFocusEvents(root);

    chatInput.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "7",
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(answerInput.value).toBe("");
  });
});
