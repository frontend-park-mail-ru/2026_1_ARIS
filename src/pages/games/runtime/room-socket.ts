import type { GameRoomSocketHandlers, GameRoomSocketSubscription } from "../../../api/games";

export type GamesRoomSocketRuntime = {
  sync: (roomId: string) => void;
  close: () => void;
  isOpen: () => boolean;
  sendAnswer: (answer: number) => boolean;
};

export type CreateGamesRoomSocketRuntimeOptions = {
  subscribe: (roomId: string, handlers: GameRoomSocketHandlers) => GameRoomSocketSubscription;
  handlers: GameRoomSocketHandlers;
};

/** Создаёт runtime-обвязку для WebSocket-подписки игровой комнаты. */
export function createGamesRoomSocketRuntime(
  options: CreateGamesRoomSocketRuntimeOptions,
): GamesRoomSocketRuntime {
  let subscription: GameRoomSocketSubscription | null = null;
  let subscribedRoomId = "";

  const close = () => {
    subscription?.close();
    subscription = null;
    subscribedRoomId = "";
  };

  return {
    sync(roomId) {
      if (!roomId) {
        close();
        return;
      }

      if (subscribedRoomId === roomId) return;

      close();
      subscription = options.subscribe(roomId, options.handlers);
      subscribedRoomId = roomId;
    },
    close,
    isOpen() {
      return subscription?.isOpen() ?? false;
    },
    sendAnswer(answer) {
      return subscription?.sendAnswer(answer) ?? false;
    },
  };
}
