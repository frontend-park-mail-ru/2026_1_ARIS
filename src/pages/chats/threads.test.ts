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

  it("не подменяет API-собеседника данными из contact hint", () => {
    rememberChatContactHint({
      chatId: "42",
      profileId: "2",
      avatarLink: "/media/fresh-avatar.png",
    });

    const threads = mapApiChatsToThreads([
      {
        id: "42",
        title: "Сергей Шульгиненко",
        interlocutorProfileId: "6",
        avatarLink: "/media/chat-avatar.png",
      },
    ]);
    const thread = threads[0];

    if (!thread) throw new Error("Thread was not mapped.");
    expect(thread.avatarLink).toBe("/media/chat-avatar.png");
    expect(thread.profileId).toBe("6");
    expect(thread.profilePath).toBe("/id6");
  });

  it("не подменяет API-собеседника известным контактом с таким же именем", () => {
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
        interlocutorProfileId: "9",
        avatarLink: "/media/api-avatar.png",
      },
    ]);
    const thread = threads[0];

    if (!thread) throw new Error("Thread was not mapped.");
    expect(thread.profileId).toBe("9");
    expect(thread.avatarLink).toBe("/media/api-avatar.png");
    expect(thread.profilePath).toBe("/id9");
  });

  it("переносит онлайн-статус собеседника из API в тред", () => {
    const threads = mapApiChatsToThreads([
      {
        id: "42",
        title: "Арина Асхабова",
        interlocutorProfileId: "2",
        interlocutorUserAccountId: "7",
        isOnline: true,
        lastSeenAt: "2026-05-18T04:00:00Z",
      },
    ]);
    const thread = threads[0];

    if (!thread) throw new Error("Thread was not mapped.");
    expect(thread.profileId).toBe("2");
    expect(thread.interlocutorProfileId).toBe("2");
    expect(thread.interlocutorUserAccountId).toBe("7");
    expect(thread.isOnline).toBe(true);
    expect(thread.lastSeenAt).toBe("2026-05-18T04:00:00Z");
  });
});
