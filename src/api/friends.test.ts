import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import {
  acceptFriendRequest,
  deleteFriend,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  getUserFriends,
  requestFriendship,
  revokeFriendRequest,
} from "./friends";

vi.mock("./core/client", () => ({
  ApiError: class ApiError extends Error {},
  apiRequest: vi.fn(),
}));

describe("friends api", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("нормализует список друзей и отбрасывает записи без profileId", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      friends: [
        {
          id: 7,
          firstName: "Софья",
          lastName: "Ситниченко",
          login: "sofia",
          status: "accepted",
          link: "/media/a.png",
          createdAt: "2026-05-04T10:00:00.000Z",
        },
        { firstName: "No id" },
      ],
    });

    await expect(getFriends()).resolves.toEqual([
      {
        profileId: "7",
        firstName: "Софья",
        lastName: "Ситниченко",
        username: "sofia",
        status: "accepted",
        avatarLink: "/media/a.png",
        createdAt: "2026-05-04T10:00:00.000Z",
      },
    ]);
    expect(apiRequest).toHaveBeenCalledWith("/api/friends/accepted", {}, {});
  });

  it("строит URL для своих и чужих друзей", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ friends: [] });
    const signal = new AbortController().signal;

    await getUserFriends("profile id", "accepted", signal);
    await getUserFriends("42", "pending");
    await getIncomingFriendRequests();
    await getOutgoingFriendRequests("accepted");

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/users/profile%20id/friends",
      { signal },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/friends/pending", {}, {});
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/api/friends/requests/incoming/pending", {}, {});
    expect(apiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/friends/requests/outgoing/accepted",
      {},
      {},
    );
  });

  it("вызывает endpoints мутаций дружбы", async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);

    await requestFriendship("7");
    await acceptFriendRequest("8");
    await revokeFriendRequest("9");
    await deleteFriend("10 11");

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/friends/request",
      { method: "POST", body: { friendID: 7 } },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/friends/accept/8",
      {
        method: "POST",
        body: undefined,
      },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/friends/request/9",
      {
        method: "DELETE",
        body: undefined,
      },
      {},
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/friends/10%2011",
      {
        method: "DELETE",
        body: undefined,
      },
      {},
    );
  });
});
