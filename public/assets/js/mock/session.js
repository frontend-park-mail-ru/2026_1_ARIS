import { getCurrentUser } from "../api/auth.js";

export const mockSession = {
  user: null,
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

// Новая функция — проверяет сессию при загрузке страницы
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
