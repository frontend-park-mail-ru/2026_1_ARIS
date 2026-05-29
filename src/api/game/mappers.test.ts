import { describe, expect, it } from "vitest";
import { extractGameRoomFromResponse, mapLeaderboard, mapRoom, mapRoomMessage } from "./mappers";

describe("game api mappers", () => {
  it("mapRoom нормализует комнату и не зависит от session state", () => {
    const room = mapRoom({
      ID: 42,
      Title: "Комната",
      Status: "active",
      CreatedByProfileID: 7,
      IsRanked: true,
      RoundPauseSec: 9,
      Players: [
        { ProfileID: 7, FirstName: "Мария", LastName: "Соколова", IsMe: true },
        { ProfileID: 8, login: "anya" },
      ],
    });

    expect(room).toMatchObject({
      id: "42",
      title: "Комната",
      status: "active",
      createdByProfileId: "7",
      isRanked: true,
      roundPauseSec: 9,
    });
    expect(room.players).toHaveLength(2);
    expect(room.players[0]).toMatchObject({
      profileId: "7",
      name: "Мария Соколова",
      isMe: true,
    });
    expect(room.players[1]).toMatchObject({
      profileId: "8",
      name: "anya",
      isMe: false,
    });
  });

  it("extractGameRoomFromResponse возвращает null для ответа без id", () => {
    expect(extractGameRoomFromResponse({ room: {} })).toBeNull();
  });

  it("mapRoomMessage читает автора из вложенного payload", () => {
    expect(
      mapRoomMessage({
        messageId: "m-1",
        RoomID: "r-1",
        Author: {
          ProfileID: "p-1",
          FirstName: "Аня",
          LastName: "Орлова",
        },
        MessageText: "Привет",
      }),
    ).toMatchObject({
      id: "m-1",
      roomId: "r-1",
      authorProfileId: "p-1",
      authorName: "Аня Орлова",
      text: "Привет",
    });
  });

  it("mapLeaderboard нормализует сезон и участников", () => {
    const leaderboard = mapLeaderboard({
      Season: { SeasonNumber: 3, Title: "Весна" },
      Entries: [{ Rank: 1, ProfileID: "9", Rating: 1200, Wins: 5 }],
    });

    expect(leaderboard.season).toMatchObject({ seasonNumber: 3, title: "Весна" });
    expect(leaderboard.entries[0]!).toMatchObject({
      rank: 1,
      profileId: "9",
      rating: 1200,
      wins: 5,
    });
  });
});
