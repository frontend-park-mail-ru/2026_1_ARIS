/**
 * Parses JSON response body safely.
 *
 * @param {Response} response
 * @returns {Promise<Object>}
 */
async function parseJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "invalid server response" };
  }
}

/**
 * Sends login request to the backend.
 *
 * @param {Object} payload
 * @param {string} payload.login
 * @param {string} payload.password
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function loginUser(payload) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      login: payload.login,
      password: payload.password,
    }),
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(data.error || "login failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Sends registration request to the backend.
 *
 * @param {Object} payload
 * @param {string} payload.firstName
 * @param {string} payload.lastName
 * @param {string} payload.birthday
 * @param {number} payload.gender
 * @param {string} payload.login
 * @param {string} payload.password1
 * @param {string} payload.password2
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function registerUser(payload) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      firstName: payload.firstName,
      lastName: payload.lastName,
      birthday: payload.birthday,
      gender: payload.gender,
      login: payload.login,
      password1: payload.password1,
      password2: payload.password2,
    }),
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(data.error || "register failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Sends logout request to the backend.
 *
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function logoutUser() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const error = new Error(data.error || "logout failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Requests current authorised user from the backend.
 *
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) return null;

  return await parseJson(response);
}
