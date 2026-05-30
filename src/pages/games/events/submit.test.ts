/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { bindGamesSubmitEvents, type BindGamesSubmitEventsOptions } from "./submit";

/** Создаёт options для тестов submit-событий. */
function createOptions(overrides: Partial<BindGamesSubmitEventsOptions> = {}) {
  const options: BindGamesSubmitEventsOptions = {
    handleSubmitRoomChat: vi.fn().mockResolvedValue(undefined),
    handleCreateRoom: vi.fn().mockResolvedValue(undefined),
    handleJoinRoom: vi.fn().mockResolvedValue(undefined),
    handleJoinListedRoom: vi.fn().mockResolvedValue(undefined),
    handleRenameRoomTitle: vi.fn().mockResolvedValue(undefined),
    handlePasswordForm: vi.fn().mockResolvedValue(undefined),
    handleSubmitAnswer: vi.fn().mockResolvedValue(undefined),
    setRoomChatState: vi.fn(),
    setGamesState: vi.fn(),
    getErrorMessage: (error, fallback) => (error instanceof Error ? error.message : fallback),
    ...overrides,
  };
  return options;
}

describe("games submit events", () => {
  it("отправляет форму чата и пишет ошибку в chat-state", async () => {
    const root = document.createElement("div");
    const form = document.createElement("form");
    form.dataset.gamesRoomChatForm = "";
    root.appendChild(form);
    const options = createOptions({
      handleSubmitRoomChat: vi.fn().mockRejectedValue(new Error("chat failed")),
    });

    bindGamesSubmitEvents(root, options);
    expect(form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))).toBe(
      false,
    );
    await Promise.resolve();

    expect(options.handleSubmitRoomChat).toHaveBeenCalledWith(form);
    expect(options.setRoomChatState).toHaveBeenCalledWith(
      {
        roomChatSending: false,
        roomChatError: "chat failed",
      },
      { scrollToBottom: false },
    );
  });

  it("отправляет create-room форму", async () => {
    const root = document.createElement("div");
    const form = document.createElement("form");
    form.dataset.gamesCreateRoom = "";
    root.appendChild(form);
    const options = createOptions();

    bindGamesSubmitEvents(root, options);
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(options.handleCreateRoom).toHaveBeenCalledWith(form);
  });

  it("отправляет сообщение чата по Enter в поле ввода", async () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <form data-games-room-chat-form>
        <textarea name="text" data-games-room-chat-input>Привет</textarea>
      </form>
    `;
    const form = root.querySelector<HTMLFormElement>("[data-games-room-chat-form]")!;
    const input = root.querySelector<HTMLTextAreaElement>("[data-games-room-chat-input]")!;
    const options = createOptions();

    bindGamesSubmitEvents(root, options);
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    await Promise.resolve();

    expect(event.defaultPrevented).toBe(true);
    expect(options.handleSubmitRoomChat).toHaveBeenCalledWith(form);
  });

  it("оставляет Shift+Enter для переноса строки в чате", async () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <form data-games-room-chat-form>
        <textarea name="text" data-games-room-chat-input>Привет</textarea>
      </form>
    `;
    const input = root.querySelector<HTMLTextAreaElement>("[data-games-room-chat-input]")!;
    const options = createOptions();

    bindGamesSubmitEvents(root, options);
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    await Promise.resolve();

    expect(event.defaultPrevented).toBe(false);
    expect(options.handleSubmitRoomChat).not.toHaveBeenCalled();
  });

  it("пишет ошибку answer-формы в общий state", async () => {
    const root = document.createElement("div");
    const form = document.createElement("form");
    form.dataset.gamesAnswerForm = "";
    root.appendChild(form);
    const options = createOptions({
      handleSubmitAnswer: vi.fn().mockRejectedValue(new Error("answer failed")),
    });

    bindGamesSubmitEvents(root, options);
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(options.setGamesState).toHaveBeenCalledWith({
      loading: false,
      message: "",
      error: "answer failed",
      errorTarget: "answer",
    });
  });
});
