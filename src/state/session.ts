import { getCurrentUser, type User } from "../api/auth";

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
  emitSessionChange("user");
}

/**
 * Clears current user from session state.
 */
export function clearSessionUser(): void {
  sessionState.user = null;
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

  const user = await getCurrentUser();
  sessionState.user = user;

  emitSessionChange("init");
}
