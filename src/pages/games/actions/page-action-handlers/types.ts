import type { GameRoom, GameRoomMessage } from "../../../../api/games";
import type { PendingVoluntaryLeave } from "../../room/lifecycle";
import type { RoomChatRefreshOptions, RoomChatStatePatch } from "../../runtime/dom-updaters";
import type { GamesRoomChatRuntime } from "../../runtime/room-chat";
import type { GamesRoomSocketRuntime } from "../../runtime/room-socket";
import type { GamesPageState } from "../../state/store";
import type { PendingRankedToast } from "../room-live";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type GamesPageActionHandlersOptions = {
  getState: () => Readonly<GamesPageState>;
  getCurrentProfileId: () => string;
  getCurrentPlayer: (room: GameRoom | null) => GameRoom["players"][number] | null | undefined;
  isCurrentRoomCreator: (room: GameRoom) => boolean;
  isRoomCreatedByCurrentUser: (room: GameRoom) => boolean;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
  getRoomTitleValue: (room: GameRoom) => string;
  getPlayerAvatarUrl: (player: GameRoom["players"][number]) => string;
  hydrateGamePlayersAvatars: (players: GameRoom["players"]) => Promise<GameRoom["players"]>;
  hydrateGameRoomAvatars: (room: GameRoom) => Promise<GameRoom>;
  hydrateGameRoomsAvatars: (rooms: GameRoom[]) => Promise<GameRoom[]>;
  hydrateRoomChatAuthorAvatars: (
    room: GameRoom | null,
    messages: GameRoomMessage[],
  ) => Promise<string[]>;
  getRoomSystemMessages: (previousRoom: GameRoom | null, nextRoom: GameRoom) => GameRoomMessage[];
  mergeRoomChatMessages: (
    existing: GameRoomMessage[],
    incoming: GameRoomMessage[],
  ) => GameRoomMessage[];
  rememberRoomAccess: (room: GameRoom) => void;
  rememberRoomTitle: (roomId: string, title: string) => void;
  forgetRoomAccess: (roomId?: string) => void;
  clearRoomAccessRecovery: (roomId?: string) => void;
  canRecoverRoomAccess: (roomId: string) => boolean;
  recoverRoomAccess: (roomId: string) => Promise<GameRoom | null>;
  getPendingVoluntaryLeave: () => PendingVoluntaryLeave | null;
  setPendingVoluntaryLeave: (pending: PendingVoluntaryLeave | null) => void;
  clearPendingVoluntaryLeave: (roomId?: string) => void;
  getPendingRankedToast: () => PendingRankedToast | null;
  setPendingRankedToast: (toast: PendingRankedToast | null) => void;
  getRankedTypeToastMessage: (isRanked: boolean) => string;
  showRoomFullMessage: () => void;
  rememberRoomDisconnectRemovalMessage: (message: GameRoomMessage) => void;
  roomSocketRuntime: Pick<GamesRoomSocketRuntime, "close" | "isOpen" | "sendAnswer">;
  roomChatRuntime: Pick<GamesRoomChatRuntime, "stop">;
  refreshGamesDom: () => void;
  refreshRoomChatDom: (options?: RoomChatRefreshOptions) => void;
  setGamesState: SetGamesState;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  resetGamesState: () => void;
  setGamesOverlayState: SetGamesState;
  setRoomChatState: (patch: RoomChatStatePatch, options?: RoomChatRefreshOptions) => void;
  syncCurrentAnswerFormDom: () => void;
  syncPlayersRailAnswerDom: (room: GameRoom | null) => void;
  acceptCurrentAnswerLocally: (answer: number, room?: GameRoom | null) => void;
  reportingQuestionKeys: Set<string>;
  reportedQuestionKeys: Set<string>;
  syncQuestionReportButtons: (questionKey: string) => void;
  enrichOwnRoomChatMessage: (room: GameRoom, message: GameRoomMessage) => GameRoomMessage;
  getRoomChatAuthorAvatar: (room: GameRoom | null, message: GameRoomMessage) => string;
};
