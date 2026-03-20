import { API_BASE_URL } from "./config.js";

/**
 * Requests suggested users for the authorised user widget.
 *
 * @returns {Promise<Object[]>}
 * @throws {Error}
 */
export async function getSuggestedUsers() {
  const response = await fetch("/api/users/suggested", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("failed to load users");
  }

  return response.json();
}

/**
 * Requests popular users for the public widget.
 *
 * @returns {Promise<Object[]>}
 * @throws {Error}
 */
export async function getPublicPopularUsers() {
  const response = await fetch("/api/public/popular-users", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load popular users");
  }

  return response.json();
}

/**
 * Requests latest user activity events.
 *
 * @returns {Promise<Object[]>}
 * @throws {Error}
 */
export async function getLatestEvents() {
  const response = await fetch("/api/users/latest-events", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("failed to load latest events");
  }

  return response.json();
}
