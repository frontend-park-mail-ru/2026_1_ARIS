/**
 * Страница друзей.
 *
 * Отвечает за:
 * - рендер списков друзей и заявок
 * - запуск действий над дружбой
 * - открытие приватного чата из карточки пользователя
 * - синхронизацию активной вкладки и поиска
 */
import {
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  type Friend,
  revokeFriendRequest,
} from "../../api/friends";
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { clearWidgetbarCache, renderWidgetbar } from "../../components/widgetbar/widgetbar";
import { createOrResolvePrivateChatId } from "../../api/chat";
import { getSessionUser } from "../../state/session";
import { prepareAvatarLinks } from "../../utils/avatar";
import { rememberChatContactHint } from "../chats/contact-hints";

import {
  friendsState,
  resetFriendsState,
  restoreFriendsActiveTab,
  persistFriendsActiveTab,
  ensureFriendsLoaded,
  hydrateDisplayFriendAvatarLinks,
  findFriendById,
  getFriendsErrorMessage,
} from "./state";
import { renderFriendsContent, refreshFriendsPage, refreshFriendsSearchResults } from "./render";

type FriendsRoot = (Document | HTMLElement) & {
  __friendsBound?: boolean;
};

/**
 * Переводит пользователя на страницу чатов с выбранным диалогом.
 *
 * @param {string} chatId Идентификатор чата.
 * @returns {void}
 */
function navigateToChat(chatId: string): void {
  window.history.pushState({}, "", `/chats?chatId=${encodeURIComponent(chatId)}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Создаёт или находит приватный чат для друга.
 *
 * @param {Friend} friend Пользователь, с которым открывается диалог.
 * @returns {Promise<string>} Идентификатор чата.
 */
async function resolveChatIdForFriend(friend: Friend): Promise<string> {
  return createOrResolvePrivateChatId(friend.profileId, {
    expectedTitle: `${friend.firstName} ${friend.lastName}`,
  });
}

/** Сбрасывает кэш данных друзей и очищает кэш виджетбара. */
export function invalidateFriendsState(): void {
  friendsState.loaded = false;
  friendsState.loading = false;
  friendsState.errorMessage = "";
  friendsState.friends = [];
  friendsState.incoming = [];
  friendsState.outgoing = [];
  friendsState.deleteModalFriend = null;
  clearWidgetbarCache();
}

/**
 * Выполняет действие над дружбой с общим UI-обработчиком загрузки и ошибок.
 *
 * @param {ParentNode} root Корень страницы друзей.
 * @param {() => Promise<void>} action Асинхронное действие.
 * @returns {Promise<void>}
 */
async function runFriendAction(root: ParentNode, action: () => Promise<void>): Promise<void> {
  friendsState.loading = true;
  friendsState.errorMessage = "";
  refreshFriendsPage(root);

  try {
    await action();
    await ensureFriendsLoaded(true);
    friendsState.deleteModalFriend = null;
  } catch (error) {
    friendsState.errorMessage = getFriendsErrorMessage(error, "Не удалось выполнить действие.");
  } finally {
    friendsState.loading = false;
    refreshFriendsPage(root);
  }
}

/**
 * Рендерит полный HTML страницы друзей.
 *
 * @param {Record<string, string>} [_params] Параметры маршрута.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<string>} HTML страницы.
 */
export async function renderFriends(
  _params?: Record<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  const currentUser = getSessionUser();
  const currentUserId = String(currentUser?.id ?? "");

  if (!currentUser) return (await import("../feed/feed")).renderFeed(undefined, signal);

  if (friendsState.loadedForUserId !== currentUserId) {
    resetFriendsState();
    friendsState.loadedForUserId = currentUserId;
    restoreFriendsActiveTab(currentUserId);
  }

  await ensureFriendsLoaded(false, signal);
  const hydratedLists = await hydrateDisplayFriendAvatarLinks(
    {
      friends: friendsState.friends,
      incoming: friendsState.incoming,
      outgoing: friendsState.outgoing,
    },
    signal,
  );
  friendsState.friends = hydratedLists.friends;
  friendsState.incoming = hydratedLists.incoming;
  friendsState.outgoing = hydratedLists.outgoing;
  await prepareAvatarLinks([
    currentUser.avatarLink,
    ...friendsState.friends.map((friend) => friend.avatarLink),
    ...friendsState.incoming.map((friend) => friend.avatarLink),
    ...friendsState.outgoing.map((friend) => friend.avatarLink),
  ]);

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
        <aside class="app-layout__right app-layout__right--optional">
          ${await renderWidgetbar({ isAuthorised: true })}
        </aside>
      </main>
    </div>
  `;
}

/**
 * Подключает все обработчики событий для страницы друзей.
 *
 * @param {Document | HTMLElement} [root=document] Корень страницы друзей.
 * @returns {void}
 */
export function initFriends(root: Document | HTMLElement = document): void {
  const bindableRoot = root as FriendsRoot;
  if (bindableRoot.__friendsBound) return;

  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-friends-search]")) return;
    friendsState.query = target.value;
    refreshFriendsSearchResults(root);
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const tabButton = target.closest("[data-friends-tab]");
    if (tabButton instanceof HTMLButtonElement) {
      const nextTab = tabButton.getAttribute("data-friends-tab");
      if (nextTab === "accepted" || nextTab === "incoming" || nextTab === "outgoing") {
        friendsState.activeTab = nextTab;
        persistFriendsActiveTab(friendsState.loadedForUserId);
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
      if (!friendId) return;
      const friend = findFriendById(friendId);
      if (!friend) {
        friendsState.errorMessage = "Не удалось найти пользователя для открытия чата.";
        refreshFriendsPage(root);
        return;
      }

      openChatButton.disabled = true;
      void resolveChatIdForFriend(friend)
        .then((chatId) => {
          rememberChatContactHint({
            chatId,
            profileId: friend.profileId,
            title: `${friend.firstName} ${friend.lastName}`.trim(),
            avatarLink: friend.avatarLink,
          });
          navigateToChat(chatId);
        })
        .catch((error: unknown) => {
          friendsState.errorMessage = getFriendsErrorMessage(error, "Не удалось открыть чат.");
          openChatButton.disabled = false;
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
      void runFriendAction(root, () => deleteFriend(friendId));
      return;
    }

    const acceptButton = target.closest("[data-friend-accept]");
    if (acceptButton instanceof HTMLButtonElement) {
      const friendId = acceptButton.getAttribute("data-friend-accept") ?? "";
      void runFriendAction(root, () => acceptFriendRequest(friendId));
      return;
    }

    const declineButton = target.closest("[data-friend-decline]");
    if (declineButton instanceof HTMLButtonElement) {
      const friendId = declineButton.getAttribute("data-friend-decline") ?? "";
      void runFriendAction(root, () => declineFriendRequest(friendId));
      return;
    }

    const revokeButton = target.closest("[data-friend-revoke]");
    if (revokeButton instanceof HTMLButtonElement) {
      const friendId = revokeButton.getAttribute("data-friend-revoke") ?? "";
      void runFriendAction(root, () => revokeFriendRequest(friendId));
    }
  });

  bindableRoot.__friendsBound = true;
}
