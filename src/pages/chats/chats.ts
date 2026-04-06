import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import {
  getChatMessages,
  getChats,
  sendChatMessage,
  subscribeToChatMessages,
  type ChatMessage,
  type ChatSummary,
} from "../../api/chat";
import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  type Friend,
} from "../../api/friends";
import {
  getLatestEvents,
  getPublicPopularUsers,
  getSuggestedUsers,
  type LatestEventUser,
  type SuggestedUser,
} from "../../api/users";
import { getSessionUser } from "../../state/session";
import { PROFILE_RECORDS, findProfileRecord, resolveProfilePath } from "../profile/profile-data";
import { renderFeed } from "../feed/feed";

type ChatRoot = (Document | HTMLElement) & {
  __chatsBound?: boolean;
};

type ChatViewMessage = {
  id: string;
  text: string;
  authorName: string;
  isOwn: boolean;
  createdAt?: string | undefined;
  avatarLink?: string | undefined;
  profilePath?: string | undefined;
};

type ChatViewThread = {
  id: string;
  title: string;
  avatarLink?: string | undefined;
  preview: string;
  previewIsOwn?: boolean | undefined;
  timeLabel: string;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  source: "api" | "mock";
  messages?: ChatViewMessage[] | undefined;
  profilePath?: string | undefined;
};

type KnownChatContact = {
  profileId?: string | undefined;
  avatarLink?: string | undefined;
};

type PersistedChatScrollState = {
  scrollTop: number;
  pinnedToBottom: boolean;
  anchor?: ChatViewportAnchor | undefined;
};

type PersistedChatsUiState = {
  selectedChatId: string;
  scrollStateByChatId: Record<string, PersistedChatScrollState>;
};

type ChatViewportAnchor = {
  messageId: string;
  offset: number;
};

function sortMessagesByCreatedAt(messages: ChatViewMessage[]): ChatViewMessage[] {
  return [...messages].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return 0;
    }

    return leftTime - rightTime;
  });
}

type ChatsState = {
  loaded: boolean;
  loadingMessages: boolean;
  source: "api" | "mock";
  query: string;
  threads: ChatViewThread[];
  selectedChatId: string;
  errorMessage: string;
  loadedForUserId: string;
  unsubscribeByChatId: Map<string, () => void>;
  unreadIncomingIdsByChatId: Map<string, Set<string>>;
  pendingOutgoingByChatId: Map<
    string,
    Array<{
      localId: string;
      text: string;
      createdAt?: string | undefined;
    }>
  >;
};

const chatsState: ChatsState = {
  loaded: false,
  loadingMessages: false,
  source: "mock",
  query: "",
  threads: [],
  selectedChatId: "",
  errorMessage: "",
  loadedForUserId: "",
  unsubscribeByChatId: new Map(),
  unreadIncomingIdsByChatId: new Map(),
  pendingOutgoingByChatId: new Map(),
};

let chatsRoot: ParentNode = document;
let chatsPollIntervalId: number | null = null;
let shouldScrollChatToBottom = false;
let isSelectedChatPinnedToBottom = true;
let hasHydratedPersistedChatsUiState = false;
const chatScrollStateById = new Map<string, PersistedChatScrollState>();
const knownChatContactsByName = new Map<string, KnownChatContact>();

function resetChatsState(): void {
  chatsState.unsubscribeByChatId.forEach((unsubscribe) => unsubscribe());
  chatsState.unsubscribeByChatId.clear();
  chatsState.loaded = false;
  chatsState.loadingMessages = false;
  chatsState.source = "mock";
  chatsState.query = "";
  chatsState.threads = [];
  chatsState.selectedChatId = "";
  chatsState.errorMessage = "";
  chatsState.unreadIncomingIdsByChatId.clear();
  chatsState.pendingOutgoingByChatId.clear();
  chatScrollStateById.clear();
  knownChatContactsByName.clear();
  hasHydratedPersistedChatsUiState = false;
}

function getChatsUiStorageKey(): string {
  const currentUserId = String(getSessionUser()?.id ?? chatsState.loadedForUserId ?? "");
  return `arisfront:chats-ui:${currentUserId || "guest"}`;
}

function readPersistedChatsUiState(): PersistedChatsUiState | null {
  try {
    const raw = sessionStorage.getItem(getChatsUiStorageKey());
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedChatsUiState;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistChatsUiState(): void {
  try {
    const scrollStateByChatId = Object.fromEntries(chatScrollStateById.entries());

    const payload: PersistedChatsUiState = {
      selectedChatId: chatsState.selectedChatId,
      scrollStateByChatId,
    };

    sessionStorage.setItem(getChatsUiStorageKey(), JSON.stringify(payload));
  } catch {
    // Ignore storage errors and keep the chat usable.
  }
}

function hydratePersistedChatsUiState(): void {
  if (hasHydratedPersistedChatsUiState) {
    return;
  }

  const persisted = readPersistedChatsUiState();
  if (!persisted) {
    hasHydratedPersistedChatsUiState = true;
    return;
  }

  chatsState.unreadIncomingIdsByChatId = new Map();

  chatScrollStateById.clear();
  Object.entries(persisted.scrollStateByChatId ?? {}).forEach(([chatId, scrollState]) => {
    if (
      scrollState &&
      typeof scrollState.scrollTop === "number" &&
      typeof scrollState.pinnedToBottom === "boolean"
    ) {
      chatScrollStateById.set(chatId, scrollState);
    }
  });

  const selectedScrollState = chatScrollStateById.get(chatsState.selectedChatId);
  if (selectedScrollState) {
    isSelectedChatPinnedToBottom = selectedScrollState.pinnedToBottom;
  }

  hasHydratedPersistedChatsUiState = true;
}

function applySelectedChatPersistedViewState(): void {
  if (!chatsState.selectedChatId) {
    isSelectedChatPinnedToBottom = true;
    return;
  }

  const selectedScrollState = chatScrollStateById.get(chatsState.selectedChatId);
  isSelectedChatPinnedToBottom = selectedScrollState?.pinnedToBottom ?? true;
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
  return avatarLink
    ? `/image-proxy?url=${encodeURIComponent(avatarLink)}`
    : "/assets/img/default-avatar.png";
}

function getCurrentUserFullName(): string {
  const currentUser = getSessionUser();
  return `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim();
}

function getCurrentUserProfilePath(): string {
  return "/profile";
}

function splitFullName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function resolvePersonPath(fullName: string, profileId?: string): string {
  if (profileId) {
    return resolveProfilePath({ id: profileId });
  }

  const { firstName, lastName } = splitFullName(fullName);
  return resolveProfilePath({ firstName, lastName });
}

function getNormalisedPersonName(fullName: string): string {
  return fullName.trim().toLowerCase();
}

function rememberKnownChatContacts(friends: Friend[]): void {
  friends.forEach((friend) => {
    const fullName = `${friend.firstName} ${friend.lastName}`.trim();
    if (!fullName) {
      return;
    }

    knownChatContactsByName.set(getNormalisedPersonName(fullName), {
      profileId: friend.profileId,
      avatarLink: friend.avatarLink,
    });
  });
}

function rememberKnownUserContacts(users: Array<SuggestedUser | LatestEventUser>): void {
  users.forEach((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    if (!fullName) {
      return;
    }

    knownChatContactsByName.set(getNormalisedPersonName(fullName), {
      profileId: user.id,
      avatarLink: user.avatarLink || undefined,
    });
  });
}

async function ensureKnownChatContactsLoaded(): Promise<void> {
  if (knownChatContactsByName.size > 0) {
    return;
  }

  try {
    const [accepted, incoming, outgoing, suggested, latestEvents, popularUsers] = await Promise.all(
      [
        getFriends("accepted"),
        getIncomingFriendRequests("pending"),
        getOutgoingFriendRequests("pending"),
        getSuggestedUsers(),
        getLatestEvents(),
        getPublicPopularUsers(),
      ],
    );

    rememberKnownChatContacts(accepted);
    rememberKnownChatContacts(incoming);
    rememberKnownChatContacts(outgoing);
    rememberKnownUserContacts(suggested.items ?? []);
    rememberKnownUserContacts(latestEvents.items ?? []);
    rememberKnownUserContacts(popularUsers.items ?? []);
  } catch (error) {
    console.info("[chats] source=api scope=contacts error", {
      error: error instanceof Error ? error.message : "Не получилось загрузить контакты.",
    });
  }
}

function isOwnMessage(authorId?: string, authorName?: string): boolean {
  const currentUser = getSessionUser();
  const currentUserId = String(currentUser?.id ?? "");
  const currentUserName = getCurrentUserFullName();

  if (authorId && currentUserId && String(authorId) === currentUserId) {
    return true;
  }

  if (authorName && currentUserName && authorName.trim() === currentUserName) {
    return true;
  }

  return false;
}

function formatChatTime(value?: string): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatMessageTime(value?: string): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function createMockThreads(): ChatViewThread[] {
  const byId = (id: string) => PROFILE_RECORDS.find((profile) => profile.id === id);
  const currentUser = getSessionUser();
  const currentUserName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Вы";

  const pavel = byId("pavel-babkin");
  const arina = byId("arina-askhabova");
  const milana = byId("milana-shakhbieva");
  const egor = byId("egor-larkin");
  const sofya = byId("sofya-sitnichenko");

  return [
    {
      id: "mock-pavel",
      title: pavel ? `${pavel.firstName} ${pavel.lastName}` : "Павел Бабкин",
      avatarLink: pavel?.avatarLink,
      preview: "у вас неплохой диплом",
      timeLabel: "22 фев. 23:45",
      createdAt: "2026-02-22T12:50:00+03:00",
      updatedAt: "2026-02-22T23:45:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath("Павел Бабкин", pavel ? String(pavel.publicId) : undefined),
      messages: [
        {
          id: "m1",
          authorName: pavel ? `${pavel.firstName} ${pavel.lastName}` : "Павел Бабкин",
          text: "у вас неплохой диплом",
          createdAt: "2026-02-22T12:50:00+03:00",
          isOwn: false,
          avatarLink: pavel?.avatarLink,
          profilePath: resolvePersonPath(
            "Павел Бабкин",
            pavel ? String(pavel.publicId) : undefined,
          ),
        },
        {
          id: "m2",
          authorName: currentUserName,
          text: "Здравствуйте, Павел Сергеевич. Увидел вашу машину на парковке, понял, что вы сегодня в университете. Как вам в целом мой диплом? Я дополнил одно его дело, хорошо поработал над конструкторской частью. Посмотрите, отпишитесь если есть замечания. Буду рад любой критике. P.S. передавайте привет Кате",
          createdAt: "2026-02-22T23:45:00+03:00",
          isOwn: true,
          profilePath: getCurrentUserProfilePath(),
        },
        {
          id: "m3",
          authorName: pavel ? `${pavel.firstName} ${pavel.lastName}` : "Павел Бабкин",
          text: "у вас неплохой диплом",
          createdAt: "2026-02-22T12:50:00+03:00",
          isOwn: false,
          avatarLink: pavel?.avatarLink,
          profilePath: resolvePersonPath(
            "Павел Бабкин",
            pavel ? String(pavel.publicId) : undefined,
          ),
        },
      ],
    },
    {
      id: "mock-arina",
      title: arina ? `${arina.firstName} ${arina.lastName}` : "Арина Асхабова",
      avatarLink: arina?.avatarLink,
      preview: "ого!!!!!!!!!!",
      timeLabel: "1 ч.",
      createdAt: "2026-03-30T17:20:00+03:00",
      updatedAt: "2026-03-30T17:20:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath("Арина Асхабова", arina ? String(arina.publicId) : undefined),
      messages: [
        {
          id: "m4",
          authorName: arina ? `${arina.firstName} ${arina.lastName}` : "Арина Асхабова",
          text: "ого!!!!!!!!!!",
          createdAt: "2026-03-30T17:20:00+03:00",
          isOwn: false,
          avatarLink: arina?.avatarLink,
          profilePath: resolvePersonPath(
            "Арина Асхабова",
            arina ? String(arina.publicId) : undefined,
          ),
        },
      ],
    },
    {
      id: "mock-milana",
      title: milana ? `${milana.firstName} ${milana.lastName}` : "Милана Шахбиева",
      avatarLink: milana?.avatarLink,
      preview: "пойдем в мафию",
      timeLabel: "1 ч.",
      createdAt: "2026-03-30T17:05:00+03:00",
      updatedAt: "2026-03-30T17:05:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath(
        "Милана Шахбиева",
        milana ? String(milana.publicId) : undefined,
      ),
      messages: [
        {
          id: "m5",
          authorName: milana ? `${milana.firstName} ${milana.lastName}` : "Милана Шахбиева",
          text: "пойдем в мафию",
          createdAt: "2026-03-30T17:05:00+03:00",
          isOwn: false,
          avatarLink: milana?.avatarLink,
          profilePath: resolvePersonPath(
            "Милана Шахбиева",
            milana ? String(milana.publicId) : undefined,
          ),
        },
      ],
    },
    {
      id: "mock-egor",
      title: egor ? `${egor.firstName} ${egor.lastName}` : "Егор Ларкин",
      avatarLink: egor?.avatarLink,
      preview: "люблю ее сильно",
      timeLabel: "1 ч.",
      createdAt: "2026-03-30T16:45:00+03:00",
      updatedAt: "2026-03-30T16:45:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath("Егор Ларкин", egor ? String(egor.publicId) : undefined),
      messages: [
        {
          id: "m6",
          authorName: egor ? `${egor.firstName} ${egor.lastName}` : "Егор Ларкин",
          text: "люблю ее сильно",
          createdAt: "2026-03-30T16:45:00+03:00",
          isOwn: false,
          avatarLink: egor?.avatarLink,
          profilePath: resolvePersonPath("Егор Ларкин", egor ? String(egor.publicId) : undefined),
        },
      ],
    },
    {
      id: "mock-sofya",
      title: sofya ? `${sofya.firstName} ${sofya.lastName}` : "Софья Ситниченко",
      avatarLink: sofya?.avatarLink,
      preview: "ваши сообщения в 12...",
      timeLabel: "1 ч.",
      createdAt: "2026-03-30T16:15:00+03:00",
      updatedAt: "2026-03-30T16:15:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath(
        "Софья Ситниченко",
        sofya ? String(sofya.publicId) : undefined,
      ),
      messages: [
        {
          id: "m7",
          authorName: sofya ? `${sofya.firstName} ${sofya.lastName}` : "Софья Ситниченко",
          text: "ваши сообщения в 12...",
          createdAt: "2026-03-30T16:15:00+03:00",
          isOwn: false,
          avatarLink: sofya?.avatarLink,
          profilePath: resolvePersonPath(
            "Софья Ситниченко",
            sofya ? String(sofya.publicId) : undefined,
          ),
        },
      ],
    },
  ];
}

function mapApiChatsToThreads(chats: ChatSummary[]): ChatViewThread[] {
  return [...chats]
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.updatedAt ?? right.createdAt ?? 0).getTime();

      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return 0;
      }

      return rightTime - leftTime;
    })
    .map((chat, index) => {
      const knownContact = knownChatContactsByName.get(getNormalisedPersonName(chat.title || ""));
      const matchedProfile = findProfileRecord({
        id: knownContact?.profileId ?? chat.title,
        firstName: chat.title.split(" ")[0] ?? "",
        lastName: chat.title.split(" ").slice(1).join(" "),
      });

      return {
        id: chat.id,
        title: chat.title || `Чат ${index + 1}`,
        avatarLink: chat.avatarLink ?? knownContact?.avatarLink ?? matchedProfile?.avatarLink,
        preview: "",
        previewIsOwn: false,
        timeLabel: formatChatTime(chat.updatedAt ?? chat.createdAt),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt ?? chat.createdAt,
        source: "api",
        profilePath: resolvePersonPath(
          chat.title || `Чат ${index + 1}`,
          knownContact?.profileId ?? (matchedProfile ? String(matchedProfile.publicId) : undefined),
        ),
      };
    });
}

function mapMessageToViewMessage(message: ChatMessage, thread: ChatViewThread): ChatViewMessage {
  const currentUser = getSessionUser();
  const own = isOwnMessage(message.authorId, message.authorName);

  return {
    id: message.id,
    text: message.text,
    authorName:
      message.authorName ??
      (own
        ? `${currentUser?.firstName ?? "Вы"} ${currentUser?.lastName ?? ""}`.trim()
        : thread.title),
    isOwn: own,
    createdAt: message.createdAt,
    avatarLink: own ? currentUser?.avatarLink : thread.avatarLink,
    profilePath: own
      ? getCurrentUserProfilePath()
      : resolvePersonPath(message.authorName ?? thread.title, message.authorId || undefined),
  };
}

function dedupeMessagesById(messages: ChatViewMessage[]): ChatViewMessage[] {
  const byId = new Map<string, ChatViewMessage>();

  messages.forEach((message) => {
    byId.set(message.id, message);
  });

  return Array.from(byId.values());
}

function getUnreadMessageKey(message: ChatViewMessage): string {
  if (message.id) {
    return `id:${message.id}`;
  }

  return `fallback:${message.authorName}:${message.createdAt ?? ""}:${message.text}`;
}

function addPendingOutgoing(chatId: string, message: ChatViewMessage): void {
  const pending = chatsState.pendingOutgoingByChatId.get(chatId) ?? [];
  pending.push({
    localId: message.id,
    text: message.text,
    createdAt: message.createdAt,
  });
  chatsState.pendingOutgoingByChatId.set(chatId, pending);
}

function removePendingOutgoing(chatId: string, localId: string): void {
  const pending = chatsState.pendingOutgoingByChatId.get(chatId);
  if (!pending?.length) {
    return;
  }

  const nextPending = pending.filter((item) => item.localId !== localId);
  if (nextPending.length) {
    chatsState.pendingOutgoingByChatId.set(chatId, nextPending);
    return;
  }

  chatsState.pendingOutgoingByChatId.delete(chatId);
}

function reconcilePendingOutgoing(
  chatId: string,
  incomingMessage: ChatViewMessage,
  thread: ChatViewThread,
): boolean {
  const pending = chatsState.pendingOutgoingByChatId.get(chatId);
  if (!pending?.length) {
    return false;
  }

  const incomingCreatedAt = incomingMessage.createdAt
    ? new Date(incomingMessage.createdAt).getTime()
    : 0;
  const matchedPending = pending.find((item) => {
    if (item.text !== incomingMessage.text) {
      return false;
    }

    const pendingCreatedAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    if (!incomingCreatedAt || !pendingCreatedAt) {
      return true;
    }

    return Math.abs(incomingCreatedAt - pendingCreatedAt) <= 15000;
  });

  if (!matchedPending) {
    return false;
  }

  thread.messages = sortMessagesByCreatedAt(
    dedupeMessagesById(
      (thread.messages ?? []).map((message) =>
        message.id === matchedPending.localId
          ? {
              ...message,
              id: incomingMessage.id,
              createdAt: incomingMessage.createdAt,
              authorName: incomingMessage.authorName,
              avatarLink: incomingMessage.avatarLink,
              isOwn: true,
              profilePath: getCurrentUserProfilePath(),
            }
          : message,
      ),
    ),
  );
  syncThreadProfilePathFromMessages(thread);
  removePendingOutgoing(chatId, matchedPending.localId);
  updateThreadPreview(thread);
  sortThreadsByUpdatedAt();
  refreshChatsPage(chatsRoot);
  return true;
}

function updateThreadPreview(thread: ChatViewThread): void {
  const messages = thread.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return;
  }

  thread.preview = lastMessage.text;
  thread.previewIsOwn = lastMessage.isOwn;
  thread.timeLabel = formatMessageTime(lastMessage.createdAt);
  thread.updatedAt = lastMessage.createdAt ?? thread.updatedAt;
}

function syncThreadProfilePathFromMessages(thread: ChatViewThread): void {
  const otherMessage = (thread.messages ?? []).find(
    (message) => !message.isOwn && message.profilePath && message.profilePath !== "/profile",
  );

  if (otherMessage?.profilePath) {
    thread.profilePath = otherMessage.profilePath;
  }
}

function getMessagesFingerprint(messages: ChatViewMessage[] | undefined): string {
  return (messages ?? [])
    .map((message) => `${message.id}:${message.createdAt ?? ""}:${message.text}`)
    .join("|");
}

function getChatMessagesContainer(root: ParentNode = document): HTMLElement | null {
  const container = root.querySelector(".chat-messages");
  return container instanceof HTMLElement ? container : null;
}

function captureChatViewportAnchor(root: ParentNode = document): ChatViewportAnchor | null {
  const container = getChatMessagesContainer(root);
  if (!container) {
    return null;
  }

  const messages = Array.from(container.querySelectorAll<HTMLElement>("[data-chat-message-id]"));
  const anchor = messages.find(
    (message) => message.offsetTop + message.offsetHeight > container.scrollTop,
  );

  if (!anchor) {
    return null;
  }

  const messageId = anchor.getAttribute("data-chat-message-id");
  if (!messageId) {
    return null;
  }

  return {
    messageId,
    offset: container.scrollTop - anchor.offsetTop,
  };
}

function restoreChatViewportAnchor(
  anchor: ChatViewportAnchor,
  root: ParentNode = document,
): boolean {
  const container = getChatMessagesContainer(root);
  if (!container) {
    return false;
  }

  const message = container.querySelector<HTMLElement>(
    `[data-chat-message-id="${CSS.escape(anchor.messageId)}"]`,
  );
  if (!message) {
    return false;
  }

  container.scrollTop = message.offsetTop + anchor.offset;
  return true;
}

function isChatScrolledNearBottom(root: ParentNode = document, threshold = 48): boolean {
  const container = getChatMessagesContainer(root);
  if (!container) {
    return true;
  }

  return container.scrollHeight - (container.scrollTop + container.clientHeight) <= threshold;
}

function syncSelectedChatPinnedToBottom(root: ParentNode = document): void {
  isSelectedChatPinnedToBottom = isChatScrolledNearBottom(root, 8);
}

function rememberSelectedChatScroll(root: ParentNode = document): void {
  if (!chatsState.selectedChatId) {
    return;
  }

  const container = getChatMessagesContainer(root);
  if (!container) {
    return;
  }

  syncSelectedChatPinnedToBottom(root);
  const anchor = !isSelectedChatPinnedToBottom ? captureChatViewportAnchor(root) : null;
  chatScrollStateById.set(chatsState.selectedChatId, {
    scrollTop: container.scrollTop,
    pinnedToBottom: isSelectedChatPinnedToBottom,
    anchor: anchor ?? undefined,
  });
  persistChatsUiState();
}

function restoreSelectedChatScroll(root: ParentNode = document): void {
  if (!chatsState.selectedChatId) {
    return;
  }

  const container = getChatMessagesContainer(root);
  if (!container) {
    return;
  }

  const scrollState = chatScrollStateById.get(chatsState.selectedChatId);
  if (!scrollState) {
    syncSelectedChatPinnedToBottom(root);
    return;
  }

  if (scrollState.pinnedToBottom) {
    container.scrollTop = container.scrollHeight;
    isSelectedChatPinnedToBottom = true;
  } else {
    if (!scrollState.anchor || !restoreChatViewportAnchor(scrollState.anchor, root)) {
      container.scrollTop = scrollState.scrollTop;
    }
    syncSelectedChatPinnedToBottom(root);
  }
}

function scrollChatToBottom(root: ParentNode = document): void {
  const container = getChatMessagesContainer(root);
  if (!container) {
    return;
  }

  container.scrollTop = container.scrollHeight;
}

function getUnreadIncomingCount(chatId: string): number {
  return chatsState.unreadIncomingIdsByChatId.get(chatId)?.size ?? 0;
}

function clearUnreadIncoming(chatId: string): void {
  chatsState.unreadIncomingIdsByChatId.delete(chatId);
  persistChatsUiState();
}

function markUnreadIncoming(chatId: string, messageIds: string[]): void {
  if (!messageIds.length) {
    return;
  }

  const unreadIds = chatsState.unreadIncomingIdsByChatId.get(chatId) ?? new Set<string>();
  messageIds.forEach((messageId) => {
    if (messageId) {
      unreadIds.add(messageId);
    }
  });
  chatsState.unreadIncomingIdsByChatId.set(chatId, unreadIds);
  persistChatsUiState();
}

function getThreadUpdatedAtValue(thread: ChatViewThread): number {
  if (!thread.updatedAt) {
    return 0;
  }

  const parsed = new Date(thread.updatedAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getThreadCreatedAtValue(thread: ChatViewThread): number {
  if (!thread.createdAt) {
    return 0;
  }

  const parsed = new Date(thread.createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function hasThreadActivity(thread: ChatViewThread): boolean {
  if ((thread.messages?.length ?? 0) > 0) {
    return true;
  }

  if (thread.preview.trim()) {
    return true;
  }

  return getThreadUpdatedAtValue(thread) > getThreadCreatedAtValue(thread);
}

function sortThreadsByUpdatedAt(): void {
  chatsState.threads.sort((left, right) => {
    const leftHasActivity = hasThreadActivity(left);
    const rightHasActivity = hasThreadActivity(right);

    if (leftHasActivity !== rightHasActivity) {
      return leftHasActivity ? -1 : 1;
    }

    return getThreadUpdatedAtValue(right) - getThreadUpdatedAtValue(left);
  });
}

function mergeApiThreads(nextThreads: ChatViewThread[]): boolean {
  const previousSignature = chatsState.threads.map((thread) => thread.id).join("|");
  const existingById = new Map(chatsState.threads.map((thread) => [thread.id, thread]));
  const previousSelectedChatId = chatsState.selectedChatId;

  chatsState.threads = nextThreads.map((thread) => {
    const existing = existingById.get(thread.id);
    const merged: ChatViewThread = {
      ...thread,
      messages: existing?.messages,
      preview: existing?.preview ?? thread.preview,
      previewIsOwn: existing?.previewIsOwn ?? thread.previewIsOwn,
      timeLabel: existing?.messages?.length ? existing.timeLabel : thread.timeLabel,
      createdAt: existing?.createdAt ?? thread.createdAt,
      updatedAt: existing?.updatedAt ?? thread.updatedAt,
      profilePath: thread.profilePath ?? existing?.profilePath,
    };

    if (merged.messages?.length) {
      syncThreadProfilePathFromMessages(merged);
      updateThreadPreview(merged);
    }

    return merged;
  });

  sortThreadsByUpdatedAt();
  chatsState.selectedChatId =
    chatsState.threads.find((thread) => thread.id === previousSelectedChatId)?.id ??
    chatsState.threads[0]?.id ??
    "";

  return previousSignature !== chatsState.threads.map((thread) => thread.id).join("|");
}

function appendIncomingMessage(chatId: string, message: ChatMessage): void {
  const thread = chatsState.threads.find((item) => item.id === chatId);
  if (!thread || thread.source !== "api") {
    return;
  }

  const shouldNotify =
    chatId === chatsState.selectedChatId &&
    !isOwnMessage(message.authorId, message.authorName) &&
    !isSelectedChatPinnedToBottom;

  const incomingMessage = mapMessageToViewMessage(message, thread);
  if (reconcilePendingOutgoing(chatId, incomingMessage, thread)) {
    return;
  }

  const currentMessages = thread.messages ?? [];
  if (currentMessages.some((item) => item.id === incomingMessage.id)) {
    return;
  }

  thread.messages = sortMessagesByCreatedAt(
    dedupeMessagesById([...currentMessages, incomingMessage]),
  );
  syncThreadProfilePathFromMessages(thread);
  updateThreadPreview(thread);
  sortThreadsByUpdatedAt();
  if (chatId === chatsState.selectedChatId && isSelectedChatPinnedToBottom) {
    shouldScrollChatToBottom = true;
  } else if (shouldNotify) {
    markUnreadIncoming(chatId, [getUnreadMessageKey(incomingMessage)]);
  }
  refreshChatsPage(chatsRoot);
}

function ensureChatSocketSubscribed(chatId: string): void {
  if (chatsState.source !== "api" || chatsState.unsubscribeByChatId.has(chatId)) {
    return;
  }

  const unsubscribe = subscribeToChatMessages(chatId, {
    onMessage: (message) => appendIncomingMessage(chatId, message),
    onError: () => {
      console.info("[chats] source=ws scope=messages error", { chatId });
    },
  });

  chatsState.unsubscribeByChatId.set(chatId, unsubscribe);
}

function getRequestedChatId(): string {
  return new URLSearchParams(window.location.search).get("chatId") ?? "";
}

function syncSelectedChatToUrl(chatId: string, options: { replace?: boolean } = {}): void {
  const nextUrl = new URL(window.location.href);

  if (chatId) {
    nextUrl.searchParams.set("chatId", chatId);
  } else {
    nextUrl.searchParams.delete("chatId");
  }

  const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextPath === currentPath) {
    return;
  }

  if (options.replace) {
    window.history.replaceState({}, "", nextPath);
    return;
  }

  window.history.pushState({}, "", nextPath);
}

async function ensureMessagesLoaded(
  chatId: string,
  options: { background?: boolean; force?: boolean } = {},
): Promise<void> {
  const thread = chatsState.threads.find((item) => item.id === chatId);
  if (!thread || thread.source !== "api") {
    return;
  }

  if (!options.force && thread.messages) {
    return;
  }

  const hadMessages = Boolean(thread.messages);
  if (!options.background) {
    chatsState.loadingMessages = true;
  }

  try {
    const previousMessages = thread.messages ?? [];
    const messages = await getChatMessages(chatId);
    const nextMessages = sortMessagesByCreatedAt(
      dedupeMessagesById(messages.map((message) => mapMessageToViewMessage(message, thread))),
    );
    const previousFingerprint = getMessagesFingerprint(previousMessages);
    const nextFingerprint = getMessagesFingerprint(nextMessages);

    thread.messages = nextMessages;
    syncThreadProfilePathFromMessages(thread);
    updateThreadPreview(thread);
    sortThreadsByUpdatedAt();

    if (!options.background) {
      chatsState.errorMessage = "";
    }

    if (options.background && previousFingerprint !== nextFingerprint) {
      const shouldNotify = chatId === chatsState.selectedChatId && !isSelectedChatPinnedToBottom;
      const shouldStickToBottom =
        chatId === chatsState.selectedChatId && isSelectedChatPinnedToBottom;

      if (shouldNotify) {
        const previousKeys = new Set(previousMessages.map(getUnreadMessageKey));
        const nextUnreadKeys = nextMessages
          .filter((message) => !message.isOwn)
          .map(getUnreadMessageKey)
          .filter((key) => !previousKeys.has(key));

        markUnreadIncoming(chatId, nextUnreadKeys);
      }

      if (shouldStickToBottom) {
        shouldScrollChatToBottom = true;
      }

      refreshChatsPage(chatsRoot);
    }
  } catch (error) {
    if (!hadMessages) {
      thread.messages = [];
    }
    if (!options.background) {
      chatsState.errorMessage =
        error instanceof Error ? error.message : "Не получилось загрузить сообщения.";
    }

    console.info("[chats] source=api scope=messages error", {
      chatId,
      error: error instanceof Error ? error.message : "Не получилось загрузить сообщения.",
    });
  } finally {
    if (!options.background) {
      chatsState.loadingMessages = false;
    }
  }
}

function ensureChatsPollingStarted(): void {
  if (chatsPollIntervalId !== null) {
    return;
  }

  chatsPollIntervalId = window.setInterval(() => {
    if (document.visibilityState === "hidden") {
      return;
    }

    if (!chatsState.loaded || chatsState.source !== "api") {
      return;
    }

    void refreshChatsInBackground();
  }, 3000);
}

async function refreshChatsInBackground(): Promise<void> {
  if (!chatsState.loaded || chatsState.source !== "api") {
    return;
  }

  try {
    await ensureKnownChatContactsLoaded();
    const chats = await getChats();
    const listChanged = mergeApiThreads(mapApiChatsToThreads(chats));

    await Promise.all(
      chatsState.threads.map(async (thread) => {
        ensureChatSocketSubscribed(thread.id);
        await ensureMessagesLoaded(thread.id, { background: true, force: true });
      }),
    );

    if (listChanged) {
      refreshChatsPage(chatsRoot);
    }
  } catch (error) {
    console.info("[chats] source=api scope=list background error", {
      error: error instanceof Error ? error.message : "Не получилось обновить список чатов.",
    });
  }
}

async function ensureChatsLoaded(): Promise<void> {
  const requestedChatId = getRequestedChatId();
  const persistedUiState = readPersistedChatsUiState();
  const preferredChatId = requestedChatId || persistedUiState?.selectedChatId || "";

  if (chatsState.loaded) {
    if (preferredChatId) {
      const requestedThread = chatsState.threads.find((thread) => thread.id === preferredChatId);

      if (requestedThread) {
        chatsState.selectedChatId = requestedThread.id;
        applySelectedChatPersistedViewState();
      } else {
        chatsState.loaded = false;
      }
    }
  }

  if (chatsState.loaded) {
    if (chatsState.selectedChatId) {
      await ensureMessagesLoaded(chatsState.selectedChatId);
    }

    return;
  }

  try {
    await ensureKnownChatContactsLoaded();
    const chats = await getChats();
    chatsState.source = "api";
    chatsState.threads = mapApiChatsToThreads(chats);
    sortThreadsByUpdatedAt();
    chatsState.selectedChatId =
      chatsState.threads.find((thread) => thread.id === preferredChatId)?.id ??
      chatsState.threads[0]?.id ??
      "";
    applySelectedChatPersistedViewState();
    chatsState.errorMessage = "";
  } catch {
    chatsState.source = "mock";
    chatsState.threads = createMockThreads();
    chatsState.selectedChatId =
      chatsState.threads.find((thread) => thread.id === preferredChatId)?.id ??
      chatsState.threads[0]?.id ??
      "";
    applySelectedChatPersistedViewState();
    chatsState.errorMessage = "";
  }

  chatsState.loaded = true;
  syncSelectedChatToUrl(chatsState.selectedChatId, { replace: true });

  await Promise.all(
    chatsState.threads.map(async (thread) => {
      ensureChatSocketSubscribed(thread.id);
      await ensureMessagesLoaded(thread.id, { background: true });
    }),
  );

  if (chatsState.selectedChatId) {
    await ensureMessagesLoaded(chatsState.selectedChatId);
  }
}

function getFilteredThreads(): ChatViewThread[] {
  const query = chatsState.query.trim().toLowerCase();
  if (!query) {
    return chatsState.threads;
  }

  return chatsState.threads.filter((thread) => {
    const previewState = getThreadPreviewState(thread);

    return [thread.title, previewState.text].join(" ").toLowerCase().includes(query);
  });
}

function getThreadPreviewState(thread: ChatViewThread): {
  text: string;
  isOwn: boolean;
  timeLabel: string;
} {
  const messages = thread.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return {
      text: thread.preview,
      isOwn: Boolean(thread.previewIsOwn),
      timeLabel: thread.preview.trim() ? thread.timeLabel : "",
    };
  }

  return {
    text: lastMessage.text,
    isOwn: lastMessage.isOwn,
    timeLabel: formatMessageTime(lastMessage.createdAt) || thread.timeLabel,
  };
}

function getSelectedThread(filteredThreads: ChatViewThread[]): ChatViewThread | undefined {
  return (
    filteredThreads.find((thread) => thread.id === chatsState.selectedChatId) ?? filteredThreads[0]
  );
}

function renderThreadsList(threads: ChatViewThread[]): string {
  if (!threads.length) {
    return '<p class="chats-list__empty">Чатов пока нет.</p>';
  }

  return threads
    .map((thread) => {
      const isActive = thread.id === chatsState.selectedChatId;
      const previewState = getThreadPreviewState(thread);

      return `
        <button
          type="button"
          class="chat-thread${isActive ? " chat-thread--active" : ""}"
          data-chat-select="${escapeHtml(thread.id)}"
        >
          <img
            class="chat-thread__avatar"
            src="${getAvatarSrc(thread.avatarLink)}"
            alt="${escapeHtml(thread.title)}"
          >
          <div class="chat-thread__content">
            <strong class="chat-thread__title">${escapeHtml(thread.title)}</strong>
            <div class="chat-thread__meta">
              <span class="chat-thread__preview">
                ${previewState.isOwn ? '<span class="chat-thread__preview-prefix">Вы:</span> ' : ""}
                ${escapeHtml(previewState.text)}
              </span>
              <span class="chat-thread__time">${escapeHtml(previewState.timeLabel)}</span>
            </div>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderMessages(thread?: ChatViewThread): string {
  if (!thread) {
    return '<div class="chat-view__empty">Выбери чат слева, чтобы открыть переписку.</div>';
  }

  if (chatsState.loadingMessages && thread.source === "api" && !thread.messages) {
    return '<div class="chat-view__loading">Загружаем сообщения...</div>';
  }

  const messages = thread.messages ?? [];

  if (!messages.length) {
    return '<div class="chat-view__empty">Сообщений пока нет.</div>';
  }

  return messages
    .map((message) => {
      return `
        <article
          class="chat-bubble${message.isOwn ? " chat-bubble--own" : ""}"
          data-chat-message-id="${escapeHtml(message.id)}"
        >
          <img
            class="chat-bubble__avatar"
            src="${getAvatarSrc(message.avatarLink)}"
            alt="${escapeHtml(message.authorName)}"
          >
          <div class="chat-bubble__body">
            <h3 class="chat-bubble__author">
              <a
                class="chat-bubble__author-link"
                href="${escapeHtml(message.profilePath ?? (message.isOwn ? "/profile" : "#"))}"
                data-link
              >
                ${escapeHtml(message.authorName)}
              </a>
            </h3>
            <p class="chat-bubble__text">${escapeHtml(message.text)}</p>
          </div>
          <span class="chat-bubble__time">${escapeHtml(formatMessageTime(message.createdAt))}</span>
        </article>
      `;
    })
    .join("");
}

function renderScrollControls(thread?: ChatViewThread): string {
  if (!thread || isSelectedChatPinnedToBottom) {
    return "";
  }

  const hasUnreadIncoming = getUnreadIncomingCount(thread.id) > 0;

  return `
    ${
      hasUnreadIncoming
        ? `
          <div class="chat-scroll-indicator-wrap">
            <button type="button" class="chat-new-indicator" data-chat-scroll-bottom>
              Новые сообщения
            </button>
          </div>
        `
        : ""
    }
    <div class="chat-scroll-button-wrap">
      ${""}
      <button
        type="button"
        class="chat-scroll-bottom-button"
        data-chat-scroll-bottom
        aria-label="Прокрутить вниз"
        title="Прокрутить вниз"
      >
        ↓
      </button>
    </div>
  `;
}

function renderChatsContent(): string {
  const filteredThreads = getFilteredThreads();
  const selectedThread = getSelectedThread(filteredThreads);

  if (selectedThread && selectedThread.id !== chatsState.selectedChatId) {
    chatsState.selectedChatId = selectedThread.id;
  }

  return `
    <section class="chats-page" data-chats-page>
      <aside class="chats-sidebar">
        <h1 class="chats-sidebar__title">Сообщения</h1>

        <label class="chats-search" aria-label="Поиск по чатам">
          <img class="chats-search__icon" src="/assets/img/icons/search.svg" alt="">
          <input
            class="chats-search__input"
            type="text"
            value="${escapeHtml(chatsState.query)}"
            placeholder="Поиск по чатам"
            data-chat-search
          >
        </label>

        <div class="chats-list">
          ${renderThreadsList(filteredThreads)}
        </div>
      </aside>

      <section class="chat-view">
        ${
          selectedThread
            ? `
              <header class="chat-header">
                <img
                  class="chat-header__avatar"
                  src="${getAvatarSrc(selectedThread.avatarLink)}"
                  alt="${escapeHtml(selectedThread.title)}"
                >
                <div>
                  <h2 class="chat-header__title">
                    <a
                      class="chat-header__title-link"
                      href="${escapeHtml(selectedThread.profilePath ?? "#")}"
                      data-link
                    >
                      ${escapeHtml(selectedThread.title)}
                    </a>
                  </h2>
                  ${
                    chatsState.source === "mock"
                      ? '<p class="chat-header__meta">Демо-интерфейс до полного подключения API.</p>'
                      : ""
                  }
                </div>
              </header>
            `
            : ""
        }

        <div class="chat-messages">
          ${renderMessages(selectedThread)}
        </div>

        <div data-chat-scroll-controls>
          ${renderScrollControls(selectedThread)}
        </div>

        ${
          selectedThread
            ? `
              <form class="chat-compose" data-chat-compose-form>
                <input
                  class="chat-compose__field"
                  type="text"
                  name="message"
                  placeholder="Начните печатать сообщение..."
                  autocomplete="off"
                >
                <button type="submit" class="chat-compose__send">Отправить</button>
              </form>
            `
            : ""
        }
      </section>
    </section>
  `;
}

function refreshChatsPage(root: ParentNode = document): void {
  const container = root.querySelector("[data-chats-page]");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const searchInput = container.querySelector<HTMLInputElement>("[data-chat-search]");
  const searchWasFocused = document.activeElement === searchInput;
  const searchSelectionStart = searchInput?.selectionStart ?? null;
  const searchSelectionEnd = searchInput?.selectionEnd ?? null;

  const currentMessagesContainer = getChatMessagesContainer(container);
  const previousScrollTop = currentMessagesContainer?.scrollTop ?? 0;
  const previousAnchor =
    !shouldScrollChatToBottom && !isSelectedChatPinnedToBottom
      ? captureChatViewportAnchor(container)
      : null;
  if (chatsState.selectedChatId && currentMessagesContainer) {
    chatScrollStateById.set(chatsState.selectedChatId, {
      scrollTop: previousScrollTop,
      pinnedToBottom: isSelectedChatPinnedToBottom,
    });
  }

  const template = document.createElement("template");
  template.innerHTML = renderChatsContent().trim();

  const next = template.content.firstElementChild;
  if (!(next instanceof HTMLElement)) {
    return;
  }

  container.replaceWith(next);

  if (searchWasFocused) {
    const nextSearchInput = next.querySelector<HTMLInputElement>("[data-chat-search]");
    if (nextSearchInput) {
      nextSearchInput.focus();

      if (searchSelectionStart !== null && searchSelectionEnd !== null) {
        nextSearchInput.setSelectionRange(searchSelectionStart, searchSelectionEnd);
      }
    }
  }

  const nextMessagesContainer = getChatMessagesContainer(next);
  if (nextMessagesContainer) {
    if (shouldScrollChatToBottom) {
      nextMessagesContainer.scrollTop = nextMessagesContainer.scrollHeight;
      shouldScrollChatToBottom = false;
      isSelectedChatPinnedToBottom = true;
    } else {
      const scrollState = chatsState.selectedChatId
        ? chatScrollStateById.get(chatsState.selectedChatId)
        : undefined;

      if (scrollState && !scrollState.pinnedToBottom) {
        if (!previousAnchor || !restoreChatViewportAnchor(previousAnchor, next)) {
          nextMessagesContainer.scrollTop = scrollState.scrollTop;
        }
        syncSelectedChatPinnedToBottom(next);
      } else {
        nextMessagesContainer.scrollTop = previousScrollTop;
        syncSelectedChatPinnedToBottom(next);
      }
    }

    rememberSelectedChatScroll(next);
  }
}

function refreshScrollControls(root: ParentNode = document): void {
  const container = root.querySelector("[data-chat-scroll-controls]");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const selectedThread = chatsState.threads.find(
    (thread) => thread.id === chatsState.selectedChatId,
  );
  container.innerHTML = renderScrollControls(selectedThread);
}

export async function renderChats(): Promise<string> {
  const isAuthorised = getSessionUser() !== null;
  const currentUserId = String(getSessionUser()?.id ?? "");

  if (chatsState.loadedForUserId !== currentUserId) {
    resetChatsState();
    chatsState.loadedForUserId = currentUserId;
  }

  if (!isAuthorised) {
    return renderFeed();
  }

  hydratePersistedChatsUiState();
  await ensureChatsLoaded();

  return `
    <div class="app-page">
      ${renderHeader()}

      <main class="app-layout app-layout--content-wide">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised })}
        </aside>

        <section class="app-layout__center">
          ${renderChatsContent()}
        </section>
      </main>
    </div>
  `;
}

export function initChats(root: Document | HTMLElement = document): void {
  const bindableRoot = root as ChatRoot;
  chatsRoot = root;
  ensureChatsPollingStarted();
  requestAnimationFrame(() => {
    restoreSelectedChatScroll(root);
    refreshScrollControls(root);
    rememberSelectedChatScroll(root);
  });

  if (bindableRoot.__chatsBound) {
    return;
  }

  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-chat-search]")) {
      return;
    }

    chatsState.query = target.value;
    refreshChatsPage(root);
  });

  root.addEventListener("click", async (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const scrollBottomButton = target.closest("[data-chat-scroll-bottom]");
    if (scrollBottomButton instanceof HTMLButtonElement) {
      if (chatsState.selectedChatId) {
        clearUnreadIncoming(chatsState.selectedChatId);
      }
      isSelectedChatPinnedToBottom = true;
      shouldScrollChatToBottom = true;
      persistChatsUiState();
      refreshChatsPage(root);
      requestAnimationFrame(() => {
        scrollChatToBottom(root);
        rememberSelectedChatScroll(root);
      });
      return;
    }

    const chatButton = target.closest("[data-chat-select]");
    if (chatButton instanceof HTMLButtonElement) {
      const chatId = chatButton.getAttribute("data-chat-select");
      if (!chatId || chatId === chatsState.selectedChatId) {
        return;
      }

      chatsState.selectedChatId = chatId;
      clearUnreadIncoming(chatId);
      isSelectedChatPinnedToBottom = true;
      persistChatsUiState();
      syncSelectedChatToUrl(chatId);
      refreshChatsPage(root);
      await ensureMessagesLoaded(chatId);
      refreshChatsPage(root);
    }
  });

  root.addEventListener(
    "scroll",
    (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains("chat-messages")) {
        return;
      }

      const wasPinnedToBottom = isSelectedChatPinnedToBottom;
      syncSelectedChatPinnedToBottom(root);
      rememberSelectedChatScroll(root);

      if (wasPinnedToBottom !== isSelectedChatPinnedToBottom) {
        refreshScrollControls(root);
        return;
      }

      if (chatsState.selectedChatId && isSelectedChatPinnedToBottom) {
        if (getUnreadIncomingCount(chatsState.selectedChatId) > 0) {
          clearUnreadIncoming(chatsState.selectedChatId);
          refreshChatsPage(root);
        }
      }
    },
    true,
  );

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) {
      return;
    }

    if (!target.matches("[data-chat-compose-form]")) {
      return;
    }

    event.preventDefault();

    const selectedThread = chatsState.threads.find(
      (thread) => thread.id === chatsState.selectedChatId,
    );
    if (!selectedThread) {
      return;
    }

    const formData = new FormData(target);
    const text = String(formData.get("message") ?? "").trim();
    if (!text) {
      return;
    }

    const currentUser = getSessionUser();
    const optimisticMessage: ChatViewMessage = {
      id: `local-${Date.now()}`,
      text,
      authorName: `${currentUser?.firstName ?? "Вы"} ${currentUser?.lastName ?? ""}`.trim(),
      isOwn: true,
      createdAt: new Date().toISOString(),
      avatarLink: currentUser?.avatarLink,
      profilePath: getCurrentUserProfilePath(),
    };

    if (!selectedThread.messages) {
      selectedThread.messages = [];
    }

    selectedThread.messages = sortMessagesByCreatedAt([
      ...selectedThread.messages,
      optimisticMessage,
    ]);
    addPendingOutgoing(selectedThread.id, optimisticMessage);
    selectedThread.preview = text;
    selectedThread.previewIsOwn = true;
    selectedThread.timeLabel = formatMessageTime(optimisticMessage.createdAt);
    selectedThread.updatedAt = optimisticMessage.createdAt;
    sortThreadsByUpdatedAt();
    clearUnreadIncoming(selectedThread.id);
    isSelectedChatPinnedToBottom = true;
    shouldScrollChatToBottom = true;
    target.reset();
    refreshChatsPage(root);

    if (selectedThread.source === "api") {
      void sendChatMessage(selectedThread.id, { text })
        .then((message) => {
          console.info("[chats] source=api scope=send", {
            chatId: selectedThread.id,
            messageId: message.id,
          });

          selectedThread.messages = sortMessagesByCreatedAt(
            dedupeMessagesById(
              (selectedThread.messages ?? []).map((item) =>
                item.id === optimisticMessage.id
                  ? {
                      ...item,
                      id: message.id,
                      createdAt: message.createdAt,
                      profilePath: getCurrentUserProfilePath(),
                    }
                  : item,
              ),
            ),
          );
          removePendingOutgoing(selectedThread.id, optimisticMessage.id);
          updateThreadPreview(selectedThread);
          sortThreadsByUpdatedAt();
          refreshChatsPage(root);
        })
        .catch((error: unknown) => {
          console.error("[chats] source=api scope=send error", error);
          selectedThread.messages = (selectedThread.messages ?? []).filter(
            (item) => item.id !== optimisticMessage.id,
          );
          removePendingOutgoing(selectedThread.id, optimisticMessage.id);
          refreshChatsPage(root);
        });
    }
  });

  bindableRoot.__chatsBound = true;
}
