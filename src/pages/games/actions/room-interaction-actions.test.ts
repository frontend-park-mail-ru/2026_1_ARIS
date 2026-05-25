/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import { submitRoomAnswerValue } from "./answer";
import { copyInviteCodeAction, copyQuestionAnswerAction, copyRoomTitleAction } from "./copy";
import { submitQuestionReport } from "./question-report";
import { createRoomInteractionActions } from "./room-interaction-actions";
import { submitRoomChatForm } from "./room-chat";

vi.mock("./answer", () => ({
  submitRoomAnswerValue: vi.fn(),
}));

vi.mock("./copy", () => ({
  copyInviteCodeAction: vi.fn(),
  copyQuestionAnswerAction: vi.fn(),
  copyRoomTitleAction: vi.fn(),
}));

vi.mock("./question-report", () => ({
  submitQuestionReport: vi.fn(),
}));

vi.mock("./room-chat", () => ({
  submitRoomChatForm: vi.fn(),
}));

function createRoom(patch: Partial<GameRoom> = {}): GameRoom {
  return {
    id: "room-1",
    ...patch,
  } as GameRoom;
}

function createOptions(room = createRoom()) {
  return {
    getRoom: vi.fn(() => room),
    getRoomChatSending: vi.fn(() => false),
    getCurrentMessages: vi.fn(() => [] as GameRoomMessage[]),
    sendAnswerBySocket: vi.fn(() => true),
    acceptCurrentAnswerLocally: vi.fn(),
    reportingQuestionKeys: new Set<string>(),
    reportedQuestionKeys: new Set<string>(),
    syncQuestionReportButtons: vi.fn(),
    enrichOwnMessage: vi.fn((_: GameRoom, message: GameRoomMessage) => message),
    getAuthorAvatar: vi.fn(() => ""),
    hydrateAuthorAvatars: vi.fn(async () => [] as string[]),
    prepareAvatarLinks: vi.fn(),
    mergeMessages: vi.fn((existing: GameRoomMessage[], incoming: GameRoomMessage[]) => [
      ...existing,
      ...incoming,
    ]),
    refreshChat: vi.fn(),
    setChatState: vi.fn(),
    findQuestion: vi.fn(() => null),
    getQuestionClipboardText: vi.fn(() => "question"),
    closeMenus: vi.fn(() => ({})),
    copyText: vi.fn().mockResolvedValue(undefined),
    showToast: vi.fn(),
    setGamesState: vi.fn(),
  };
}

describe("room interaction actions facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(copyInviteCodeAction).mockResolvedValue(undefined);
    vi.mocked(copyQuestionAnswerAction).mockResolvedValue(undefined);
    vi.mocked(copyRoomTitleAction).mockResolvedValue(undefined);
    vi.mocked(submitQuestionReport).mockResolvedValue(undefined);
    vi.mocked(submitRoomAnswerValue).mockResolvedValue(undefined);
    vi.mocked(submitRoomChatForm).mockResolvedValue(undefined);
  });

  it("читает answer из формы и отправляет answer action", async () => {
    const options = createOptions();
    const actions = createRoomInteractionActions(options);
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "answer";
    input.value = "42";
    form.append(input);

    await actions.handleSubmitAnswer(form);

    expect(submitRoomAnswerValue).toHaveBeenCalledWith(
      expect.objectContaining({
        room: options.getRoom(),
        value: "42",
        sendAnswerBySocket: options.sendAnswerBySocket,
      }),
    );
  });

  it("собирает report и chat actions из актуального состояния", async () => {
    const options = createOptions();
    const actions = createRoomInteractionActions(options);
    const form = document.createElement("form");

    await actions.handleReportQuestion("q-1");
    await actions.handleSubmitRoomChat(form);

    expect(submitQuestionReport).toHaveBeenCalledWith(
      expect.objectContaining({
        room: options.getRoom(),
        questionKey: "q-1",
        reportingKeys: options.reportingQuestionKeys,
      }),
    );
    expect(submitRoomChatForm).toHaveBeenCalledWith(
      form,
      expect.objectContaining({
        room: options.getRoom(),
        sending: false,
        currentMessages: [],
      }),
    );
  });

  it("собирает clipboard actions", async () => {
    const options = createOptions();
    const actions = createRoomInteractionActions(options);

    await actions.handleCopyInviteCode("ABC123");
    await actions.handleCopyRoomTitle("Room");
    await actions.handleCopyQuestionAnswer("q-1");

    expect(copyInviteCodeAction).toHaveBeenCalledWith(
      "ABC123",
      expect.objectContaining({ copyText: options.copyText }),
    );
    expect(copyRoomTitleAction).toHaveBeenCalledWith(
      "Room",
      expect.objectContaining({ setGamesState: options.setGamesState }),
    );
    expect(copyQuestionAnswerAction).toHaveBeenCalledWith(
      "q-1",
      expect.objectContaining({
        room: options.getRoom(),
        closeMenus: options.closeMenus,
      }),
    );
  });
});
