import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./core/client";
import { getUserSettings, updateUserSettings } from "./settings";
import { searchUsersAndCommunities } from "./search";
import { getLatestEvents, getPublicPopularUsers, getSuggestedUsers } from "./users";

vi.mock("./core/client", () => ({
  apiRequest: vi.fn(),
}));

describe("simple api endpoints", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("вызывает endpoints пользовательских настроек", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ language: "EN", theme: "dark" });
    const signal = new AbortController().signal;

    await getUserSettings(signal);
    await updateUserSettings({ language: "RU" }, signal);

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/settings/", { signal }, {});
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/settings/",
      { method: "POST", body: { language: "RU" }, signal },
      {},
    );
  });

  it("кодирует поисковый запрос и limit", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ users: [], communities: [] });
    const signal = new AbortController().signal;

    await searchUsersAndCommunities("Софья & ARIS", signal);

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/search?q=%D0%A1%D0%BE%D1%84%D1%8C%D1%8F+%26+ARIS&limit=20",
      { signal },
      { users: [], communities: [] },
    );
  });

  it("вызывает endpoints виджетбара", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ items: [] });
    const signal = new AbortController().signal;

    await getSuggestedUsers(signal);
    await getPublicPopularUsers(signal);
    await getLatestEvents(signal);

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/users/suggested", { signal }, {});
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/public/popular-users", { signal }, {});
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/api/users/latest-events", { signal }, {});
  });
});
