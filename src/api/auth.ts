import { trackedFetch } from "../state/network-status";
import { ApiError, parseJson, apiRequest } from "./core/client";

// Повторно экспортируем ApiError, чтобы не сломать существующие импорты (chat, profile, posts, friends).
export { ApiError };

/**
 * Тело запроса для входа.
 */
export type LoginPayload = {
  login: string;
  password: string;
};

/**
 * Тело запроса для регистрации.
 */
export type RegisterPayload = {
  firstName: string;
  lastName: string;
  birthday: string;
  gender: number;
  login: string;
  password1: string;
  password2: string;
};

/**
 * Тело запроса для валидации первого шага регистрации.
 */
export type RegisterStepOnePayload = {
  login: string;
  password1: string;
  password2: string;
};

export type UserRole = "user" | "support_l1" | "support_l2" | "admin";

/**
 * Минимальная форма данных авторизованного пользователя на клиенте.
 */
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  login?: string;
  email?: string;
  avatarLink?: string;
  role?: UserRole;
};

type RawUser = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  login?: string;
  username?: string;
  email?: string;
  avatarLink?: string | null;
  avatar?: string | null;
  imageLink?: string | null;
  role?: unknown;
};

function mapUser(raw: RawUser | null | undefined): User | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id = String(raw.id ?? "").trim();
  const firstName = String(raw.firstName ?? "").trim();
  const lastName = String(raw.lastName ?? "").trim();

  if (!id || !firstName || !lastName) {
    return null;
  }

  const user: User = {
    id,
    firstName,
    lastName,
  };

  const login = String(raw.login ?? raw.username ?? "").trim();
  if (login) {
    user.login = login;
  }

  const email = String(raw.email ?? "").trim();
  if (email) {
    user.email = email;
  }

  const avatarLink = String(raw.avatarLink ?? raw.avatar ?? raw.imageLink ?? "").trim();
  if (avatarLink) {
    user.avatarLink = avatarLink;
  }

  if (
    raw.role === "user" ||
    raw.role === "support_l1" ||
    raw.role === "support_l2" ||
    raw.role === "admin"
  ) {
    user.role = raw.role;
  }

  return user;
}

/**
 * Ответ валидации первого шага.
 */
export type RegisterStepOneValidationResponse = {
  ok?: boolean;
  errors?: Record<string, string>;
};

/**
 * Отправляет запрос на вход в backend.
 */
export async function loginUser(payload: LoginPayload): Promise<User> {
  const user = await apiRequest<RawUser>("/api/auth/login", { method: "POST", body: payload }, {});
  return mapUser(user) ?? ({ id: "", firstName: "", lastName: "" } as User);
}

/**
 * Отправляет запрос на регистрацию в backend.
 */
export async function registerUser(payload: RegisterPayload): Promise<User> {
  const user = await apiRequest<RawUser>(
    "/api/auth/register",
    { method: "POST", body: payload },
    {},
  );
  return mapUser(user) ?? ({ id: "", firstName: "", lastName: "" } as User);
}

/**
 * Отправляет запрос на выход в backend.
 */
export async function logoutUser(): Promise<unknown> {
  await apiRequest<unknown>("/api/auth/logout", { method: "POST" });
  return;
}

/**
 * Запрашивает текущего авторизованного пользователя из backend.
 */
export async function getCurrentUser(): Promise<User | null> {
  const response = await trackedFetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const user = await parseJson<RawUser>(response, {});
  return mapUser(user);
}

/**
 * Валидирует первый шаг регистрации на backend.
 */
export async function validateRegisterStepOne(
  payload: RegisterStepOnePayload,
): Promise<RegisterStepOneValidationResponse> {
  return apiRequest<RegisterStepOneValidationResponse>(
    "/api/auth/register/step-one",
    { method: "POST", body: payload },
    {},
  );
}
