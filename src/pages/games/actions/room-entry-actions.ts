import type { GameRoom } from "../../../api/games";
import type { GamesPageState } from "../state/store";
import { joinOwnListedRoomAction } from "./room-entry";
import {
  createRoomFromFormAction,
  joinListedRoomFromFormAction,
  joinRoomByCodeFromFormAction,
} from "./room-entry-forms";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type RoomEntryActionsOptions = {
  getRooms: () => GameRoom[];
  hydrateRoom: (room: GameRoom) => Promise<GameRoom>;
  shouldBlockFullRoomJoin: (room: GameRoom) => boolean;
  rememberRoomTitle: (roomId: string, title: string) => void;
  rememberRoomAccess: (room: GameRoom, access?: { password?: string; inviteCode?: string }) => void;
  navigateToRoom: (roomId: string) => void;
  navigateToGamesMenu: () => void;
  showRoomFullMessage: () => void;
  loadWaitingRooms: (options?: { preserveMessage?: boolean; silent?: boolean }) => Promise<void>;
  setGamesState: SetGamesState;
  setGamesOverlayState: SetGamesState;
};

/**
 * Создаёт фасад действий входа и создания игровой комнаты.
 */
export function createRoomEntryActions(options: RoomEntryActionsOptions) {
  /**
   * Создаёт комнату из формы лобби.
   */
  async function handleCreateRoom(form: HTMLFormElement): Promise<void> {
    await createRoomFromFormAction(form, {
      hydrateRoom: options.hydrateRoom,
      rememberRoomTitle: options.rememberRoomTitle,
      rememberRoomAccess: options.rememberRoomAccess,
      navigateToRoom: options.navigateToRoom,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Входит в комнату по коду приглашения.
   */
  async function handleJoinRoom(form: HTMLFormElement): Promise<void> {
    await joinRoomByCodeFromFormAction(form, {
      rememberRoomAccess: options.rememberRoomAccess,
      navigateToRoom: options.navigateToRoom,
      navigateToGamesMenu: options.navigateToGamesMenu,
      showRoomFullMessage: options.showRoomFullMessage,
      loadWaitingRooms: options.loadWaitingRooms,
      setGamesState: options.setGamesState,
      setGamesOverlayState: options.setGamesOverlayState,
    });
  }

  /**
   * Входит в свою комнату из списка без повторного join.
   */
  async function handleJoinOwnListedRoom(room: GameRoom): Promise<void> {
    await joinOwnListedRoomAction({
      room,
      rememberRoomAccess: options.rememberRoomAccess,
      navigateToRoom: options.navigateToRoom,
      loadWaitingRooms: options.loadWaitingRooms,
      setGamesState: options.setGamesState,
    });
  }

  /**
   * Входит в выбранную комнату из списка комнат.
   */
  async function handleJoinListedRoom(form: HTMLFormElement): Promise<void> {
    await joinListedRoomFromFormAction(form, {
      rooms: options.getRooms(),
      shouldBlockFullRoomJoin: options.shouldBlockFullRoomJoin,
      rememberRoomAccess: options.rememberRoomAccess,
      navigateToRoom: options.navigateToRoom,
      navigateToGamesMenu: options.navigateToGamesMenu,
      showRoomFullMessage: options.showRoomFullMessage,
      loadWaitingRooms: options.loadWaitingRooms,
      setGamesState: options.setGamesState,
      setGamesOverlayState: options.setGamesOverlayState,
    });
  }

  return {
    handleCreateRoom,
    handleJoinRoom,
    handleJoinOwnListedRoom,
    handleJoinListedRoom,
  };
}
