import type { CreateGameRoomPayload, GameRoom, JoinGameRoomPayload } from "../../../../api/games";
import type { GamesPageState } from "../../state/store";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type CreateRoomActionOptions = {
  payload: CreateGameRoomPayload;
  title: string;
  password: string;
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  rememberRoomTitle: (roomId: string, title: string) => void;
  rememberRoomAccess: (room: GameRoom, access?: { password?: string; inviteCode?: string }) => void;
  navigateToRoom: (roomId: string) => void;
  onDuplicateTitle: (message: string) => void;
  setGamesState: SetGamesState;
};

export type JoinRoomByCodeActionOptions = {
  inviteCode: string;
  password: string;
  payload: JoinGameRoomPayload;
  rememberRoomAccess: (room: GameRoom, access?: { password?: string; inviteCode?: string }) => void;
  navigateToRoom: (roomId: string) => void;
  navigateToGamesMenu: () => void;
  showRoomFullMessage: () => void;
  loadWaitingRooms: (options: { preserveMessage: boolean; silent: boolean }) => Promise<void>;
  setGamesState: SetGamesState;
  setGamesOverlayState: SetGamesState;
};

export type JoinOwnListedRoomActionOptions = {
  room: GameRoom;
  rememberRoomAccess: (room: GameRoom) => void;
  navigateToRoom: (roomId: string) => void;
  loadWaitingRooms: (options: { preserveMessage: boolean; silent: boolean }) => Promise<void>;
  setGamesState: SetGamesState;
};

export type JoinListedRoomActionOptions = {
  roomId: string;
  inviteCode: string;
  password: string;
  payload: JoinGameRoomPayload;
  listedRoom: GameRoom | undefined;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
  rememberRoomAccess: (room: GameRoom, access?: { password?: string; inviteCode?: string }) => void;
  navigateToRoom: (roomId: string) => void;
  navigateToGamesMenu: () => void;
  showRoomFullMessage: () => void;
  loadWaitingRooms: (options: { preserveMessage: boolean; silent: boolean }) => Promise<void>;
  setGamesState: SetGamesState;
  setGamesOverlayState: SetGamesState;
};
