/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import {
  handleGamesJoinPasswordClick,
  type HandleGamesJoinPasswordClickOptions,
} from "./join-password";

const protectedRoom = {
  id: "room-1",
} as GameRoom;

/** Создаёт options для тестов password-модалки входа. */
function createOptions(overrides: Partial<HandleGamesJoinPasswordClickOptions> = {}) {
  const options: HandleGamesJoinPasswordClickOptions = {
    rooms: [protectedRoom],
    isRoomCreatedByCurrentUser: vi.fn(() => false),
    shouldBlockFullRoomJoin: vi.fn(() => false),
    handleJoinOwnListedRoom: vi.fn().mockResolvedValue(undefined),
    showRoomFullMessage: vi.fn(),
    patchGamesState: vi.fn(),
    setGamesState: vi.fn(),
    getErrorMessage: (error, fallback) => (error instanceof Error ? error.message : fallback),
    ...overrides,
  };
  return options;
}

describe("games join password events", () => {
  it("открывает password-модалку для выбранной комнаты", () => {
    const button = document.createElement("button");
    button.dataset.gamesJoinPasswordRoom = "room-1";
    const options = createOptions();

    expect(handleGamesJoinPasswordClick(new MouseEvent("click"), button, options)).toBe(true);

    expect(options.setGamesState).toHaveBeenCalledWith({
      joinPasswordRoomId: "room-1",
      joinPasswordValue: "",
      joinPasswordVisible: false,
      joinPasswordError: "",
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("возвращает создателя в собственную комнату без password-модалки", async () => {
    const button = document.createElement("button");
    button.dataset.gamesJoinPasswordRoom = "room-1";
    const options = createOptions({
      isRoomCreatedByCurrentUser: vi.fn(() => true),
    });

    handleGamesJoinPasswordClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.handleJoinOwnListedRoom).toHaveBeenCalledWith(protectedRoom);
    expect(options.setGamesState).not.toHaveBeenCalled();
  });

  it("показывает сообщение для заполненной комнаты", () => {
    const button = document.createElement("button");
    button.dataset.gamesJoinPasswordRoom = "room-1";
    const options = createOptions({
      shouldBlockFullRoomJoin: vi.fn(() => true),
    });

    handleGamesJoinPasswordClick(new MouseEvent("click"), button, options);

    expect(options.showRoomFullMessage).toHaveBeenCalled();
    expect(options.setGamesState).not.toHaveBeenCalled();
  });

  it("закрывает password-модалку по close-кнопке", () => {
    const button = document.createElement("button");
    button.dataset.gamesJoinPasswordClose = "";
    const options = createOptions();

    handleGamesJoinPasswordClick(new MouseEvent("click"), button, options);

    expect(options.setGamesState).toHaveBeenCalledWith({
      joinPasswordRoomId: "",
      joinPasswordValue: "",
      joinPasswordVisible: false,
      joinPasswordError: "",
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("закрывает password-модалку по клику в overlay", () => {
    const modal = document.createElement("div");
    modal.dataset.gamesJoinPasswordModal = "";
    const options = createOptions();

    handleGamesJoinPasswordClick(new MouseEvent("click"), modal, options);

    expect(options.setGamesState).toHaveBeenCalledWith({
      joinPasswordRoomId: "",
      joinPasswordValue: "",
      joinPasswordVisible: false,
      joinPasswordError: "",
      message: "",
      error: "",
      errorTarget: "",
    });
  });

  it("пишет ошибку возврата в собственную комнату в form target", async () => {
    const button = document.createElement("button");
    button.dataset.gamesJoinPasswordRoom = "room-1";
    const options = createOptions({
      isRoomCreatedByCurrentUser: vi.fn(() => true),
      handleJoinOwnListedRoom: vi.fn().mockRejectedValue(new Error("join failed")),
    });

    handleGamesJoinPasswordClick(new MouseEvent("click"), button, options);
    await Promise.resolve();

    expect(options.setGamesState).toHaveBeenCalledWith({
      loading: false,
      message: "",
      error: "join failed",
      errorTarget: "form",
    });
  });

  it("сохраняет видимость пароля после клика по eye-toggle", () => {
    const wrapper = document.createElement("div");
    wrapper.className = "games-join-password-modal__input";
    wrapper.innerHTML = `
      <input class="input__field" type="password">
      <button class="eye-toggle"></button>
    `;
    const button = wrapper.querySelector(".eye-toggle")!;
    const options = createOptions();

    handleGamesJoinPasswordClick(new MouseEvent("click"), button, options);

    expect(options.patchGamesState).toHaveBeenCalledWith({ joinPasswordVisible: true });
  });
});
