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

/**
 * Минимальная форма данных авторизованного пользователя на клиенте.
 */
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  avatarLink?: string;
};

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
  return apiRequest<User>("/api/auth/login", { method: "POST", body: payload }, {} as User);
}

/**
 * Отправляет запрос на регистрацию в backend.
 */
export async function registerUser(payload: RegisterPayload): Promise<User> {
  return apiRequest<User>("/api/auth/register", { method: "POST", body: payload }, {} as User);
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

  return parseJson<User>(response, {} as User);
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
