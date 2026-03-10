export const mockSession = {
  user: null,
};

export function setSessionUser(user) {
  mockSession.user = user;
}

export function clearSessionUser() {
  mockSession.user = null;
}
