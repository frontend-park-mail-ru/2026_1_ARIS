import { getCurrentUser } from "../api/auth.js";

export const mockSession = {
  user: null,
  feedMode: "by-time",
};

export function setSessionUser(user) {
  mockSession.user = user;
}

export function setFeedMode(mode) {
  mockSession.feedMode = mode;
}

export function clearSessionUser() {
  mockSession.user = null;
}

export async function initSession() {
  const user = await getCurrentUser();
  if (user) {
    mockSession.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
