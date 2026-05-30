/**
 * Типы API игрового микросервиса.
 *
 * Описывают клиентские контракты комнат, игроков, рейтинга, чата и WebSocket.
 */
export type GameType = "number_duel";
export type GameRoomStatus = "waiting" | "active" | "finished";
export type GamePlayerGender = "" | "male" | "female";

export type GamePlayer = {
  profileId: string;
  userAccountId: string;
  name: string;
  firstName: string;
  lastName: string;
  gender: GamePlayerGender;
  username: string;
  avatarId: string;
  avatarUrl: string;
  score: number;
  isReady: boolean;
  hasAnswered: boolean;
  pauseUsed: boolean;
  forceResumeRequested: boolean;
  isMe: boolean;
};

export type GameAnswer = {
  profileId: string;
  answer: number | null;
  distance: number | null;
  answeredAt: string;
  responseTimeMs: number | null;
  isWinner: boolean;
};

export type GameRoundQuestion = {
  id: string;
  position: number;
  status: "pending" | "active" | "completed";
  text: string;
  correctAnswer: number | null;
  answers: GameAnswer[];
  winnerProfileId: string;
  startedAt: string;
  deadlineAt: string;
  completedAt: string;
};

export type CurrentGameQuestion = {
  id: string;
  position: number;
  text: string;
  startedAt: string;
  deadlineAt: string;
  hasAnswered: boolean;
};

export type GameStats = {
  played: number;
  won: number;
  lost: number;
  drawn: number;
};

export type GameRatingChange = {
  profileId: string;
  score: number;
  place: number;
  beforeRating: number;
  afterRating: number;
  ratingDelta: number;
  ratingWeight: number;
  seasonNumber: number;
  seasonTitle: string;
};

export type GameRoom = {
  id: string;
  title: string;
  inviteCode: string;
  gameType: GameType;
  status: GameRoomStatus;
  createdByProfileId: string;
  maxPlayers: number;
  hasPassword: boolean;
  password: string;
  isRanked: boolean;
  isPublicLobby?: boolean;
  inviteCodeEnabled: boolean;
  questionCount: number;
  answerTimeoutSec: number;
  roundPauseSec?: number;
  currentQuestionIndex: number;
  nextQuestionAt: string;
  pausedByProfileId: string;
  pauseStartedAt: string;
  pauseUntilAt: string;
  pauseForceVotes: number;
  pauseForceVotesRequired: number;
  creator: GamePlayer | null;
  players: GamePlayer[];
  currentQuestion: CurrentGameQuestion | null;
  questions: GameRoundQuestion[];
  ratingChanges: GameRatingChange[];
  winnerProfileId: string;
  profileStats: GameStats | null;
};

export type GameRatingSeason = {
  seasonNumber: number;
  title: string;
  startsAt: string;
  endsAt: string;
};

export type GameLeaderboardEntry = {
  rank: number;
  profileId: string;
  player: GamePlayer;
  rating: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
};

export type GameLeaderboard = {
  gameType: GameType;
  season: GameRatingSeason;
  entries: GameLeaderboardEntry[];
};

export type GameRoomMessage = {
  id: string;
  roomId: string;
  authorProfileId: string;
  authorUserAccountId: string;
  authorName: string;
  authorFirstName: string;
  authorLastName: string;
  authorUsername: string;
  authorAvatarId: string;
  authorAvatarUrl: string;
  text: string;
  createdAt: string;
};

export type CreateGameRoomPayload = {
  title: string;
  questionCount: number;
  answerTimeoutSec: number;
  roundPauseSec: number;
  gameType: GameType;
  maxPlayers?: number;
  password?: string;
  isRanked?: boolean;
  inviteCodeEnabled?: boolean;
};

export type JoinGameRoomPayload = {
  inviteCode?: string;
  roomId?: string;
  password?: string;
};

export type GameHistoryItem = {
  id: string;
  roomId: string;
  opponentName: string;
  result: "win" | "loss" | "draw" | "unknown";
  score: string;
  myScore: number;
  opponentScore: number;
  createdAt: string;
};

export type GameRoomSocketHandlers = {
  onRoom: (room: GameRoom) => void;
  onRoomMessage?: (message: GameRoomMessage) => void;
  onUnavailable?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
};

export type GameRoomSocketSubscription = {
  sendAnswer: (answer: number) => boolean;
  isOpen: () => boolean;
  close: () => void;
};
