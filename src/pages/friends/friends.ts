import { type Friend } from "../../api/friends";
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { createPrivateChat } from "../../api/chat";
import { getProfileById, type ProfileResponse } from "../../api/profile";
import { getSessionUser } from "../../state/session";
import { renderFeed } from "../feed/feed";

type FriendsRoot = (Document | HTMLElement) & {
  __friendsBound?: boolean;
};

type MockFriend = Friend & {
  chatUserId: string;
  educationLabel: string;
};

type FriendsTab = "accepted" | "incoming" | "outgoing";

type FriendsState = {
  loaded: boolean;
  loadedForUserId: string;
  loading: boolean;
  errorMessage: string;
  query: string;
  activeTab: FriendsTab;
  friends: MockFriend[];
  incoming: MockFriend[];
  outgoing: MockFriend[];
  deleteModalFriend: MockFriend | null;
};

type MockFriendsData = {
  friends: MockFriend[];
  incoming: MockFriend[];
  outgoing: MockFriend[];
};

const TAB_TITLES: Record<FriendsTab, string> = {
  accepted: "Все друзья",
  incoming: "Входящие заявки",
  outgoing: "Исходящие заявки",
};

const ACCEPTED_FRIENDS_SOURCE = [
  { profileId: "14", chatUserId: "9" },
  { profileId: "15", chatUserId: "10" },
  { profileId: "18", chatUserId: "13" },
] as const;

const INCOMING_FRIENDS_SOURCE = [{ profileId: "16", chatUserId: "11" }] as const;
const OUTGOING_FRIENDS_SOURCE = [{ profileId: "17", chatUserId: "12" }] as const;

const friendsState: FriendsState = {
  loaded: false,
  loadedForUserId: "",
  loading: false,
  errorMessage: "",
  query: "",
  activeTab: "accepted",
  friends: [],
  incoming: [],
  outgoing: [],
  deleteModalFriend: null,
};

function resetFriendsState(): void {
  friendsState.loaded = false;
  friendsState.loading = false;
  friendsState.errorMessage = "";
  friendsState.query = "";
  friendsState.activeTab = "accepted";
  friendsState.friends = [];
  friendsState.incoming = [];
  friendsState.outgoing = [];
  friendsState.deleteModalFriend = null;
}

function formatEducationLabel(profile: ProfileResponse): string {
  const education = profile.education?.[0];
  return (
    [education?.institution, education?.grade].filter(Boolean).join(" ").trim() ||
    "МГТУ им. Н.Э. Баумана"
  );
}

function mapProfileToFriend(
  profileId: string,
  chatUserId: string,
  profile: ProfileResponse,
  status: Friend["status"],
): MockFriend {
  return {
    profileId,
    chatUserId,
    firstName: profile.firstName || "Пользователь",
    lastName: profile.lastName || "",
    username: `id${profileId}`,
    status,
    avatarLink: profile.imageLink,
    educationLabel: formatEducationLabel(profile),
  };
}

function isVisibleFriendProfile(profile: ProfileResponse): boolean {
  const avatarLink = profile.imageLink?.trim();
  const fullName = `${profile.firstName} ${profile.lastName}`.trim().toLowerCase();

  return (
    Boolean(
      avatarLink &&
      (avatarLink.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(avatarLink)),
    ) &&
    fullName !== "команда арис" &&
    fullName !== "анна опарина"
  );
}

async function loadFriendsFromBackendProfiles(): Promise<MockFriendsData> {
  const currentUser = getSessionUser();
  const currentUserFullName = `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`
    .trim()
    .toLowerCase();

  async function loadFriendGroup(
    source: ReadonlyArray<{ profileId: string; chatUserId: string }>,
    status: Friend["status"],
  ): Promise<MockFriend[]> {
    const loadedFriends = await Promise.all(
      source.map(async ({ profileId, chatUserId }) => {
        const profile = await getProfileById(profileId);
        const fullName = `${profile.firstName} ${profile.lastName}`.trim().toLowerCase();

        if (!isVisibleFriendProfile(profile) || fullName === currentUserFullName) {
          return null;
        }

        return mapProfileToFriend(profileId, chatUserId, profile, status);
      }),
    );

    return loadedFriends.filter((friend): friend is MockFriend => Boolean(friend));
  }

  return {
    friends: await loadFriendGroup(ACCEPTED_FRIENDS_SOURCE, "accepted"),
    incoming: await loadFriendGroup(INCOMING_FRIENDS_SOURCE, "pending"),
    outgoing: await loadFriendGroup(OUTGOING_FRIENDS_SOURCE, "pending"),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAvatarSrc(avatarLink?: string): string {
  if (!avatarLink) {
    return "/assets/img/default-avatar.png";
  }

  if (avatarLink.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(avatarLink)) {
    return avatarLink;
  }

  return `/image-proxy?url=${encodeURIComponent(avatarLink)}`;
}

function getFriendName(friend: MockFriend): string {
  return `${friend.firstName} ${friend.lastName}`.trim() || friend.username || "Пользователь";
}

function getFriendMeta(friend: MockFriend): string {
  return friend.educationLabel;
}

function getFriendsCountLabel(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;

  if (mod100 >= 11 && mod100 <= 14) {
    return `${count} человек`;
  }

  if (mod10 === 1) {
    return `${count} человек`;
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return `${count} человека`;
  }

  return `${count} человек`;
}

async function ensureFriendsLoaded(force = false): Promise<void> {
  if ((!force && friendsState.loading) || (!force && friendsState.loaded)) {
    return;
  }

  friendsState.loading = true;
  friendsState.errorMessage = "";

  try {
    const data = await loadFriendsFromBackendProfiles();
    friendsState.friends = data.friends;
    friendsState.incoming = data.incoming;
    friendsState.outgoing = data.outgoing;
    friendsState.loaded = true;
  } catch (error) {
    friendsState.errorMessage =
      error instanceof Error ? error.message : "Не удалось загрузить друзей";
    friendsState.friends = [];
    friendsState.incoming = [];
    friendsState.outgoing = [];
    friendsState.loaded = false;
  } finally {
    friendsState.loading = false;
  }
}

function getVisibleFriends(): MockFriend[] {
  const source =
    friendsState.activeTab === "accepted"
      ? friendsState.friends
      : friendsState.activeTab === "incoming"
        ? friendsState.incoming
        : friendsState.outgoing;

  const query = friendsState.query.trim().toLowerCase();
  if (!query) {
    return source;
  }

  return source.filter((friend) => {
    return [friend.firstName, friend.lastName, friend.username, getFriendMeta(friend)]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderFriendActions(friend: MockFriend): string {
  if (friendsState.activeTab === "incoming") {
    return `
      <div class="friends-card__actions">
        <button type="button" class="friends-card__action" data-friend-accept="${escapeHtml(friend.profileId)}">
          Принять
        </button>
        <button
          type="button"
          class="friends-card__action friends-card__action--danger"
          data-friend-decline="${escapeHtml(friend.profileId)}"
        >
          Отклонить
        </button>
      </div>
    `;
  }

  if (friendsState.activeTab === "outgoing") {
    return `
      <div class="friends-card__actions">
        <button type="button" class="friends-card__action" disabled>
          Заявка отправлена
        </button>
        <button
          type="button"
          class="friends-card__action friends-card__action--danger"
          data-friend-revoke="${escapeHtml(friend.profileId)}"
        >
          Отменить заявку
        </button>
      </div>
    `;
  }

  return `
    <div class="friends-card__actions">
      <button
        type="button"
        class="friends-card__action"
        data-friend-open-chat="${escapeHtml(friend.chatUserId)}"
      >
        Сообщение
      </button>
      <button
        type="button"
        class="friends-card__action friends-card__action--danger"
        data-friend-open-delete="${escapeHtml(friend.profileId)}"
      >
        Удалить из друзей
      </button>
    </div>
  `;
}

function renderFriendsList(): string {
  const visibleFriends = getVisibleFriends();

  if (friendsState.loading) {
    return '<p class="friends-page__empty">Загружаем друзей...</p>';
  }

  if (!visibleFriends.length) {
    return friendsState.query.trim()
      ? '<p class="friends-page__empty">Ничего не найдено.</p>'
      : '<p class="friends-page__empty">Пока тут пусто.</p>';
  }

  return visibleFriends
    .map((friend) => {
      const friendName = getFriendName(friend);
      const profilePath = `/id${encodeURIComponent(friend.profileId)}`;

      return `
        <article class="friends-card" data-friend-id="${escapeHtml(friend.profileId)}">
          <a href="${profilePath}" data-link class="friends-card__avatar-link">
            <img
              class="friends-card__avatar"
              src="${getAvatarSrc(friend.avatarLink)}"
              alt="${escapeHtml(friendName)}"
            >
          </a>

          <div class="friends-card__body">
            <a href="${profilePath}" data-link class="friends-card__name">
              ${escapeHtml(friendName)}
            </a>
            <p class="friends-card__meta">${escapeHtml(getFriendMeta(friend))}</p>
            ${renderFriendActions(friend)}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDeleteModal(): string {
  const friend = friendsState.deleteModalFriend;
  if (!friend) {
    return "";
  }

  const friendName = getFriendName(friend);

  return `
    <div class="friends-modal" data-friends-modal-backdrop>
      <section class="friends-modal__dialog" role="dialog" aria-modal="true" aria-label="Удалить из друзей">
        <header class="friends-modal__header">
          <h2 class="friends-modal__title">Удалить из друзей</h2>
          <button type="button" class="friends-modal__close" data-friends-modal-close aria-label="Закрыть">
            [X]
          </button>
        </header>

        <p class="friends-modal__text">
          Вы действительно хотите удалить ${escapeHtml(friendName)} из друзей?
        </p>

        <img
          class="friends-modal__avatar"
          src="${getAvatarSrc(friend.avatarLink)}"
          alt="${escapeHtml(friendName)}"
        >
        <div class="friends-modal__actions">
          <button
            type="button"
            class="friends-modal__button friends-modal__button--primary"
            data-friend-confirm-delete="${escapeHtml(friend.profileId)}"
          >
            Удалить из друзей
          </button>
          <button type="button" class="friends-modal__button" data-friends-modal-close>
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderFriendsContent(): string {
  const totalCount = friendsState.friends.length;

  return `
    <section class="friends-page" data-friends-page>
      <section class="friends-panel">
        <header class="friends-panel__header">
          <p class="friends-panel__summary">
            ${
              totalCount === 0
                ? "У вас пока нет друзей."
                : `У вас в друзьях ${getFriendsCountLabel(totalCount)}.`
            }
          </p>

          <button type="button" class="friends-panel__discover" disabled>
            Найти друзей
          </button>
        </header>

        <nav class="friends-tabs" aria-label="Фильтр друзей">
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
                  ${TAB_TITLES[tab]} (${count})
                </button>
              `;
            })
            .join("")}
        </nav>

        <label class="friends-search" aria-label="Поиск по друзьям">
          <img class="friends-search__icon" src="/assets/img/icons/search.svg" alt="">
          <input
            class="friends-search__input"
            type="text"
            value="${escapeHtml(friendsState.query)}"
            placeholder="Поиск по друзьям..."
            data-friends-search
          >
        </label>

        ${
          friendsState.errorMessage
            ? `<p class="friends-page__error">${escapeHtml(friendsState.errorMessage)}</p>`
            : ""
        }

        <div class="friends-list" data-friends-list>
          ${renderFriendsList()}
        </div>
      </section>

      ${renderDeleteModal()}
    </section>
  `;
}

function refreshFriendsPage(root: ParentNode = document): void {
  const container = root.querySelector("[data-friends-page]");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const activeElement = root instanceof Document ? root.activeElement : document.activeElement;
  const shouldRestoreSearchFocus =
    activeElement instanceof HTMLInputElement && activeElement.matches("[data-friends-search]");
  const searchCursorPosition = shouldRestoreSearchFocus
    ? (activeElement.selectionStart ?? activeElement.value.length)
    : null;

  const template = document.createElement("template");
  template.innerHTML = renderFriendsContent().trim();

  const next = template.content.firstElementChild;
  if (!(next instanceof HTMLElement)) {
    return;
  }

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

function refreshFriendsSearchResults(root: ParentNode = document): void {
  const friendsList = root.querySelector("[data-friends-list]");
  if (!(friendsList instanceof HTMLElement)) {
    return;
  }

  friendsList.innerHTML = renderFriendsList();
}

function findFriendById(friendId: string): MockFriend | null {
  return (
    friendsState.friends.find((friend) => friend.profileId === friendId) ??
    friendsState.incoming.find((friend) => friend.profileId === friendId) ??
    friendsState.outgoing.find((friend) => friend.profileId === friendId) ??
    null
  );
}

async function runFriendAction(root: ParentNode, action: () => void): Promise<void> {
  friendsState.loading = true;
  friendsState.errorMessage = "";
  refreshFriendsPage(root);

  action();
  friendsState.deleteModalFriend = null;
  friendsState.loading = false;
  refreshFriendsPage(root);
}

function moveFriendBetweenLists(
  source: MockFriend[],
  target: MockFriend[],
  friendId: string,
  nextStatus: Friend["status"],
): void {
  const friendIndex = source.findIndex((friend) => friend.profileId === friendId);
  if (friendIndex === -1) {
    return;
  }

  const [friend] = source.splice(friendIndex, 1);
  if (!friend) {
    return;
  }

  target.unshift({
    ...friend,
    status: nextStatus,
  });
}

function removeFriendFromList(source: MockFriend[], friendId: string): void {
  const friendIndex = source.findIndex((friend) => friend.profileId === friendId);
  if (friendIndex === -1) {
    return;
  }

  source.splice(friendIndex, 1);
}

export async function renderFriends(): Promise<string> {
  const currentUser = getSessionUser();
  const currentUserId = String(currentUser?.id ?? "");

  if (!currentUser) {
    return renderFeed();
  }

  if (friendsState.loadedForUserId !== currentUserId) {
    resetFriendsState();
    friendsState.loadedForUserId = currentUserId;
  }

  await ensureFriendsLoaded();

  return `
    <div class="app-page">
      ${renderHeader()}

      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>

        <section class="app-layout__center">
          ${renderFriendsContent()}
        </section>

        <aside class="app-layout__right">
          ${await renderWidgetbar({ isAuthorised: true })}
        </aside>
      </main>
    </div>
  `;
}

export function initFriends(root: Document | HTMLElement = document): void {
  const bindableRoot = root as FriendsRoot;
  if (bindableRoot.__friendsBound) {
    return;
  }

  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-friends-search]")) {
      return;
    }

    friendsState.query = target.value;
    refreshFriendsSearchResults(root);
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const tabButton = target.closest("[data-friends-tab]");
    if (tabButton instanceof HTMLButtonElement) {
      const nextTab = tabButton.getAttribute("data-friends-tab");
      if (nextTab === "accepted" || nextTab === "incoming" || nextTab === "outgoing") {
        friendsState.activeTab = nextTab;
        friendsState.query = "";
        friendsState.deleteModalFriend = null;
        refreshFriendsPage(root);
      }
      return;
    }

    const openDeleteButton = target.closest("[data-friend-open-delete]");
    if (openDeleteButton instanceof HTMLButtonElement) {
      const friendId = openDeleteButton.getAttribute("data-friend-open-delete") ?? "";
      friendsState.deleteModalFriend = findFriendById(friendId);
      refreshFriendsPage(root);
      return;
    }

    const openChatButton = target.closest("[data-friend-open-chat]");
    if (openChatButton instanceof HTMLButtonElement) {
      const friendId = openChatButton.getAttribute("data-friend-open-chat") ?? "";
      if (!friendId) {
        return;
      }

      void createPrivateChat(friendId)
        .then((chat) => {
          window.history.pushState({}, "", `/chats?chatId=${encodeURIComponent(chat.id)}`);
          window.dispatchEvent(new PopStateEvent("popstate"));
        })
        .catch((error: unknown) => {
          friendsState.errorMessage =
            error instanceof Error ? error.message : "Не удалось открыть чат.";
          refreshFriendsPage(root);
        });
      return;
    }

    const closeModalButton = target.closest("[data-friends-modal-close]");
    const modalBackdrop = target.closest("[data-friends-modal-backdrop]");
    if (closeModalButton instanceof HTMLButtonElement || modalBackdrop === target) {
      friendsState.deleteModalFriend = null;
      refreshFriendsPage(root);
      return;
    }

    const deleteButton = target.closest("[data-friend-confirm-delete]");
    if (deleteButton instanceof HTMLButtonElement) {
      const friendId = deleteButton.getAttribute("data-friend-confirm-delete") ?? "";
      void runFriendAction(root, () => removeFriendFromList(friendsState.friends, friendId));
      return;
    }

    const acceptButton = target.closest("[data-friend-accept]");
    if (acceptButton instanceof HTMLButtonElement) {
      const friendId = acceptButton.getAttribute("data-friend-accept") ?? "";
      void runFriendAction(root, () =>
        moveFriendBetweenLists(friendsState.incoming, friendsState.friends, friendId, "accepted"),
      );
      return;
    }

    const declineButton = target.closest("[data-friend-decline]");
    if (declineButton instanceof HTMLButtonElement) {
      const friendId = declineButton.getAttribute("data-friend-decline") ?? "";
      void runFriendAction(root, () => removeFriendFromList(friendsState.incoming, friendId));
      return;
    }

    const revokeButton = target.closest("[data-friend-revoke]");
    if (revokeButton instanceof HTMLButtonElement) {
      const friendId = revokeButton.getAttribute("data-friend-revoke") ?? "";
      void runFriendAction(root, () => removeFriendFromList(friendsState.outgoing, friendId));
    }
  });

  bindableRoot.__friendsBound = true;
}
