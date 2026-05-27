/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../../api/chat";
import { sessionStore } from "../../state/session";
import { createMemoryStorage } from "../../test-utils/storage";
import { mapMessageToViewMessage } from "./messages";
import type { ChatViewThread } from "./types";

const thread: ChatViewThread = {
  id: "1",
  title: "Олег Владелец",
  preview: "",
  timeLabel: "",
  source: "api",
};

describe("chat messages mapping", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    sessionStore.reset({ user: null, feedMode: "by-time" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStore.reset({ user: null, feedMode: "by-time" });
  });

  it("распознаёт legacy audio-only webm как голосовое сообщение", () => {
    const message: ChatMessage = {
      id: "42",
      text: "",
      authorId: "7",
      authorName: "Олег Владелец",
      media: [
        {
          id: "99",
          uid: "",
          mimeType: "video/webm",
          url: "/media/voice-message.webm?token=abc",
        },
      ],
      files: [],
      reactions: [],
      isActive: true,
    };

    const viewMessage = mapMessageToViewMessage(message, thread);

    expect(viewMessage.voice).toMatchObject({
      mediaID: 99,
      mimeType: "audio/webm",
      url: "/media/voice-message.webm?token=abc",
    });
    expect(viewMessage.videoNote).toBeUndefined();
  });

  it("не превращает video_note в голосовое сообщение", () => {
    const message: ChatMessage = {
      id: "43",
      text: "",
      authorId: "7",
      authorName: "Олег Владелец",
      type: "video_note",
      media: [
        {
          id: "100",
          uid: "",
          mimeType: "video/webm",
          url: "/media/video-note.webm?token=abc",
        },
      ],
      files: [],
      reactions: [],
      isActive: true,
    };

    const viewMessage = mapMessageToViewMessage(message, thread);

    expect(viewMessage.voice).toBeUndefined();
    expect(viewMessage.videoNote).toMatchObject({
      mediaID: 100,
      mimeType: "video/webm",
      url: "/media/video-note.webm?token=abc",
    });
  });
});
