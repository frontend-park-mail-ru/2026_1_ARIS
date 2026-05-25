/**
 * WebSocket API игровой комнаты.
 *
 * Подписывается на live-состояние комнаты и сообщения чата.
 */
import type { GameRoomSocketHandlers, GameRoomSocketSubscription } from "./types";
import { extractRoomMessageResponse, extractRoomResponse, type RawRecord } from "./mappers";

function getGameSocketUrl(roomId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/games/${encodeURIComponent(roomId)}`;
}

export function subscribeToGameRoom(
  roomId: string,
  handlers: GameRoomSocketHandlers,
): GameRoomSocketSubscription {
  let socket: WebSocket | null = null;
  let retries = 0;
  let intentionalClose = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect(): void {
    if (intentionalClose) return;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    socket = new WebSocket(getGameSocketUrl(roomId));

    socket.addEventListener("message", (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as RawRecord;
        const eventType = String(payload.type ?? payload.Type ?? "");
        if (
          eventType === "room_message" ||
          eventType === "room_chat_message" ||
          payload.message ||
          payload.Message
        ) {
          const message = extractRoomMessageResponse(payload);
          if (message.id) handlers.onRoomMessage?.(message);
        } else if (eventType === "room_state" || payload.room || payload.Room) {
          handlers.onRoom(extractRoomResponse(payload));
        } else if (eventType === "room_updated") {
          handlers.onUnavailable?.();
        }
      } catch (error) {
        console.error("[games] failed to parse websocket message", error);
      }
    });

    socket.addEventListener("open", () => {
      retries = 0;
      handlers.onOpen?.();
    });

    socket.addEventListener("error", () => {
      handlers.onError?.();
    });

    socket.addEventListener("close", () => {
      handlers.onClose?.();
      if (intentionalClose) return;
      const delay = Math.min(1000 * 2 ** retries, 15_000) + Math.random() * 400;
      retries += 1;
      reconnectTimer = setTimeout(connect, delay);
    });
  }

  connect();

  return {
    sendAnswer: (answer: number): boolean => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;
      socket.send(JSON.stringify({ type: "submit_answer", answer }));
      return true;
    },
    isOpen: (): boolean => Boolean(socket && socket.readyState === WebSocket.OPEN),
    close: (): void => {
      intentionalClose = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (
        socket &&
        (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
      ) {
        socket.close();
      }
    },
  };
}
