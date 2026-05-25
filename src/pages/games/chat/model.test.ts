import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameRoomMessage } from "../../../api/games";
import {
  createRoomSystemMessage,
  getStoredRoomSystemMessages,
  isRoomSystemMessage,
  mergeRoomChatMessages,
} from "./model";

function createMessage(id: string, text: string, createdAt: string): GameRoomMessage {
  return {
    id,
    roomId: "room-1",
    authorProfileId: "1",
    authorUserAccountId: "1",
    authorName: "Игрок",
    authorFirstName: "Игрок",
    authorLastName: "",
    authorUsername: "player",
    authorAvatarId: "",
    authorAvatarUrl: "",
    text,
    createdAt,
  };
}

function createMemoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key: string) => items.get(key) ?? null,
    key: (index: number) => Array.from(items.keys())[index] ?? null,
    removeItem: (key: string) => {
      items.delete(key);
    },
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

describe("games room chat model", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("создаёт системное сообщение", () => {
    const message = createRoomSystemMessage("room-1", "Комната создана.");

    expect(isRoomSystemMessage(message)).toBe(true);
    expect(message).toMatchObject({
      roomId: "room-1",
      authorName: "Сервер",
      text: "Комната создана.",
    });
  });

  it("дедуплицирует сообщения и сохраняет известные поля", () => {
    const merged = mergeRoomChatMessages(
      [createMessage("1", "старый текст", "2026-05-23T10:00:00.000Z")],
      [{ ...createMessage("1", "", "2026-05-23T10:00:01.000Z"), authorAvatarUrl: "/a.png" }],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]!).toMatchObject({
      id: "1",
      text: "старый текст",
      authorAvatarUrl: "/a.png",
    });
  });

  it("склеивает системные сообщения через нормализатор", () => {
    const left = createRoomSystemMessage("room-1", '"На рейтинг" включена.');
    const right = {
      ...createRoomSystemMessage("room-1", '"Рейтинговая" включена.'),
      id: "system:2",
    };

    const merged = mergeRoomChatMessages([left], [right], {
      normalizeSystemMessageText: (text) => text.replace('"На рейтинг"', '"Рейтинговая"'),
    });

    expect(merged).toHaveLength(1);
  });

  it("возвращает сохранённые системные сообщения комнаты", () => {
    const systemMessage = createRoomSystemMessage("room-1", "Игрок вошёл.");
    mergeRoomChatMessages([], [systemMessage]);

    expect(getStoredRoomSystemMessages("room-1")).toHaveLength(1);
    expect(getStoredRoomSystemMessages("room-2")).toHaveLength(0);
  });
});
