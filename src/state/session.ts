import { getCurrentUser, type User } from "../api/auth";
import { isNetworkUnavailableError } from "./network-status";

/**
 * Available feed modes.
 */
export type FeedMode = "by-time" | "for-you";

/**
 * Global client session state.
 */
export type SessionState = {
  user: User | null;
  feedMode: FeedMode;
};

/**
 * Session change event detail payload.
 */
type SessionChangeDetail = {
  key: "user" | "feedMode" | "init";
  state: SessionState;
};

/**
 * Internal session state store.
 */
const sessionState: SessionState = {
  user: null,
  feedMode: "by-time",
};

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
    // Ignore storage errors and keep runtime state usable.
  }
}

/**
 * Checks whether value is a valid feed mode.
 */
function isFeedMode(value: string): value is FeedMode {
  return value === "by-time" || value === "for-you";
}

/**
 * Emits a session state change event.
 */
function emitSessionChange(key: SessionChangeDetail["key"]): void {
  window.dispatchEvent(
    new CustomEvent<SessionChangeDetail>("sessionchange", {
      detail: {
        key,
        state: getSessionState(),
      },
    }),
  );
}

/**
 * Returns a readonly snapshot of the session state.
 */
export function getSessionState(): SessionState {
  return { ...sessionState };
}

/**
 * Returns current authorised user.
 */
export function getSessionUser(): User | null {
  return sessionState.user;
}

/**
 * Returns current feed mode.
 */
export function getFeedMode(): FeedMode {
  return sessionState.feedMode;
}

/**
 * Sets current user in session state.
 */
export function setSessionUser(user: User | null): void {
  sessionState.user = user;
  persistSessionUser(user);
  emitSessionChange("user");
}

/**
 * Clears current user from session state.
 */
export function clearSessionUser(): void {
  sessionState.user = null;
  persistSessionUser(null);
  emitSessionChange("user");
}

/**
 * Sets current feed mode.
 */
export function setFeedMode(mode: FeedMode): void {
  sessionState.feedMode = mode;
  localStorage.setItem("feedMode", mode);
  emitSessionChange("feedMode");
}

/**
 * Initializes session state from localStorage and backend session.
 */
export async function initSession(): Promise<void> {
  const savedMode = localStorage.getItem("feedMode");
  sessionState.feedMode = savedMode && isFeedMode(savedMode) ? savedMode : "by-time";
  sessionState.user = readPersistedSessionUser();

  try {
    const user = await getCurrentUser();
    sessionState.user = user;
    persistSessionUser(user);
  } catch (error) {
    if (!isNetworkUnavailableError(error)) {
      sessionState.user = null;
      persistSessionUser(null);
    }
  }

  emitSessionChange("init");
}
