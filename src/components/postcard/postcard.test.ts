// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderPostcard } from "./postcard";
import { clearSessionUser, setSessionUser } from "../../state/session";
import { createMemoryStorage } from "../../test-utils/storage";

describe("postcard", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    setSessionUser({ id: "1", firstName: "Viewer", lastName: "" });
  });

  afterEach(() => {
    clearSessionUser();
    vi.unstubAllGlobals();
  });

  it("links community posts to the community page", () => {
    const html = renderPostcard({
      id: "10",
      authorId: "56",
      communityId: "12",
      author: "aris-space",
      firstName: "ARIS Space",
      lastName: "",
      avatar: "/media/avatar.jpg",
      text: "Community post",
      time: "только что",
      likes: 0,
      comments: 0,
      reposts: 0,
    });

    expect(html).toContain('href="/groups/12"');
    expect(html).not.toContain('href="/id56"');
  });
});
