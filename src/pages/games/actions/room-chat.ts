import { sendGameRoomMessage, type GameRoom, type GameRoomMessage } from "../../../api/games";
import { getInputValue } from "../shared/forms";
import type { GamesPageState } from "../state/store";

type RoomChatStatePatch = Pick<
  Partial<GamesPageState>,
  "roomChatMessages" | "roomChatSending" | "roomChatError" | "roomChatDraft"
>;

type RoomChatStateOptions = {
  scrollToBottom?: boolean;
  forceScrollToBottom?: boolean;
};

export type SubmitRoomChatMessageOptions = {
  room: GameRoom | null;
  sending: boolean;
  text: string;
  currentMessages: GameRoomMessage[];
  getCurrentRoom: () => GameRoom | null;
  enrichOwnMessage: (room: GameRoom, message: GameRoomMessage) => GameRoomMessage;
  getAuthorAvatar: (room: GameRoom, message: GameRoomMessage) => string;
  hydrateAuthorAvatars: (room: GameRoom, messages: GameRoomMessage[]) => Promise<string[]>;
  prepareAvatarLinks: (avatarLinks: string[]) => void | Promise<void>;
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  refreshChat: (options: RoomChatStateOptions) => void;
  setChatState: (patch: RoomChatStatePatch, options?: RoomChatStateOptions) => void;
};

export type SubmitRoomChatFormOptions = Omit<SubmitRoomChatMessageOptions, "text">;

/**
 * Отправляет сообщение в чат комнаты и обновляет локальную ленту сообщений.
 */
export async function submitRoomChatMessage(options: SubmitRoomChatMessageOptions): Promise<void> {
  const { room, text } = options;
  if (!room || options.sending || !text.trim()) return;

  options.setChatState({ roomChatSending: true, roomChatError: "" }, { scrollToBottom: false });
  const message = options.enrichOwnMessage(room, await sendGameRoomMessage(room.id, text));

  if (options.getCurrentRoom()?.id !== room.id) {
    options.setChatState({ roomChatSending: false }, { scrollToBottom: false });
    return;
  }

  void options.prepareAvatarLinks([
    options.getAuthorAvatar(options.getCurrentRoom() ?? room, message),
  ]);
  void options
    .hydrateAuthorAvatars(options.getCurrentRoom() ?? room, [message])
    .then((avatarLinks) => {
      if (!avatarLinks.length || options.getCurrentRoom()?.id !== room.id) return;
      void options.prepareAvatarLinks(avatarLinks);
      options.refreshChat({ scrollToBottom: true, forceScrollToBottom: true });
    });

  options.setChatState(
    {
      roomChatMessages: options.mergeMessages(options.currentMessages, [message]),
      roomChatDraft: "",
      roomChatSending: false,
      roomChatError: "",
    },
    { scrollToBottom: true, forceScrollToBottom: true },
  );
}

/**
 * Читает текст из формы чата комнаты и отправляет сообщение.
 */
export async function submitRoomChatForm(
  form: HTMLFormElement,
  options: SubmitRoomChatFormOptions,
): Promise<void> {
  await submitRoomChatMessage({
    ...options,
    text: getInputValue(form, "text"),
  });
}
