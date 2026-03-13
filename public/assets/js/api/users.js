const API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:8080" : "";

export async function getSuggestedUsers() {
  const response = await fetch(`${API_BASE_URL}/api/users/suggested`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("failed to load users");
  }

  return response.json();
}

export async function getPublicPopularUsers() {
  const response = await fetch(`${API_BASE_URL}/api/public/popular-users`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load popular users");
  }

  return response.json();
}

export async function getLatestEvents() {
  const response = await fetch(`${API_BASE_URL}/api/users/latest-events`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("failed to load latest events");
  }

  return response.json();
}
