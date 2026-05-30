/**
 * Мапперы API игрового микросервиса.
 *
 * Нормализуют разные варианты backend-полей в стабильные клиентские модели.
 */
import { getLanguageMode } from "../../state/language";
import type {
  CurrentGameQuestion,
  GameAnswer,
  GameHistoryItem,
  GameLeaderboard,
  GameLeaderboardEntry,
  GamePlayer,
  GamePlayerGender,
  GameRatingChange,
  GameRatingSeason,
  GameRoom,
  GameRoomMessage,
  GameRoomStatus,
  GameRoundQuestion,
  GameStats,
} from "./types";

export type RawRecord = Record<string, unknown>;

export function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
}

export function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function normaliseStatus(value: unknown): GameRoomStatus {
  return value === "active" || value === "finished" || value === "waiting" ? value : "waiting";
}

function getFirstString(raw: RawRecord, keys: string[]): string {
  for (const key of keys) {
    const value = toStringValue(raw[key]);
    if (value) return value;
  }
  return "";
}

function getPlayerFallbackName(): string {
  return getLanguageMode() === "EN" ? "Player" : "Игрок";
}

function getOpponentFallbackName(): string {
  return getLanguageMode() === "EN" ? "Opponent" : "Соперник";
}

function getDefaultSeasonTitle(): string {
  return getLanguageMode() === "EN" ? "Season 1" : "Сезон 1";
}

export function normaliseGamePlayerGender(value: unknown): GamePlayerGender {
  const gender = toStringValue(value).toLowerCase();
  if (gender === "male" || gender === "мужской" || gender === "m" || gender === "1") {
    return "male";
  }
  if (gender === "female" || gender === "женский" || gender === "f" || gender === "2") {
    return "female";
  }
  return "";
}

export function mapGamePlayer(value: unknown): GamePlayer {
  const raw = asRecord(value);
  const firstName = getFirstString(raw, ["firstName", "FirstName"]);
  const lastName = getFirstString(raw, ["lastName", "LastName"]);
  const login = getFirstString(raw, ["login", "username", "name", "displayName"]);
  const name = `${firstName} ${lastName}`.trim() || login || getPlayerFallbackName();
  const profileId = getFirstString(raw, ["profileId", "profileID", "ProfileID", "id", "ID"]);
  const userAccountId = getFirstString(raw, [
    "userAccountId",
    "userAccountID",
    "UserAccountID",
    "accountId",
    "accountID",
  ]);
  const isMe = toBoolean(raw.isMe ?? raw.IsMe);
  const avatarId = getFirstString(raw, ["avatarId", "avatarID", "AvatarID"]);
  const avatarUrl = getFirstString(raw, [
    "avatarUrl",
    "avatarURL",
    "avatarLink",
    "imageLink",
    "profileAvatarUrl",
    "ProfileAvatarUrl",
  ]);

  return {
    profileId,
    userAccountId,
    name,
    firstName,
    lastName,
    gender: normaliseGamePlayerGender(raw.gender ?? raw.Gender ?? raw.sex ?? raw.Sex),
    username: getFirstString(raw, ["username", "Username", "login", "Login"]),
    avatarId,
    avatarUrl,
    score: toNumber(raw.score ?? raw.Score),
    isReady: toBoolean(raw.isReady ?? raw.IsReady),
    hasAnswered: toBoolean(raw.hasAnswered ?? raw.HasAnswered),
    pauseUsed: toBoolean(raw.pauseUsed ?? raw.PauseUsed),
    forceResumeRequested: toBoolean(raw.forceResumeRequested ?? raw.ForceResumeRequested),
    isMe,
  };
}

function mapCurrentQuestion(value: unknown): CurrentGameQuestion | null {
  const raw = asRecord(value);
  const text = getFirstString(raw, ["text", "Text"]);
  if (!text) return null;

  return {
    id: getFirstString(raw, ["id", "ID", "questionId", "questionID"]),
    position: toNumber(raw.position ?? raw.Position),
    text,
    startedAt: getFirstString(raw, ["startedAt", "StartedAt"]),
    deadlineAt: getFirstString(raw, ["deadlineAt", "DeadlineAt"]),
    hasAnswered: toBoolean(raw.hasAnswered ?? raw.HasAnswered),
  };
}

export function mapGameAnswer(value: unknown, profileIdFallback = ""): GameAnswer {
  const raw = asRecord(value);
  const answerValue = raw.answer ?? raw.Answer;
  const distanceValue = raw.distance ?? raw.Distance;

  return {
    profileId:
      getFirstString(raw, ["profileId", "profileID", "ProfileID", "playerId", "playerID"]) ||
      profileIdFallback,
    answer: answerValue === null || answerValue === undefined ? null : toNumber(answerValue),
    distance:
      distanceValue === null || distanceValue === undefined ? null : toNumber(distanceValue),
    answeredAt: getFirstString(raw, ["answeredAt", "AnsweredAt"]),
    responseTimeMs:
      (raw.responseTimeMs === null || raw.responseTimeMs === undefined) &&
      (raw.ResponseTimeMs === null || raw.ResponseTimeMs === undefined)
        ? null
        : toNumber(raw.responseTimeMs ?? raw.ResponseTimeMs),
    isWinner: toBoolean(raw.isWinner ?? raw.IsWinner),
  };
}

export function mapGameAnswers(value: unknown): GameAnswer[] {
  if (Array.isArray(value)) {
    return value.map((item) => mapGameAnswer(item)).filter((answer) => answer.profileId);
  }

  const raw = asRecord(value);
  return Object.entries(raw)
    .map(([profileId, answer]) => {
      if (answer && typeof answer === "object") {
        return mapGameAnswer(answer, profileId);
      }
      return {
        profileId,
        answer: answer === null || answer === undefined ? null : toNumber(answer),
        distance: null,
        answeredAt: "",
        responseTimeMs: null,
        isWinner: false,
      };
    })
    .filter((answer) => answer.profileId);
}

function getRoomPlayersWithCreator(
  players: GamePlayer[],
  creator: GamePlayer | null,
  createdByProfileId: string,
  isPublicLobby: boolean,
): GamePlayer[] {
  if (isPublicLobby || !creator?.profileId) return players;
  if (createdByProfileId && creator.profileId !== createdByProfileId) return players;
  if (players.some((player) => player.profileId === creator.profileId)) return players;
  return [creator, ...players];
}

export function mapRoundQuestion(value: unknown): GameRoundQuestion {
  const raw = asRecord(value);
  const question = asRecord(raw.question ?? raw.Question);
  const statusRaw = String(raw.status ?? raw.Status ?? "");
  const correctAnswer =
    raw.correctAnswer ?? raw.CorrectAnswer ?? question.correctAnswer ?? question.CorrectAnswer;
  const winnerProfileId = getFirstString(raw, [
    "winnerProfileId",
    "winnerProfileID",
    "WinnerProfileID",
  ]);
  const answers = mapGameAnswers(raw.answers ?? raw.Answers).map((answer) => ({
    ...answer,
    isWinner: answer.isWinner || (Boolean(winnerProfileId) && answer.profileId === winnerProfileId),
  }));

  return {
    id:
      getFirstString(raw, ["id", "ID", "questionId", "questionID"]) ||
      getFirstString(question, ["id", "ID", "questionId", "questionID"]),
    position: toNumber(raw.position ?? raw.Position),
    status:
      statusRaw === "active" || statusRaw === "completed" || statusRaw === "pending"
        ? statusRaw
        : "pending",
    text: getFirstString(raw, ["text", "Text"]) || getFirstString(question, ["text", "Text"]),
    correctAnswer:
      correctAnswer === null || correctAnswer === undefined ? null : toNumber(correctAnswer),
    answers,
    winnerProfileId,
    startedAt: getFirstString(raw, ["startedAt", "StartedAt"]),
    deadlineAt: getFirstString(raw, ["deadlineAt", "DeadlineAt"]),
    completedAt: getFirstString(raw, ["completedAt", "CompletedAt"]),
  };
}

export function mapRoom(value: unknown): GameRoom {
  const raw = asRecord(value);
  const isPublicLobby = toBoolean(raw.isPublicLobby ?? raw.IsPublicLobby ?? raw.publicLobby);
  const createdByProfileId = getFirstString(raw, [
    "createdByProfileId",
    "createdByProfileID",
    "CreatedByProfileID",
    "creatorProfileId",
    "creatorProfileID",
  ]);
  const creator = raw.creator || raw.Creator ? mapGamePlayer(raw.creator ?? raw.Creator) : null;
  const players = asArray(raw.players ?? raw.Players)
    .map(mapGamePlayer)
    .filter((player) => player.profileId);

  return {
    id: getFirstString(raw, ["id", "ID", "roomId", "roomID"]),
    title: getFirstString(raw, [
      "title",
      "Title",
      "name",
      "Name",
      "roomTitle",
      "RoomTitle",
      "roomName",
      "RoomName",
    ]),
    inviteCode: getFirstString(raw, ["inviteCode", "InviteCode"]),
    gameType: "number_duel",
    status: normaliseStatus(raw.status ?? raw.Status),
    createdByProfileId,
    maxPlayers: toNumber(raw.maxPlayers ?? raw.MaxPlayers ?? raw.playerLimit ?? raw.PlayerLimit, 2),
    hasPassword: toBoolean(raw.hasPassword ?? raw.HasPassword ?? raw.passwordRequired),
    password: getFirstString(raw, ["password", "Password"]),
    isRanked: toBoolean(raw.isRanked ?? raw.IsRanked),
    isPublicLobby,
    inviteCodeEnabled: toBoolean(
      raw.inviteCodeEnabled ?? raw.InviteCodeEnabled ?? raw.hasInviteCode ?? raw.HasInviteCode,
      Boolean(getFirstString(raw, ["inviteCode", "InviteCode"])),
    ),
    questionCount: toNumber(raw.questionCount ?? raw.QuestionCount, 5),
    answerTimeoutSec: toNumber(raw.answerTimeoutSec ?? raw.AnswerTimeoutSec, 10),
    roundPauseSec: toNumber(raw.roundPauseSec ?? raw.RoundPauseSec, 5),
    currentQuestionIndex: toNumber(raw.currentQuestionIndex ?? raw.CurrentQuestionIndex),
    nextQuestionAt: getFirstString(raw, ["nextQuestionAt", "NextQuestionAt"]),
    pausedByProfileId: getFirstString(raw, [
      "pausedByProfileId",
      "pausedByProfileID",
      "PausedByProfileID",
    ]),
    pauseStartedAt: getFirstString(raw, ["pauseStartedAt", "PauseStartedAt"]),
    pauseUntilAt: getFirstString(raw, ["pauseUntilAt", "PauseUntilAt"]),
    pauseForceVotes: toNumber(raw.pauseForceVotes ?? raw.PauseForceVotes),
    pauseForceVotesRequired: toNumber(raw.pauseForceVotesRequired ?? raw.PauseForceVotesRequired),
    creator,
    players: getRoomPlayersWithCreator(players, creator, createdByProfileId, isPublicLobby),
    currentQuestion: mapCurrentQuestion(raw.currentQuestion ?? raw.CurrentQuestion),
    questions: asArray(raw.questions ?? raw.Questions).map(mapRoundQuestion),
    ratingChanges: asArray(raw.ratingChanges ?? raw.RatingChanges)
      .map(mapRatingChange)
      .filter((change) => change.profileId),
    winnerProfileId: getFirstString(raw, ["winnerProfileId", "winnerProfileID", "WinnerProfileID"]),
    profileStats:
      raw.profileStats || raw.ProfileStats ? mapStats(raw.profileStats ?? raw.ProfileStats) : null,
  };
}

export function mapHistoryItem(value: unknown): GameHistoryItem {
  const raw = asRecord(value);
  const room = mapRoom(raw.room ?? raw.Room ?? {});
  const myScore = toNumber(raw.myScore ?? raw.MyScore);
  const opponentScore = toNumber(raw.opponentScore ?? raw.OpponentScore);
  const result =
    myScore > opponentScore
      ? "win"
      : myScore < opponentScore
        ? "loss"
        : raw.result === "draw"
          ? "draw"
          : myScore === opponentScore
            ? "draw"
            : "unknown";
  const opponentByScore = room.players.find(
    (player) => player.score === opponentScore && myScore !== opponentScore,
  );
  const opponent =
    opponentByScore?.name ||
    room.players.find((player) => !player.isMe)?.name ||
    getFirstString(raw, ["opponentName", "opponent", "OpponentName"]) ||
    getOpponentFallbackName();

  return {
    id: getFirstString(raw, ["id", "ID"]) || room.id,
    roomId: room.id || getFirstString(raw, ["roomId", "roomID"]),
    opponentName: opponent,
    result,
    score: `${myScore}:${opponentScore}`,
    myScore,
    opponentScore,
    createdAt:
      getFirstString(raw, ["createdAt", "CreatedAt", "finishedAt", "FinishedAt"]) ||
      getFirstString(asRecord(raw.room ?? raw.Room), [
        "finishedAt",
        "FinishedAt",
        "createdAt",
        "CreatedAt",
      ]),
  };
}

export function mapStats(value: unknown): GameStats {
  const raw = asRecord(value);
  const won = toNumber(raw.won ?? raw.Won ?? raw.wins ?? raw.Wins);
  const lost = toNumber(raw.lost ?? raw.Lost ?? raw.losses ?? raw.Losses);
  const drawn = toNumber(raw.drawn ?? raw.Drawn ?? raw.draws ?? raw.Draws);
  const played = toNumber(
    raw.played ?? raw.Played ?? raw.gamesPlayed ?? raw.GamesPlayed,
    won + lost + drawn,
  );

  return { played, won, lost, drawn };
}

export function mapRatingChange(value: unknown): GameRatingChange {
  const raw = asRecord(value);
  return {
    profileId: getFirstString(raw, ["profileId", "profileID", "ProfileID"]),
    score: toNumber(raw.score ?? raw.Score),
    place: toNumber(raw.place ?? raw.Place, 1),
    beforeRating: toNumber(raw.beforeRating ?? raw.BeforeRating, 1000),
    afterRating: toNumber(raw.afterRating ?? raw.AfterRating, 1000),
    ratingDelta: toNumber(raw.ratingDelta ?? raw.RatingDelta),
    ratingWeight: toNumber(raw.ratingWeight ?? raw.RatingWeight, 1),
    seasonNumber: toNumber(raw.seasonNumber ?? raw.SeasonNumber, 1),
    seasonTitle: getFirstString(raw, ["seasonTitle", "SeasonTitle"]),
  };
}

export function mapRatingSeason(value: unknown): GameRatingSeason {
  const raw = asRecord(value);
  return {
    seasonNumber: toNumber(raw.seasonNumber ?? raw.SeasonNumber, 1),
    title: getFirstString(raw, ["title", "Title"]) || getDefaultSeasonTitle(),
    startsAt: getFirstString(raw, ["startsAt", "StartsAt"]),
    endsAt: getFirstString(raw, ["endsAt", "EndsAt"]),
  };
}

export function mapLeaderboardEntry(value: unknown): GameLeaderboardEntry {
  const raw = asRecord(value);
  const player =
    raw.player || raw.Player ? mapGamePlayer(raw.player ?? raw.Player) : mapGamePlayer(raw);
  const profileId =
    getFirstString(raw, ["profileId", "profileID", "ProfileID"]) || player.profileId;
  return {
    rank: toNumber(raw.rank ?? raw.Rank, 1),
    profileId,
    player: { ...player, profileId },
    rating: toNumber(raw.rating ?? raw.Rating, 1000),
    gamesPlayed: toNumber(raw.gamesPlayed ?? raw.GamesPlayed),
    wins: toNumber(raw.wins ?? raw.Wins),
    draws: toNumber(raw.draws ?? raw.Draws),
  };
}

export function mapLeaderboard(value: unknown): GameLeaderboard {
  const raw = asRecord(value);
  const gameTypeRaw = getFirstString(raw, ["gameType", "GameType"]);
  return {
    gameType: gameTypeRaw === "number_duel" ? "number_duel" : "number_duel",
    season: mapRatingSeason(raw.season ?? raw.Season),
    entries: asArray(raw.entries ?? raw.Entries).map(mapLeaderboardEntry),
  };
}

export function mapRoomMessage(value: unknown): GameRoomMessage {
  const raw = asRecord(value);
  const author = asRecord(raw.author ?? raw.Author);
  const authorFirstName =
    getFirstString(raw, ["authorFirstName", "AuthorFirstName", "firstName", "FirstName"]) ||
    getFirstString(author, ["firstName", "FirstName"]);
  const authorLastName =
    getFirstString(raw, ["authorLastName", "AuthorLastName", "lastName", "LastName"]) ||
    getFirstString(author, ["lastName", "LastName"]);
  const authorUsername =
    getFirstString(raw, ["authorUsername", "AuthorUsername", "username", "Username", "login"]) ||
    getFirstString(author, ["username", "Username", "login"]);
  const authorName =
    getFirstString(raw, ["authorName", "AuthorName", "name", "Name", "displayName"]) ||
    getFirstString(author, ["name", "Name", "displayName"]) ||
    `${authorFirstName} ${authorLastName}`.trim() ||
    authorUsername ||
    getPlayerFallbackName();
  const authorAvatarId =
    getFirstString(raw, ["authorAvatarId", "authorAvatarID", "AuthorAvatarID", "avatarId"]) ||
    getFirstString(author, ["avatarId", "avatarID", "AvatarID"]);
  const authorAvatarUrl =
    getFirstString(raw, [
      "authorAvatarUrl",
      "authorAvatarURL",
      "avatarUrl",
      "avatarURL",
      "avatarLink",
      "imageLink",
    ]) || getFirstString(author, ["avatarUrl", "avatarURL", "avatarLink", "imageLink"]);

  return {
    id: getFirstString(raw, ["id", "ID", "messageId", "messageID"]),
    roomId: getFirstString(raw, ["roomId", "roomID", "RoomID"]),
    authorProfileId:
      getFirstString(raw, ["authorProfileId", "authorProfileID", "profileId", "profileID"]) ||
      getFirstString(author, ["profileId", "profileID", "ProfileID", "id", "ID"]),
    authorUserAccountId:
      getFirstString(raw, [
        "authorUserAccountId",
        "authorUserAccountID",
        "userAccountId",
        "userAccountID",
      ]) || getFirstString(author, ["userAccountId", "userAccountID", "UserAccountID"]),
    authorName,
    authorFirstName,
    authorLastName,
    authorUsername,
    authorAvatarId,
    authorAvatarUrl,
    text: getFirstString(raw, ["text", "Text", "messageText", "MessageText"]),
    createdAt: getFirstString(raw, ["createdAt", "CreatedAt"]),
  };
}

export function extractRoomResponse(value: unknown): GameRoom {
  const raw = asRecord(value);
  return mapRoom(raw.room ?? raw.Room ?? value);
}

export function extractGameRoomFromResponse(value: unknown): GameRoom | null {
  const room = extractRoomResponse(value);
  return room.id ? room : null;
}

export function extractRoomMessageResponse(value: unknown): GameRoomMessage {
  const raw = asRecord(value);
  return mapRoomMessage(raw.message ?? raw.Message ?? value);
}
