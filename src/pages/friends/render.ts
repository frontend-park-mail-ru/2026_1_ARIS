/**
 * Рендер страницы друзей.
 *
 * Содержит функции генерации HTML и обновления DOM для страницы.
 */
import { friendsState, getVisibleFriends } from "./state";
import type { DisplayFriend, FriendsTab } from "./types";
import { renderModalCloseButton } from "../../components/modal-close/modal-close";
import { renderAvatarMarkup } from "../../utils/avatar";
import { formatPersonName } from "../../utils/display-name";
import { getLanguageMode } from "../../state/language";
import { t } from "../../state/i18n";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFriendName(friend: DisplayFriend): string {
  return (
    formatPersonName(friend.firstName, friend.lastName, friend.username) ||
    t("widgetbar.userFallback")
  );
}

function renderFriendAvatar(friend: DisplayFriend, className: string): string {
  return renderAvatarMarkup(className, getFriendName(friend), friend.avatarLink);
}

function formatFriendshipSince(createdAt?: string): string {
  if (!createdAt) return "";
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return "";
  const locale = getLanguageMode() === "EN" ? "en-US" : "ru-RU";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" })
    .format(parsed)
    .replace(/\s*г\.$/, "");
}

function getFriendsCountLabel(count: number): string {
  if (getLanguageMode() === "EN") {
    return `${count} ${count === 1 ? t("friends.userNoun") : t("friends.userNounMany")}`;
  }

  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} ${t("friends.userNounMany")}`;
  if (mod10 === 1) return `${count} ${t("friends.userNoun")}`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${t("friends.userNounFew")}`;
  return `${count} ${t("friends.userNounMany")}`;
}

function getFriendsTabTitle(tab: FriendsTab): string {
  const titles: Record<FriendsTab, string> = {
    accepted: t("friends.all"),
    incoming: t("friends.incoming"),
    outgoing: t("friends.outgoing"),
  };
  return titles[tab];
}

function renderFriendActions(friend: DisplayFriend): string {
  if (friendsState.activeTab === "incoming") {
    return `
      <div class="friends-card__actions">
        <button type="button" class="friends-card__action" data-friend-accept="${escapeHtml(friend.profileId)}">
          ${t("friends.accept")}
        </button>
        <button type="button" class="friends-card__action friends-card__action--danger" data-friend-decline="${escapeHtml(friend.profileId)}">
          ${t("friends.decline")}
        </button>
      </div>
    `;
  }

  if (friendsState.activeTab === "outgoing") {
    return `
      <div class="friends-card__actions">
        <button type="button" class="friends-card__action" disabled>${t("friends.sent")}</button>
        <button type="button" class="friends-card__action friends-card__action--danger" data-friend-revoke="${escapeHtml(friend.profileId)}">
          ${t("friends.cancelRequest")}
        </button>
      </div>
    `;
  }

  return `
    <div class="friends-card__actions">
      <button type="button" class="friends-card__action" data-friend-open-chat="${escapeHtml(friend.profileId)}">
        ${t("chats.message")}
      </button>
      <button type="button" class="friends-card__action friends-card__action--danger" data-friend-open-delete="${escapeHtml(friend.profileId)}">
        ${t("friends.delete")}
      </button>
    </div>
  `;
}

/** Рендерит список друзей, видимых для текущей вкладки и поискового запроса. */
export function renderFriendsList(): string {
  const visibleFriends = getVisibleFriends();

  if (friendsState.loading) {
    return Array.from(
      { length: 4 },
      () => `
      <article class="friends-card" aria-hidden="true">
        <div class="friends-card__avatar-link">
          <div class="friends-card__avatar skeleton"></div>
        </div>
        <div class="friends-card__body">
          <span class="friends-card__name skeleton" style="display:block;width:120px;height:14px;"></span>
          <span class="friends-card__meta skeleton" style="display:block;width:80px;height:12px;margin-top:4px;"></span>
        </div>
      </article>
    `,
    ).join("");
  }

  if (!visibleFriends.length) {
    return friendsState.query.trim()
      ? `<p class="friends-page__empty">${t("friends.noneFound")}</p>`
      : `<p class="friends-page__empty">${t("common.emptyList")}</p>`;
  }

  return visibleFriends
    .map((friend) => {
      const friendName = getFriendName(friend);
      const profilePath = `/id${encodeURIComponent(friend.profileId)}`;

      return `
        <article class="friends-card" data-friend-id="${escapeHtml(friend.profileId)}">
          <a href="${profilePath}" data-link class="friends-card__avatar-link">
            ${renderFriendAvatar(friend, "friends-card__avatar")}
          </a>
          <div class="friends-card__body">
            <a href="${profilePath}" data-link class="friends-card__name">${escapeHtml(friendName)}</a>
            <p class="friends-card__meta">${escapeHtml(friend.educationLabel)}</p>
            ${renderFriendActions(friend)}
          </div>
        </article>
      `;
    })
    .join("");
}

/** Рендерит модальное окно подтверждения удаления или пустую строку, если друг не выбран. */
export function renderDeleteModal(): string {
  const friend = friendsState.deleteModalFriend;
  if (!friend) return "";

  const friendName = getFriendName(friend);
  const friendshipSince = formatFriendshipSince(friend.createdAt);

  return `
    <div class="friends-modal" data-friends-modal-backdrop>
      <section class="friends-modal__dialog" role="dialog" aria-modal="true" aria-label="${t("friends.delete")}">
        <header class="friends-modal__header">
          <h2 class="friends-modal__title">${t("friends.delete")}</h2>
          ${renderModalCloseButton({
            className: "friends-modal__close",
            attributes: "data-friends-modal-close",
          })}
        </header>
        <div class="friends-modal__identity">
          ${renderFriendAvatar(friend, "friends-modal__avatar")}
          <p class="friends-modal__name">${escapeHtml(friendName)}</p>
        </div>
        <p class="friends-modal__text">${t("friends.confirmDeleteText")}</p>
        ${friendshipSince ? `<p class="friends-modal__hint">${t("friends.modalHint")} ${escapeHtml(friendshipSince)}</p>` : ""}
        <div class="friends-modal__actions">
          <button type="button" class="friends-modal__button friends-modal__button--primary" data-friend-confirm-delete="${escapeHtml(friend.profileId)}">
            ${t("friends.delete")}
          </button>
          <button type="button" class="friends-modal__button" data-friends-modal-close>${t("friends.cancel")}</button>
        </div>
      </section>
    </div>
  `;
}

/** Рендерит полное содержимое страницы друзей. */
export function renderFriendsContent(): string {
  const totalCount = friendsState.friends.length;

  return `
    <section class="friends-page" data-friends-page>
      <section class="friends-panel content-card">
        <header class="friends-panel__header">
          <p class="friends-panel__summary">
            ${
              totalCount === 0
                ? t("common.emptyList")
                : t("friends.summary").replace("{count}", getFriendsCountLabel(totalCount))
            }
          </p>
          <button type="button" class="friends-panel__discover" disabled hidden>${t("friends.find")}</button>
        </header>

        <nav class="friends-tabs" aria-label="${t("friends.filterAria")}">
          ${(["accepted", "incoming", "outgoing"] as FriendsTab[])
            .map((tab) => {
              const count =
                tab === "accepted"
                  ? friendsState.friends.length
                  : tab === "incoming"
                    ? friendsState.incoming.length
                    : friendsState.outgoing.length;
              return `
                <button
                  type="button"
                  class="friends-tabs__button${friendsState.activeTab === tab ? " friends-tabs__button--active" : ""}"
                  data-friends-tab="${tab}"
                >
                  ${getFriendsTabTitle(tab)} (${count})
                </button>
              `;
            })
            .join("")}
        </nav>

        <label class="friends-search search-field" aria-label="${t("friends.search")}">
          <img class="friends-search__icon search-field__icon" src="/assets/img/icons/search.svg" alt="">
          <input
            class="friends-search__input search-field__input"
            type="text"
            value="${escapeHtml(friendsState.query)}"
            placeholder="${t("friends.search")}"
            data-friends-search
          >
        </label>

        ${friendsState.errorMessage ? `<p class="friends-page__error">${escapeHtml(friendsState.errorMessage)}</p>` : ""}

        <div class="friends-list" data-friends-list>
          ${renderFriendsList()}
        </div>
      </section>

      ${renderDeleteModal()}
    </section>
  `;
}

/** Заменяет элемент страницы друзей в DOM, сохраняя фокус на поиске. */
export function refreshFriendsPage(root: ParentNode = document): void {
  const container = root.querySelector("[data-friends-page]");
  if (!(container instanceof HTMLElement)) return;

  const activeElement = root instanceof Document ? root.activeElement : document.activeElement;
  const shouldRestoreSearchFocus =
    activeElement instanceof HTMLInputElement && activeElement.matches("[data-friends-search]");
  const searchCursorPosition = shouldRestoreSearchFocus
    ? (activeElement.selectionStart ?? activeElement.value.length)
    : null;

  const template = document.createElement("template");
  template.innerHTML = renderFriendsContent().trim();
  const next = template.content.firstElementChild;
  if (!(next instanceof HTMLElement)) return;

  container.replaceWith(next);

  if (shouldRestoreSearchFocus) {
    const searchInput = next.querySelector("[data-friends-search]");
    if (searchInput instanceof HTMLInputElement) {
      searchInput.focus();
      const cursorPosition = searchCursorPosition ?? searchInput.value.length;
      searchInput.setSelectionRange(cursorPosition, cursorPosition);
    }
  }
}

/** Обновляет только список друзей без полного перерендера страницы. */
export function refreshFriendsSearchResults(root: ParentNode = document): void {
  const friendsList = root.querySelector("[data-friends-list]");
  if (!(friendsList instanceof HTMLElement)) return;
  friendsList.innerHTML = renderFriendsList();
}
