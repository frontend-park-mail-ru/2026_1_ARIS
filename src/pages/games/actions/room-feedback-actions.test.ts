import { describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import type { PendingVoluntaryLeave } from "../room/lifecycle";
import { getRoomFullMessagePatch } from "../state/action-patches";
import { createRoomFeedbackActions } from "./room-feedback-actions";

/** Создаёт зависимости feedback actions для тестов. */
function createOptions(pendingVoluntaryLeave: PendingVoluntaryLeave | null = null) {
  return {
    getPasswordVisible: vi.fn(() => true),
    getRoomPasswordDisplayValue: vi.fn(() => "secret"),
    getPendingVoluntaryLeave: vi.fn(() => pendingVoluntaryLeave),
    setPendingVoluntaryLeave: vi.fn(),
    setGamesState: vi.fn(),
  };
}

describe("room feedback actions", () => {
  it("возвращает отображаемый пароль через display service", () => {
    const options = createOptions();
    const actions = createRoomFeedbackActions(options);
    const room = { id: "room-1" } as GameRoom;

    expect(actions.getRoomPasswordDisplayValue(room)).toBe("secret");
    expect(options.getRoomPasswordDisplayValue).toHaveBeenCalledWith(room, true);
  });

  it("очищает pending voluntary leave только для подходящей комнаты", () => {
    const pending = { roomId: "room-1" } as PendingVoluntaryLeave;
    const options = createOptions(pending);
    const actions = createRoomFeedbackActions(options);

    actions.clearPendingVoluntaryLeave("room-2");
    expect(options.setPendingVoluntaryLeave).not.toHaveBeenCalled();

    actions.clearPendingVoluntaryLeave("room-1");
    expect(options.setPendingVoluntaryLeave).toHaveBeenCalledWith(null);
  });

  it("показывает сообщение о заполненной комнате", () => {
    const options = createOptions();
    const actions = createRoomFeedbackActions(options);

    actions.showRoomFullMessage();

    expect(options.setGamesState).toHaveBeenCalledWith(getRoomFullMessagePatch());
  });

  it("формирует toast смены ranked-режима", () => {
    const actions = createRoomFeedbackActions(createOptions());

    expect(actions.getRankedTypeToastMessage(true)).toContain("Рейтинговая");
  });
});
