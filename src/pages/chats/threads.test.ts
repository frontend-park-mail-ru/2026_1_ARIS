/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { mapApiChatsToThreads } from "./threads";
import { rememberChatContactHint } from "./contact-hints";
import { acceptedFriendProfileIds, knownChatContactsByName } from "./contacts";
import { getNormalisedPersonName } from "./helpers";

describe("chat threads", () => {
  beforeEach(() => {
    sessionStorage.clear();
    knownChatContactsByName.clear();
    acceptedFriendProfileIds.clear();
  });

  it("берёт свежую аватарку из contact hint раньше статического профиля", () => {
    rememberChatContactHint({
      chatId: "42",
      profileId: "2",
      avatarLink: "/media/fresh-avatar.png",
    });

    const threads = mapApiChatsToThreads([
      {
        id: "42",
        title: "Арина Асхабова",
        avatarLink: "/media/chat-avatar.png",
      },
    ]);
    const thread = threads[0];

    if (!thread) throw new Error("Thread was not mapped.");
    expect(thread.avatarLink).toBe("/media/fresh-avatar.png");
    expect(thread.profileId).toBe("2");
  });

  it("берёт аватарку известного контакта раньше сохранённой подсказки", () => {
    rememberChatContactHint({
      chatId: "42",
      profileId: "2",
      avatarLink: "/media/hint-avatar.png",
    });
    knownChatContactsByName.set(getNormalisedPersonName("Арина Асхабова"), {
      profileId: "2",
      avatarLink: "/media/contact-avatar.png",
    });

    const threads = mapApiChatsToThreads([
      {
        id: "42",
        title: "Арина Асхабова",
      },
    ]);
    const thread = threads[0];

    if (!thread) throw new Error("Thread was not mapped.");
    expect(thread.avatarLink).toBe("/media/contact-avatar.png");
  });
});
