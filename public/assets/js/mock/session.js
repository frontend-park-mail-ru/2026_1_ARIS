import { getCurrentUser } from "../api/auth.js";

/**
 * Stores mock session state.
 * @type {{user: Object|null, feedMode: string}}
 */
export const mockSession = {
  user: null,
  feedMode: "by-time",
};

/**
 * Sets current user in session.
 * @param {Object|null} user
 * @returns {void}
 */
export function setSessionUser(user) {
  mockSession.user = user;
}

/**
 * Sets current feed mode.
 * @param {string} mode
 * @returns {void}
 */
export function setFeedMode(mode) {
  mockSession.feedMode = mode;
  localStorage.setItem("feedMode", mode);
}

/**
 * Clears current user from session.
 * @returns {void}
 */
export function clearSessionUser() {
  mockSession.user = null;
}

/**
 * Initializes session state.
 * @returns {Promise<void>}
 */
export async function initSession() {
  mockSession.feedMode = "by-time";
  localStorage.setItem("feedMode", "by-time");

  const user = await getCurrentUser();
  if (user) {
    mockSession.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
