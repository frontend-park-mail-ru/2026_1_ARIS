import { getCurrentUser } from "../api/auth.js";

/**
 * Global client session state.
 * @typedef {Object} SessionState
 * @property {Object|null} user - Current authorised user or null.
 * @property {string} feedMode - Current feed sorting mode.
 */

/**
 * Internal session state store.
 * @type {SessionState}
 */
const sessionState = {
  user: null,
  feedMode: "by-time",
};

/**
 * Emits a session state change event.
 *
 * @param {string} key
 * @returns {void}
 */
function emitSessionChange(key) {
  window.dispatchEvent(
    new CustomEvent("sessionchange", {
      detail: {
        key,
        state: getSessionState(),
      },
    }),
  );
}

/**
 * Returns a readonly snapshot of the session state.
 *
 * @returns {SessionState}
 */
export function getSessionState() {
  return { ...sessionState };
}

/**
 * Returns current authorised user.
 *
 * @returns {Object|null}
 */
export function getSessionUser() {
  return sessionState.user;
}

/**
 * Returns current feed mode.
 *
 * @returns {string}
 */
export function getFeedMode() {
  return sessionState.feedMode;
}

/**
 * Sets current user in session state.
 *
 * @param {Object|null} user
 * @returns {void}
 */
export function setSessionUser(user) {
  sessionState.user = user;
  emitSessionChange("user");
}

/**
 * Clears current user from session state.
 *
 * @returns {void}
 */
export function clearSessionUser() {
  sessionState.user = null;
  emitSessionChange("user");
}

/**
 * Sets current feed mode.
 *
 * @param {string} mode
 * @returns {void}
 */
export function setFeedMode(mode) {
  sessionState.feedMode = mode;
  localStorage.setItem("feedMode", mode);
  emitSessionChange("feedMode");
}

/**
 * Initializes session state from localStorage and backend session.
 *
 * @returns {Promise<void>}
 */
export async function initSession() {
  const savedMode = localStorage.getItem("feedMode");
  sessionState.feedMode = savedMode || "by-time";

  const user = await getCurrentUser();

  if (user) {
    sessionState.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarLink: user.avatarLink || "",
    };
  } else {
    sessionState.user = null;
  }

  emitSessionChange("init");
}
