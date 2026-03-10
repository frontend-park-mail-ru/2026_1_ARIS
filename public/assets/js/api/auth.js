const API_BASE_URL = "";

async function parseJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "invalid server response" };
  }
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      firstName: payload.firstName,
      lastName: payload.lastName,
      birthday: payload.birthday,
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

export async function logoutUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
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
