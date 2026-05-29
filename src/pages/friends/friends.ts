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
import { t } from "../../state/i18n";
import { prepareAvatarLinks } from "../../utils/avatar";
import { showAppToast } from "../../utils/toast";
import { rememberChatContactHint } from "../chats/contact-hints";

import {
  friendsState,
  resetFriendsState,
  restoreFriendsActiveTab,
  persistFriendsActiveTab,
  ensureFriendsLoaded,
  loadUserFriendsFromBackend,
  hydrateDisplayFriendAvatarLinks,
  findFriendById,
  getFriendsErrorMessage,
  getLocalFriendSearchResults,
  searchFriendsFromBackend,
} from "./state";
import { renderFriendsContent, refreshFriendsPage, refreshFriendsSearchResults } from "./render";

type FriendsRoot = (Document | HTMLElement) & {
  __friendsBound?: boolean;
};

const FRIENDS_SEARCH_DEBOUNCE_MS = 250;

function getViewedFriendsProfileId(currentProfileId: string): string {
  const rawProfileId = new URLSearchParams(window.location.search).get("profileId")?.trim() ?? "";
  if (!rawProfileId || rawProfileId === currentProfileId) return "";
  return rawProfileId;
}

function getViewedFriendsProfileName(): string {
  return new URLSearchParams(window.location.search).get("name")?.trim() ?? "";
}

let friendsSearchTimerId: number | null = null;
let friendsSearchAbortController: AbortController | null = null;
let friendsSearchRequestId = 0;

function closeFriendMenus(root: Document | HTMLElement): void {
  document.querySelectorAll<HTMLElement>("[data-friend-menu]").forEach((menu) => {
    menu.hidden = true;
    menu.style.top = "";
    menu.style.right = "";
    menu.style.left = "";
  });

  root.querySelectorAll<HTMLButtonElement>("[data-friend-menu-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function positionFriendMenu(menu: HTMLElement, toggle: HTMLButtonElement): void {
  const rect = toggle.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.left = "auto";
}

function clearFriendsSearchRequest(): void {
  if (friendsSearchTimerId !== null) {
    window.clearTimeout(friendsSearchTimerId);
    friendsSearchTimerId = null;
  }

  friendsSearchAbortController?.abort();
  friendsSearchAbortController = null;
}

function scheduleFriendsBackendSearch(root: ParentNode): void {
  const query = friendsState.query.trim();
  const requestId = ++friendsSearchRequestId;

  clearFriendsSearchRequest();

  if (!query) {
    friendsState.searchLoading = false;
    friendsState.searchResults = null;
    refreshFriendsSearchResults(root);
    return;
  }

  friendsState.searchLoading = true;
  friendsState.searchResults = {
    friends: getLocalFriendSearchResults(query),
    users: [],
  };
  refreshFriendsSearchResults(root);

  friendsSearchTimerId = window.setTimeout(() => {
    friendsSearchTimerId = null;
    const controller = new AbortController();
    friendsSearchAbortController = controller;

    void searchFriendsFromBackend(query, controller.signal)
      .then((results) => {
        if (requestId !== friendsSearchRequestId || friendsState.query.trim() !== query) return;
        friendsState.searchResults = results;
        friendsState.errorMessage = "";
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        if (requestId !== friendsSearchRequestId) return;
        friendsState.searchResults = {
          friends: getLocalFriendSearchResults(query),
          users: [],
        };
        friendsState.errorMessage = getFriendsErrorMessage(error, t("friends.loadError"));
      })
      .finally(() => {
        if (requestId !== friendsSearchRequestId) return;
        friendsState.searchLoading = false;
        refreshFriendsSearchResults(root);
      });
  }, FRIENDS_SEARCH_DEBOUNCE_MS);
}

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
 * @param {string} successMessage Сообщение об успешном выполнении.
 * @returns {Promise<void>}
 */
async function runFriendAction(
  root: ParentNode,
  action: () => Promise<void>,
  successMessage: string,
): Promise<void> {
  let shouldShowSuccessToast = false;

  friendsState.loading = true;
  friendsState.errorMessage = "";
  refreshFriendsPage(root);

  try {
    await action();
    await ensureFriendsLoaded(true);
    friendsState.deleteModalFriend = null;
    shouldShowSuccessToast = true;
  } catch (error) {
    friendsState.errorMessage = getFriendsErrorMessage(error, t("friends.actionError"));
  } finally {
    friendsState.loading = false;
    refreshFriendsPage(root);
    if (shouldShowSuccessToast) {
      showAppToast(successMessage);
    }
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

  const viewedProfileId = getViewedFriendsProfileId(currentUserId);
  const viewedProfileName = viewedProfileId ? getViewedFriendsProfileName() : "";
  const stateKey = viewedProfileId ? `${currentUserId}:profile:${viewedProfileId}` : currentUserId;

  if (friendsState.loadedForUserId !== stateKey) {
    resetFriendsState();
    friendsState.loadedForUserId = stateKey;
    friendsState.viewedProfileId = viewedProfileId;
    friendsState.viewedProfileName = viewedProfileName;
    if (!viewedProfileId) restoreFriendsActiveTab(currentUserId);
  } else {
    friendsState.viewedProfileId = viewedProfileId;
    friendsState.viewedProfileName = viewedProfileName;
  }

  if (viewedProfileId) {
    if (!friendsState.loaded && !friendsState.loading) {
      friendsState.loading = true;
      friendsState.errorMessage = "";
      friendsState.activeTab = "accepted";
      try {
        const data = await loadUserFriendsFromBackend(viewedProfileId, signal);
        friendsState.friends = data.friends;
        friendsState.incoming = [];
        friendsState.outgoing = [];
        friendsState.loaded = true;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw error;
        friendsState.errorMessage = getFriendsErrorMessage(error, t("friends.loadError"));
        friendsState.friends = [];
        friendsState.loaded = false;
      } finally {
        friendsState.loading = false;
      }
    }
  } else {
    await ensureFriendsLoaded(false, signal);
  }
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
  const widgetbarMarkup = await renderWidgetbar({ isAuthorised: true });

  return `
    <div class="app-page">
      ${renderHeader()}
      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>
        <section class="app-layout__center">
          ${renderFriendsContent()}
          <div class="friends-page__mobile-widgetbar">
            ${widgetbarMarkup}
          </div>
        </section>
        <aside class="app-layout__right app-layout__right--optional">
          ${widgetbarMarkup}
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
    scheduleFriendsBackendSearch(root);
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
        friendsState.searchLoading = false;
        friendsState.searchResults = null;
        friendsState.deleteModalFriend = null;
        clearFriendsSearchRequest();
        refreshFriendsPage(root);
      }
      return;
    }

    const menuToggle = target.closest("[data-friend-menu-toggle]");
    if (menuToggle instanceof HTMLButtonElement) {
      const friendId = menuToggle.getAttribute("data-friend-menu-toggle");
      if (!friendId) return;

      const menu = root.querySelector<HTMLElement>(`[data-friend-menu="${friendId}"]`);
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      closeFriendMenus(root);

      if (menu && !isExpanded) {
        positionFriendMenu(menu, menuToggle);
        menu.hidden = false;
        menuToggle.setAttribute("aria-expanded", "true");
      }
      return;
    }

    if (!target.closest(".friends-card__actions") && !target.closest("[data-friend-menu]")) {
      closeFriendMenus(root);
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
        friendsState.errorMessage = t("friends.userNotFound");
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
          friendsState.errorMessage = getFriendsErrorMessage(error, t("friends.openChatError"));
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
      void runFriendAction(root, () => deleteFriend(friendId), t("profile.friendRemovedToast"));
      return;
    }

    const acceptButton = target.closest("[data-friend-accept]");
    if (acceptButton instanceof HTMLButtonElement) {
      const friendId = acceptButton.getAttribute("data-friend-accept") ?? "";
      void runFriendAction(
        root,
        () => acceptFriendRequest(friendId),
        t("profile.friendRequestAcceptedToast"),
      );
      return;
    }

    const declineButton = target.closest("[data-friend-decline]");
    if (declineButton instanceof HTMLButtonElement) {
      const friendId = declineButton.getAttribute("data-friend-decline") ?? "";
      void runFriendAction(
        root,
        () => declineFriendRequest(friendId),
        t("profile.friendRequestDeclinedToast"),
      );
      return;
    }

    const revokeButton = target.closest("[data-friend-revoke]");
    if (revokeButton instanceof HTMLButtonElement) {
      const friendId = revokeButton.getAttribute("data-friend-revoke") ?? "";
      void runFriendAction(
        root,
        () => revokeFriendRequest(friendId),
        t("profile.friendRequestRevokedToast"),
      );
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      const openMenu = document.querySelector<HTMLElement>("[data-friend-menu]:not([hidden])");
      if (!openMenu) return;
      const friendId = openMenu.getAttribute("data-friend-menu");
      if (!friendId) return;
      const toggle = root.querySelector<HTMLButtonElement>(
        `[data-friend-menu-toggle="${friendId}"]`,
      );
      if (!toggle) return;
      positionFriendMenu(openMenu, toggle);
    },
    { passive: true },
  );

  bindableRoot.__friendsBound = true;
}
