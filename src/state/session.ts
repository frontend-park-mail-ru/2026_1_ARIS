/**
 * Глобальное состояние пользовательской сессии.
 *
 * Отвечает за:
 * - восстановление пользователя из `localStorage`
 * - синхронизацию с серверной сессией
 * - хранение текущего режима ленты
 * - рассылку событий `sessionchange`
 */
import { getCurrentUser, type User, type UserRole } from "../api/auth";
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
  /** Авторизованный пользователь или `null`, если пользователь гость. */
  user: User | null;
  /** Выбранный режим сортировки ленты. */
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
const PUBLIC_GUEST_SESSION_PATHS = new Set(["/", "/feed", "/login", "/register", "/support"]);

/**
 * Извлекает ссылку на аватар из произвольного payload профиля.
 *
 * Нужен как защитный слой между фронтом и backend-контрактом:
 * сервер в разных ручках использует разные имена поля.
 *
 * @param {unknown} payload Ответ API профиля.
 * @returns {string} Нормализованная ссылка на аватар или пустая строка.
 *
 * @example
 * getAvatarLinkFromPayload({ imageLink: "/media/avatar.jpg" });
 */
function getAvatarLinkFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const candidate =
    "imageLink" in payload && typeof payload.imageLink === "string"
      ? payload.imageLink
      : "avatarLink" in payload && typeof payload.avatarLink === "string"
        ? payload.avatarLink
        : "avatar" in payload && typeof payload.avatar === "string"
          ? payload.avatar
          : "";

  return candidate.trim();
}

function isUserRole(value: unknown): value is UserRole {
  return value === "user" || value === "support_l1" || value === "support_l2" || value === "admin";
}

/**
 * Восстанавливает пользователя из `localStorage`.
 *
 * @returns {User | null} Последний сохранённый пользователь или `null`.
 *
 * @example
 * const user = readPersistedSessionUser();
 */
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

    if (isUserRole(parsed.role)) {
      nextUser.role = parsed.role;
    }

    return nextUser;
  } catch {
    return null;
  }
}

/**
 * Сохраняет пользователя в `localStorage`.
 *
 * @param {User | null} user Пользователь для сохранения.
 * @returns {void}
 *
 * @example
 * persistSessionUser(currentUser);
 */
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
 * Приводит pathname к единому виду без хвостовых слешей.
 *
 * @param {string} pathname Исходный путь.
 * @returns {string} Нормализованный путь.
 */
function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/g, "");
  return normalized || "/";
}

/**
 * Определяет, нужно ли делать auth-probe на backend при старте приложения.
 *
 * Для гостевых публичных страниц без сохранённой сессии лишний запрос только
 * создаёт шум в консоли и ухудшает Lighthouse, поэтому здесь есть ранний выход.
 *
 * @param {User | null} savedUser Пользователь, восстановленный из `localStorage`.
 * @returns {boolean} `true`, если серверную сессию нужно проверить.
 *
 * @example
 * if (shouldProbeBackendSession(savedUser)) {
 *   await getCurrentUser();
 * }
 */
function shouldProbeBackendSession(savedUser: User | null): boolean {
  if (savedUser) {
    return true;
  }

  if (typeof window === "undefined") {
    return true;
  }

  return !PUBLIC_GUEST_SESSION_PATHS.has(normalizePathname(window.location.pathname));
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
 * Возвращает снимок состояния сессии только для чтения.
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
 * Применяет пользователя к состоянию и при необходимости рассылает событие.
 *
 * @param {User | null} user Пользователь для сохранения.
 * @param {boolean} [emit=true] Нужно ли отправить `sessionchange`.
 * @returns {void}
 */
function applySessionUser(user: User | null, emit = true): void {
  sessionStore.patch({ user });
  persistSessionUser(user);
  if (emit) {
    emitSessionChange("user");
  }
}

/**
 * Устанавливает текущего пользователя в состояние сессии.
 *
 * @param {User | null} user Новый пользователь.
 * @returns {void}
 *
 * @example
 * setSessionUser(user);
 */
export function setSessionUser(user: User | null): void {
  applySessionUser(user, true);
}

/**
 * Устанавливает текущего пользователя без широковещательного события sessionchange.
 *
 * @param {User | null} user Новый пользователь.
 * @returns {void}
 */
export function setSessionUserSilently(user: User | null): void {
  applySessionUser(user, false);
}

/**
 * Удаляет текущего пользователя из состояния сессии.
 *
 * @returns {void}
 */
export function clearSessionUser(): void {
  sessionStore.patch({ user: null });
  persistSessionUser(null);
  emitSessionChange("user");
}

/**
 * Устанавливает текущий режим ленты.
 *
 * @param {FeedMode} mode Новый режим ленты.
 * @returns {void}
 *
 * @example
 * setFeedMode("for-you");
 */
export function setFeedMode(mode: FeedMode): void {
  sessionStore.patch({ feedMode: mode });
  localStorage.setItem("feedMode", mode);
  emitSessionChange("feedMode");
}

/**
 * Инициализирует состояние сессии из `localStorage` и серверной сессии.
 *
 * @returns {Promise<void>}
 *
 * @example
 * await initSession();
 */
export async function initSession(): Promise<void> {
  const savedMode = localStorage.getItem("feedMode");
  const savedUser = readPersistedSessionUser();
  sessionStore.patch({
    feedMode: savedMode && isFeedMode(savedMode) ? savedMode : "by-time",
    user: savedUser,
  });

  if (!shouldProbeBackendSession(savedUser)) {
    emitSessionChange("init");
    return;
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      sessionStore.patch({ user: null });
      persistSessionUser(null);
    } else {
      let nextUser = user;

      try {
        const profile = await getMyProfile();
        const avatarLink = getAvatarLinkFromPayload(profile);
        if (avatarLink) {
          nextUser = { ...nextUser, avatarLink };
        }
      } catch (error) {
        if (isNetworkUnavailableError(error)) {
          // Оставляем пользователя из /api/auth/me, даже если профиль временно недоступен.
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
