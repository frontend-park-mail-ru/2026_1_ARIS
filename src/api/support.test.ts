/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "./core/client";
import {
  assignTicket,
  createTicket,
  escalateTicket,
  getAllTickets,
  getSupportStats,
  getTicketMessages,
  rateTicket,
  sendTicketMessage,
  updateTicketStatus,
  uploadSupportScreenshot,
} from "./support";

vi.mock("./core/client", () => {
  class MockApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  }

  return {
    ApiError: MockApiError,
    apiRequest: vi.fn(),
  };
});

vi.mock("../state/session", () => ({
  getSessionUser: vi.fn(() => null),
}));

describe("support api", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("создаёт тикет и маппит числовые category/status", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      id: 5,
      uid: "SUP-5",
      category: 0,
      title: "Bug",
      description: "Broken",
      status: 1,
      line: "2",
      assigned_agent_id: 7,
      rating: "4",
      mediaURL: ["/media/screen.png"],
      created_at: "2026-05-04",
      updated_at: "2026-05-05",
    });

    await expect(
      createTicket({
        category: "bug",
        login: "sofia",
        email: "s@example.com",
        title: "Bug",
        description: "Broken",
      }),
    ).resolves.toEqual({
      id: "5",
      uid: "SUP-5",
      category: "bug",
      title: "Bug",
      description: "Broken",
      status: "in_progress",
      line: 2,
      assignedAgentId: "7",
      rating: 4,
      media: [{ mediaID: 1, mediaURL: "/media/screen.png" }],
      createdAt: "2026-05-04",
      updatedAt: "2026-05-05",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/support/tickets",
      {
        method: "POST",
        body: {
          category: 0,
          login: "sofia",
          email: "s@example.com",
          title: "Bug",
          description: "Broken",
        },
      },
      {},
    );
  });

  it("загружает скриншот и бросает ApiError при пустом media", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ media: [{ mediaID: 9, mediaURL: "/media/s.png" }] })
      .mockResolvedValueOnce({ media: [] });

    await expect(uploadSupportScreenshot(new File(["x"], "s.png"))).resolves.toEqual({
      mediaID: 9,
      mediaURL: "/media/s.png",
    });
    await expect(uploadSupportScreenshot(new File(["x"], "bad.png"))).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it("строит фильтр списка тикетов", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ tickets: [] });
    const signal = new AbortController().signal;

    await getAllTickets(
      { status: "open", category: "question", line: 2, assignedAgentId: "7" },
      signal,
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/support/tickets?status=open&category=question&line=2&assignedAgentId=7",
      { signal },
      [],
    );
  });

  it("нормализует сообщения тикета и фильтрует пустой id", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      messages: [
        {
          ID: 1,
          ticket_id: 5,
          Text: "Здравствуйте",
          author_id: 7,
          author_name: "Support",
          author_role: "support_l1",
          created_at: "2026-05-04",
        },
        { text: "empty id" },
      ],
    });

    await expect(getTicketMessages("ticket id")).resolves.toEqual([
      {
        id: "1",
        ticketId: "5",
        text: "Здравствуйте",
        authorId: "7",
        authorName: "Support",
        authorRole: "support_l1",
        createdAt: "2026-05-04",
      },
    ]);
    expect(apiRequest).toHaveBeenCalledWith("/api/support/tickets/ticket%20id/messages", {}, []);
  });

  it("вызывает endpoints действий по тикету", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ id: 1 });

    await sendTicketMessage("5", { text: "ping" });
    await updateTicketStatus("5", "closed");
    await assignTicket("5", "7");
    await escalateTicket("5", { reason: "need L2" });
    await rateTicket("5", { rating: 5 });

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/support/tickets/5/messages",
      { method: "POST", body: { text: "ping" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/support/tickets/5/status",
      { method: "PATCH", body: { status: "closed" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/support/tickets/5/assign",
      { method: "PATCH", body: { agentId: "7" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/support/tickets/5/escalate",
      { method: "PATCH", body: { reason: "need L2" } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      5,
      "/api/support/tickets/5/rating",
      { method: "POST", body: { rating: 5 } },
      {},
    );
  });

  it("собирает статистику из разных backend-форматов", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      totalCount: 10,
      byStatus: [
        { status: 0, count: 2 },
        { status: "inProgress", count: 3 },
        { status: "waiting_user", count: 1 },
        { status: 3, count: 4 },
      ],
      by_category: { "0": 2, featureRequest: 3 },
      byLineList: [
        { line: 1, count: 6 },
        { line: "l2", count: 4 },
      ],
      avg_rating: 4.5,
      rating_distribution: { "5": 3 },
    });

    await expect(getSupportStats()).resolves.toEqual({
      total: 10,
      open: 2,
      inProgress: 3,
      waitingUser: 1,
      closed: 4,
      byCategory: {
        bug: 2,
        feature_request: 3,
        complaint: 0,
        question: 0,
        other: 0,
      },
      byLine: { l1: 6, l2: 4 },
      avgRating: 4.5,
      ratingDistribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 3 },
    });
  });
});
