import { getCurrentUser, type User } from "../api/auth";
import { getMyProfile } from "../api/profile";
import { isNetworkUnavailableError } from "./network-status";
import { StateManager } from "./StateManager";

/**
 * Доступные режимы ленты.
 */
export type FeedMode = "by-time" | "for-you";

/**
 * Глобальное состояние клиентской сессии.
 */
export type SessionState = {
  user: User | null;
  feedMode: FeedMode;
};

/**
 * Полезная нагрузка события изменения сессии.
 */
type SessionChangeDetail = {
  key: "user" | "feedMode" | "init";
  state: SessionState;
};

/**
 * Реактивное хранилище состояния сессии.
 * Можно подписаться на изменения через `sessionStore.subscribe(callback)`.
 */
export const sessionStore = new StateManager<SessionState>({
  user: null,
  feedMode: "by-time",
});

const SESSION_USER_STORAGE_KEY = "arisfront:session-user";

function readPersistedSessionUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as User | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const nextUser: User = {
      id: String(parsed.id ?? ""),
      firstName: String(parsed.firstName ?? ""),
      lastName: String(parsed.lastName ?? ""),
    };

    if (typeof parsed.login === "string") {
      nextUser.login = parsed.login;
    }

    if (typeof parsed.email === "string") {
      nextUser.email = parsed.email;
    }

    if (typeof parsed.avatarLink === "string") {
      nextUser.avatarLink = parsed.avatarLink;
    }

    return nextUser;
  } catch {
    return null;
  }
}

function persistSessionUser(user: User | null): void {
  try {
    if (!user) {
      localStorage.removeItem(SESSION_USER_STORAGE_KEY);
      return;
    }

    localStorage.setItem(SESSION_USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Игнорируем ошибки хранилища, чтобы состояние во время выполнения оставалось рабочим.
  }
}

/**
 * Проверяет, является ли значение корректным режимом ленты.
 */
function isFeedMode(value: string): value is FeedMode {
  return value === "by-time" || value === "for-you";
}

/**
 * Отправляет событие изменения состояния сессии.
 */
function emitSessionChange(key: SessionChangeDetail["key"]): void {
  window.dispatchEvent(
    new CustomEvent<SessionChangeDetail>("sessionchange", {
      detail: { key, state: sessionStore.get() as SessionState },
    }),
  );
}

/**
 * Возвращает snapshot состояния сессии только для чтения.
 */
export function getSessionState(): SessionState {
  return sessionStore.get() as SessionState;
}

/**
 * Возвращает текущего авторизованного пользователя.
 */
export function getSessionUser(): User | null {
  return sessionStore.get().user;
}

/**
 * Возвращает текущий режим ленты.
 */
export function getFeedMode(): FeedMode {
  return sessionStore.get().feedMode;
}

/**
 * Устанавливает текущего пользователя в состояние сессии.
 */
export function setSessionUser(user: User | null): void {
  sessionStore.patch({ user });
  persistSessionUser(user);
  emitSessionChange("user");
}

/**
 * Удаляет текущего пользователя из состояния сессии.
 */
export function clearSessionUser(): void {
  sessionStore.patch({ user: null });
  persistSessionUser(null);
  emitSessionChange("user");
}

/**
 * Устанавливает текущий режим ленты.
 */
export function setFeedMode(mode: FeedMode): void {
  sessionStore.patch({ feedMode: mode });
  localStorage.setItem("feedMode", mode);
  emitSessionChange("feedMode");
}

/**
 * Инициализирует состояние сессии из localStorage и backend-сессии.
 */
export async function initSession(): Promise<void> {
  const savedMode = localStorage.getItem("feedMode");
  sessionStore.patch({
    feedMode: savedMode && isFeedMode(savedMode) ? savedMode : "by-time",
    user: readPersistedSessionUser(),
  });

  try {
    const [user, profileResult] = await Promise.allSettled([getCurrentUser(), getMyProfile()]);

    if (user.status === "rejected" || !user.value) {
      sessionStore.patch({ user: null });
      persistSessionUser(null);
    } else {
      let nextUser = user.value;

      if (profileResult.status === "fulfilled") {
        const avatarLink =
          typeof profileResult.value.imageLink === "string"
            ? profileResult.value.imageLink.trim()
            : "";
        if (avatarLink) {
          nextUser = { ...nextUser, avatarLink };
        }
      }

      sessionStore.patch({ user: nextUser });
      persistSessionUser(nextUser);
    }
  } catch (error) {
    if (!isNetworkUnavailableError(error)) {
      sessionStore.patch({ user: null });
      persistSessionUser(null);
    }
  }

  emitSessionChange("init");
}
