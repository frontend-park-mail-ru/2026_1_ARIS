import type { GameRoomMessage } from "../../../api/games";
import { getLanguageMode } from "../../../state/language";
import { escapeHtml, renderAvatarMarkup } from "../../../utils/avatar";
import { gameT } from "../shared/i18n";

export type RoomChatProfileLinkOptions = {
  profileId: string;
  className: string;
  label: string;
  content: string;
  avatarUrl?: string;
  ariaLabel?: string;
};

export type RoomChatRenderMessage = {
  message: GameRoomMessage;
  isSystemMessage: boolean;
  authorName: string;
  firstName: string;
  avatarUrl: string;
  authorProfileId: string;
  canOpenProfile: boolean;
  text: string;
  timeLabel: string;
};

/** Рендерит одно сообщение чата комнаты. */
export function renderRoomChatMessage(
  item: RoomChatRenderMessage,
  renderProfileLink: (options: RoomChatProfileLinkOptions) => string,
): string {
  const avatarMarkup = item.isSystemMessage
    ? `<span class="games-room-chat-message__avatar games-room-chat-message__avatar--server avatar-fallback" role="img" aria-label="${escapeHtml(item.authorName)}">S</span>`
    : renderAvatarMarkup("games-room-chat-message__avatar", item.authorName, item.avatarUrl, {
        width: 28,
        height: 28,
      });

  return `
    <article class="games-room-chat-message${item.isSystemMessage ? " games-room-chat-message--system" : ""}" data-games-room-chat-message="${escapeHtml(item.message.id)}">
      <div class="games-room-chat-message__header">
        ${
          item.canOpenProfile
            ? renderProfileLink({
                profileId: item.authorProfileId,
                className: "games-room-chat-message__avatar-link",
                label: item.authorName,
                content: avatarMarkup,
                avatarUrl: item.avatarUrl,
                ariaLabel: gameT("leaderboard.openProfile", { name: item.authorName }),
              })
            : avatarMarkup
        }
        ${
          item.canOpenProfile
            ? renderProfileLink({
                profileId: item.authorProfileId,
                className: "games-room-chat-message__name",
                label: item.authorName,
                content: escapeHtml(item.firstName),
                avatarUrl: item.avatarUrl,
              })
            : `<span class="games-room-chat-message__name">${escapeHtml(item.firstName)}</span>`
        }
        ${
          item.timeLabel
            ? `<time class="games-room-chat-message__time" datetime="${escapeHtml(item.message.createdAt)}">${escapeHtml(item.timeLabel)}</time>`
            : ""
        }
      </div>
      <p class="games-room-chat-message__text">${escapeHtml(item.text)}</p>
    </article>
  `;
}

/** Рендерит чат комнаты с фильтром системных сообщений и формой отправки. */
export function renderRoomChat(options: {
  messages: RoomChatRenderMessage[];
  hasHiddenSystemMessages: boolean;
  showSystemMessages: boolean;
  loading: boolean;
  sending: boolean;
  error: string;
  draft: string;
  inputDisabled: boolean;
  renderProfileLink: (options: RoomChatProfileLinkOptions) => string;
}): string {
  const hasMessages = options.messages.length > 0;
  const loadingText = gameT("chat.loading");
  const chatIsRecovering =
    options.error === loadingText || options.error === "Идет загрузка сообщений...";

  return `
    <aside class="games-room-chat content-card" aria-label="${escapeHtml(gameT("chat.roomAria"))}">
      <header class="games-room-chat__header">
        <h2 class="games-room-chat__title">${escapeHtml(gameT("chat.title"))}</h2>
        <label class="games-room-chat__system-toggle">
          <input
            class="games-room-chat__system-toggle-input"
            type="checkbox"
            data-games-room-chat-system-toggle
            ${options.showSystemMessages ? "checked" : ""}
          >
          <span class="games-room-chat__system-toggle-box" aria-hidden="true"></span>
          <span class="games-room-chat__system-toggle-text">${escapeHtml(gameT("chat.showSystem"))}</span>
        </label>
      </header>
      <div class="games-room-chat__messages" data-games-room-chat-messages>
        ${
          (options.loading || chatIsRecovering) && !hasMessages
            ? `<p class="games-room-chat__empty">${escapeHtml(loadingText)}</p>`
            : hasMessages
              ? options.messages
                  .map((message) => renderRoomChatMessage(message, options.renderProfileLink))
                  .join("")
              : `<p class="games-room-chat__empty">${escapeHtml(options.hasHiddenSystemMessages ? gameT("chat.hidden") : gameT("chat.empty"))}</p>`
        }
      </div>
      ${
        options.error && !chatIsRecovering
          ? `<p class="games-room-chat__error">${escapeHtml(options.error)}</p>`
          : ""
      }
      <form class="games-room-chat__form" data-games-room-chat-form>
        <textarea
          class="games-room-chat__input"
          name="text"
          rows="2"
          maxlength="500"
          placeholder="${escapeHtml(gameT("chat.messagePlaceholder"))}"
          data-games-room-chat-input
          ${options.inputDisabled ? "disabled" : ""}
        >${escapeHtml(options.draft)}</textarea>
        <button type="submit" class="games-button games-button--primary games-room-chat__send" ${options.inputDisabled ? "disabled" : ""}>
          ${escapeHtml(options.sending ? gameT("chat.sending") : gameT("chat.send"))}
        </button>
      </form>
    </aside>
  `;
}

/** Форматирует время сообщения комнаты для компактного отображения. */
export function formatRoomChatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(getLanguageMode() === "EN" ? "en-US" : "ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
