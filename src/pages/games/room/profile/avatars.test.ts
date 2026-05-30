/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import type { GameRoom, GameRoomMessage } from "../../../../api/games";
import { createGameRoomAvatarService, getProfileAvatarLink } from "./avatars";

const basePlayer: GameRoom["players"][number] = {
  profileId: "1",
  userAccountId: "10",
  name: "Alice Example",
  firstName: "Alice",
  lastName: "Example",
  gender: "",
  username: "alice",
  avatarId: "",
  avatarUrl: "/avatars/alice.png",
  score: 0,
  isReady: false,
  hasAnswered: false,
  pauseUsed: false,
  forceResumeRequested: false,
  isMe: true,
};

const baseRoom: GameRoom = {
  id: "room-1",
  title: "Room",
  inviteCode: "123456",
  gameType: "number_duel",
  status: "waiting",
  createdByProfileId: "1",
  maxPlayers: 4,
  hasPassword: false,
  password: "",
  isRanked: false,
  inviteCodeEnabled: true,
  questionCount: 5,
  answerTimeoutSec: 30,
  currentQuestionIndex: 0,
  nextQuestionAt: "",
  pausedByProfileId: "",
  pauseStartedAt: "",
  pauseUntilAt: "",
  pauseForceVotes: 0,
  pauseForceVotesRequired: 0,
  creator: basePlayer,
  players: [basePlayer],
  currentQuestion: null,
  questions: [],
  ratingChanges: [],
  winnerProfileId: "",
  profileStats: null,
};

const baseMessage: GameRoomMessage = {
  id: "message-1",
  roomId: "room-1",
  authorProfileId: "",
  authorUserAccountId: "",
  authorName: "",
  authorFirstName: "",
  authorLastName: "",
  authorUsername: "",
  authorAvatarId: "",
  authorAvatarUrl: "",
  text: "Привет",
  createdAt: "2026-05-25T00:00:00.000Z",
};

/** Создаёт сервис аватаров с тестовыми зависимостями. */
function createService(overrides: Partial<Parameters<typeof createGameRoomAvatarService>[0]> = {}) {
  return createGameRoomAvatarService({
    getCurrentProfileId: () => "1",
    getCurrentPlayer: () => basePlayer,
    getSessionUser: () => ({
      id: "1",
      firstName: "Alice",
      lastName: "Example",
      login: "alice",
      avatarLink: "/session/avatar.png",
    }),
    loadProfile: vi.fn(async () => ({ imageLink: "/profile/avatar.png", gender: "female" })),
    ...overrides,
  });
}

describe("game room avatars", () => {
  it("достаёт ссылку на аватар из разных полей профиля", () => {
    expect(getProfileAvatarLink({ avatarURL: "/avatar.png" })).toBe("/avatar.png");
    expect(getProfileAvatarLink({ photoUrl: " /photo.png " })).toBe("/photo.png");
    expect(getProfileAvatarLink(null)).toBe("");
  });

  it("обогащает собственное сообщение данными текущего игрока", () => {
    const service = createService();

    expect(service.enrichOwnRoomChatMessage(baseRoom, baseMessage)).toMatchObject({
      roomId: "room-1",
      authorProfileId: "1",
      authorUserAccountId: "10",
      authorName: "Alice Example",
      authorFirstName: "Alice",
      authorLastName: "Example",
      authorUsername: "alice",
      authorAvatarUrl: "/session/avatar.png",
    });
  });

  it("сопоставляет автора чата с игроком комнаты по username", () => {
    const service = createService({
      getSessionUser: () => null,
    });

    expect(
      service.getRoomChatAuthorAvatar(baseRoom, {
        ...baseMessage,
        authorUsername: "alice",
      }),
    ).toBe("/avatars/alice.png");
  });

  it("загружает недостающий аватар и пол игрока из профиля", async () => {
    const loadProfile = vi.fn(async () => ({ imageLink: "/loaded.png", gender: "female" }));
    const service = createService({
      getCurrentProfileId: () => "other",
      getCurrentPlayer: () => null,
      getSessionUser: () => null,
      loadProfile,
    });

    const [player] = await service.hydrateGamePlayersAvatars([
      { ...basePlayer, avatarUrl: "", gender: "", isMe: false },
    ]);

    expect(loadProfile).toHaveBeenCalledWith("1", undefined);
    expect(player).toMatchObject({
      avatarUrl: "/loaded.png",
      gender: "female",
      isMe: false,
    });
  });

  it("загружает аватар игрока по avatarId, если профиль не дал ссылку", async () => {
    const loadAvatarUrlById = vi.fn(async () => "/media/avatar-5.png");
    const loadProfile = vi.fn(async () => {
      throw new Error("profile unavailable");
    });
    const service = createService({
      getCurrentProfileId: () => "other",
      getCurrentPlayer: () => null,
      getSessionUser: () => null,
      loadAvatarUrlById,
      loadProfile,
    });

    const [player] = await service.hydrateGamePlayersAvatars([
      { ...basePlayer, avatarId: "5", avatarUrl: "", gender: "", isMe: false },
    ]);

    expect(loadAvatarUrlById).toHaveBeenCalledWith("5", undefined);
    expect(player).toMatchObject({
      avatarUrl: "/media/avatar-5.png",
      isMe: false,
    });
  });

  it("не ходит в profile API для временных гостей публичного лобби", async () => {
    const loadProfile = vi.fn(async () => ({ imageLink: "/loaded.png", gender: "female" }));
    const loadAvatarUrlById = vi.fn(async () => "");
    const service = createService({
      getCurrentProfileId: () => "other",
      getCurrentPlayer: () => null,
      getSessionUser: () => null,
      loadAvatarUrlById,
      loadProfile,
    });

    const [player] = await service.hydrateGamePlayersAvatars([
      {
        ...basePlayer,
        profileId: "161",
        userAccountId: "0",
        username: "guest",
        firstName: "Софья",
        lastName: "Ситниченко",
        avatarId: "",
        avatarUrl: "",
        gender: "",
        isMe: false,
      },
    ]);

    expect(loadAvatarUrlById).not.toHaveBeenCalled();
    expect(loadProfile).not.toHaveBeenCalled();
    expect(player).toMatchObject({
      avatarUrl: "",
      gender: "male",
      isMe: false,
    });
  });

  it("загружает аватар автора чата по authorAvatarId без профиля", async () => {
    const loadAvatarUrlById = vi.fn(async () => "/media/chat-avatar.png");
    const service = createService({
      getSessionUser: () => null,
      loadAvatarUrlById,
    });

    const avatarLinks = await service.hydrateRoomChatAuthorAvatars(null, [
      {
        ...baseMessage,
        authorName: "Bob",
        authorAvatarId: "7",
      },
    ]);

    expect(loadAvatarUrlById).toHaveBeenCalledWith("7", undefined);
    expect(avatarLinks).toContain("/media/chat-avatar.png");
  });

  it("не ходит в profile API для сообщений временных гостей публичного лобби", async () => {
    const loadProfile = vi.fn(async () => ({ imageLink: "/loaded.png" }));
    const loadAvatarUrlById = vi.fn(async () => "");
    const service = createService({
      getSessionUser: () => null,
      loadAvatarUrlById,
      loadProfile,
    });

    const avatarLinks = await service.hydrateRoomChatAuthorAvatars(null, [
      {
        ...baseMessage,
        authorProfileId: "161",
        authorUserAccountId: "0",
        authorName: "Софья Ситниченко",
        authorFirstName: "Софья",
        authorLastName: "Ситниченко",
        authorUsername: "guest",
      },
    ]);

    expect(loadAvatarUrlById).not.toHaveBeenCalled();
    expect(loadProfile).not.toHaveBeenCalled();
    expect(avatarLinks).toEqual([]);
  });
});
