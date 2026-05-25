import { disbandGameRoom, leaveGameRoom, type GameRoom } from "../../../api/games";
import { getDisbandRoomSuccessPatch } from "../state/action-patches";
import type { GamesPageState } from "../state/store";
import { isCurrentRoomCreator } from "../room/selectors";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type DisbandCurrentRoomOptions = {
  room: GameRoom | null;
  currentProfileId: string;
  clearPendingVoluntaryLeave: (roomId?: string) => void;
  forgetRoomAccess: (roomId: string) => void;
  closeRoomSocket: () => void;
  navigateAfterDisband: () => void;
  setGamesState: SetGamesState;
};

export type ExitRoomToMenuOptions = {
  room: GameRoom | null;
  currentProfileId: string;
  forgetRoomAccess: (roomId: string) => void;
  closeRoomSocket: () => void;
  stopRoomChat: () => void;
  resetGamesState: () => void;
  navigateToGamesMenu: () => void;
  setGamesState: SetGamesState;
};

/**
 * Распускает комнату ожидания от имени администратора.
 */
export async function disbandCurrentRoom(options: DisbandCurrentRoomOptions): Promise<void> {
  const { room, setGamesState } = options;
  if (!room || room.status !== "waiting") return;
  if (!isCurrentRoomCreator(room, options.currentProfileId)) {
    setGamesState({
      message: "",
      error: "Распустить комнату может только администратор.",
      errorTarget: "footer",
    });
    return;
  }

  setGamesState({ loading: true, message: "Распускаем комнату...", error: "", errorTarget: "" });
  options.clearPendingVoluntaryLeave(room.id);
  options.forgetRoomAccess(room.id);
  await disbandGameRoom(room.id);
  setGamesState(getDisbandRoomSuccessPatch());
  options.closeRoomSocket();
  options.navigateAfterDisband();
}

/**
 * Выводит пользователя из комнаты и возвращает на каталог игр.
 */
export async function exitRoomToMenu(options: ExitRoomToMenuOptions): Promise<void> {
  const { room, setGamesState } = options;
  if (!room) return;

  if (room.status === "waiting" && !isCurrentRoomCreator(room, options.currentProfileId)) {
    setGamesState({ loading: true, message: "Выходим из комнаты...", error: "", errorTarget: "" });
    try {
      options.forgetRoomAccess(room.id);
      await leaveGameRoom(room.id);
    } catch (error) {
      setGamesState({ loading: false, message: "", error: "", errorTarget: "" });
      throw error;
    }
  }

  options.closeRoomSocket();
  options.stopRoomChat();
  options.resetGamesState();
  options.navigateToGamesMenu();
}
