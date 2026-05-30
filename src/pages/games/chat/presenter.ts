/**
 * Presenter чата игровой комнаты.
 *
 * Собирает view-model сообщений из состояния комнаты и оставляет render-слой
 * без знания о runtime-состоянии страницы.
 */
import type { GameRoom, GameRoomMessage } from "../../../api/games";
import type { GamesPageState } from "../state/store";
import { isRoomSystemMessage } from "./model";
import {
  formatRoomChatTime,
  renderRoomChat,
  type RoomChatProfileLinkOptions,
  type RoomChatRenderMessage,
} from "./render";
import { normalizeRenderedSystemMessageText } from "../room/profile/system-messages";

type RoomChatPresenterState = Pick<
  GamesPageState,
  | "roomChatMessages"
  | "roomChatShowSystemMessages"
  | "roomChatLoading"
  | "roomChatSending"
  | "roomChatError"
  | "roomChatDraft"
>;

type RoomChatPresenterAdapter = {
  getRoomChatAuthorName: (room: GameRoom, message: GameRoomMessage) => string;
  getRoomChatAuthorFirstName: (room: GameRoom, message: GameRoomMessage) => string;
  getRoomChatAuthorAvatar: (room: GameRoom, message: GameRoomMessage) => string;
  getRoomChatPlayer: (
    room: GameRoom,
    message: GameRoomMessage,
  ) => GameRoom["players"][number] | null | undefined;
  renderProfileLink: (options: RoomChatProfileLinkOptions) => string;
};

export type RenderRoomChatPresenterOptions = RoomChatPresenterAdapter & {
  state: RoomChatPresenterState;
  room: GameRoom;
};

/**
 * Собирает render-модель одного сообщения чата.
 */
export function getRoomChatRenderMessage(
  message: GameRoomMessage,
  room: GameRoom,
  adapter: RoomChatPresenterAdapter,
): RoomChatRenderMessage {
  const systemMessage = isRoomSystemMessage(message);
  const authorName = adapter.getRoomChatAuthorName(room, message);
  const firstName = adapter.getRoomChatAuthorFirstName(room, message);
  const avatarUrl = adapter.getRoomChatAuthorAvatar(room, message);
  const timeLabel = formatRoomChatTime(message.createdAt);
  const player = adapter.getRoomChatPlayer(room, message);
  const authorProfileId = player?.profileId || message.authorProfileId;
  const canOpenProfile = room.status !== "waiting" && Boolean(authorProfileId);

  return {
    message,
    isSystemMessage: systemMessage,
    authorName,
    firstName,
    avatarUrl,
    authorProfileId,
    canOpenProfile,
    text: systemMessage ? normalizeRenderedSystemMessageText(message.text) : message.text,
    timeLabel,
  };
}

/**
 * Рендерит чат комнаты из текущего состояния страницы.
 */
export function renderRoomChatPresenter(options: RenderRoomChatPresenterOptions): string {
  const messages = options.state.roomChatShowSystemMessages
    ? options.state.roomChatMessages
    : options.state.roomChatMessages.filter((message) => !isRoomSystemMessage(message));
  const hasHiddenSystemMessages =
    !options.state.roomChatShowSystemMessages &&
    options.state.roomChatMessages.some((message) => isRoomSystemMessage(message));
  const inputDisabled =
    options.state.roomChatSending || (!options.room.isPublicLobby && !options.room.players.length);

  return renderRoomChat({
    messages: messages.map((message) => getRoomChatRenderMessage(message, options.room, options)),
    hasHiddenSystemMessages,
    showSystemMessages: options.state.roomChatShowSystemMessages,
    loading: options.state.roomChatLoading,
    sending: options.state.roomChatSending,
    error: options.state.roomChatError,
    draft: options.state.roomChatDraft,
    inputDisabled,
    renderProfileLink: options.renderProfileLink,
  });
}
