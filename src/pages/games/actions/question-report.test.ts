/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoom } from "../../../api/games";
import { createTicket } from "../../../api/support";
import { sessionStore } from "../../../state/session";
import { submitQuestionReport } from "./question-report";

vi.mock("../../../api/support", () => ({
  createTicket: vi.fn().mockResolvedValue({ id: 1 }),
}));

const room = {
  id: "room-1",
  title: "Test room",
  status: "finished",
  gameType: "quiz",
  questionCount: 1,
  currentQuestionIndex: 1,
  players: [
    {
      profileId: "profile-1",
      username: "player-login",
      isCurrentUser: true,
      name: "Player",
    },
  ],
  questions: [
    {
      id: "q-1",
      position: 1,
      text: "Сколько будет 2 + 2?",
      correctAnswer: 4,
      answers: [],
    },
  ],
} as unknown as GameRoom;

/** Создаёт options для тестов отправки жалобы на вопрос. */
function createOptions(overrides: Partial<Parameters<typeof submitQuestionReport>[0]> = {}) {
  return {
    room,
    questionKey: "room-1:q-1",
    reportingKeys: new Set<string>(),
    reportedKeys: new Set<string>(),
    syncQuestionReportButtons: vi.fn(),
    showToast: vi.fn(),
    ...overrides,
  };
}

describe("submitQuestionReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.reset({
      user: {
        id: "profile-1",
        login: "session-login",
        email: "user@example.com",
        firstName: "User",
        lastName: "",
      },
      feedMode: "by-time",
    });
  });

  it("создает support ticket и помечает вопрос как отправленный", async () => {
    const reportedKeys = new Set<string>();
    const options = createOptions({ reportedKeys });

    await submitQuestionReport(options);

    expect(createTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "complaint",
        login: "session-login",
        email: "user@example.com",
        title: "Жалоба на вопрос: Сколько будет 2 + 2?",
      }),
    );
    expect(reportedKeys.has("room-1:q-1")).toBe(true);
    expect(options.showToast).toHaveBeenCalledWith("Жалоба отправлена администраторам");
  });

  it("не отправляет повторную жалобу для уже отправленного вопроса", async () => {
    const options = createOptions({
      reportedKeys: new Set(["room-1:q-1"]),
    });

    await submitQuestionReport(options);

    expect(createTicket).not.toHaveBeenCalled();
  });

  it("показывает toast, если вопрос не найден", async () => {
    const options = createOptions({ questionKey: "room-1:missing" });

    await submitQuestionReport(options);

    expect(createTicket).not.toHaveBeenCalled();
    expect(options.showToast).toHaveBeenCalledWith("Не удалось найти вопрос для жалобы");
  });
});
