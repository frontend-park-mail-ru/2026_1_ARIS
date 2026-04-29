/**
 * API для аутентификации и регистрации.
 *
 * Содержит:
 * - вход и выход пользователя;
 * - регистрацию;
 * - получение текущей сессии;
 * - серверную валидацию первого шага регистрации.
 */
import { ApiError, apiRequest } from "./core/client";

// Повторно экспортируем `ApiError`, чтобы сохранить текущие импорты в других модулях.
export { ApiError };

/**
 * Тело запроса для входа.
 */
export type LoginPayload = {
  /** Логин пользователя. */
  login: string;
  /** Пароль пользователя. */
  password: string;
};

/**
 * Тело запроса для регистрации.
 */
export type RegisterPayload = {
  /** Имя пользователя. */
  firstName: string;
  /** Фамилия пользователя. */
  lastName: string;
  /** Дата рождения в формате поля формы. */
  birthday: string;
  /** Пол пользователя в серверном формате. */
  gender: number;
  /** Желаемый логин. */
  login: string;
  /** Пароль. */
  password1: string;
  /** Повтор пароля. */
  password2: string;
};

/**
 * Тело запроса для валидации первого шага регистрации.
 */
export type RegisterStepOnePayload = {
  /** Логин для проверки доступности и формата. */
  login: string;
  /** Пароль первого ввода. */
  password1: string;
  /** Повтор пароля. */
  password2: string;
};

/**
 * Роль пользователя в системе.
 */
export type UserRole = "user" | "support_l1" | "support_l2" | "admin";

/**
 * Минимальная форма данных авторизованного пользователя на клиенте.
 */
export type User = {
  /** Идентификатор пользователя. */
  id: string;
  /** Имя пользователя. */
  firstName: string;
  /** Фамилия пользователя. */
  lastName: string;
  /** Логин. */
  login?: string;
  /** Электронная почта. */
  email?: string;
  /** Ссылка на аватар. */
  avatarLink?: string;
  /** Роль пользователя в системе. */
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
  /** Общий признак успешной валидации. */
  ok?: boolean;
  /** Ошибки по полям, если проверка не прошла. */
  errors?: Record<string, string>;
};

/**
 * Отправляет запрос на вход на сервер.
 *
 * Возвращает минимальный набор данных пользователя, достаточный
 * для инициализации клиентской сессии после авторизации.
 *
 * @param {LoginPayload} payload Данные формы входа.
 * @returns {Promise<User>} Нормализованный объект пользователя.
 * @example
 * const user = await loginUser({ login: "demo", password: "secret" });
 */
export async function loginUser(payload: LoginPayload): Promise<User> {
  const user = await apiRequest<RawUser>("/api/auth/login", { method: "POST", body: payload }, {});
  return mapUser(user) ?? ({ id: "", firstName: "", lastName: "" } as User);
}

/**
 * Отправляет запрос на регистрацию на сервер.
 *
 * Используется после клиентской валидации, когда форма уже собрана
 * и готова к созданию новой учётной записи.
 *
 * @param {RegisterPayload} payload Полные данные формы регистрации.
 * @returns {Promise<User>} Созданный пользователь в клиентском формате.
 * @example
 * const user = await registerUser(formValues);
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
 * Отправляет запрос на выход на сервер.
 *
 * @returns {Promise<unknown>}
 * @example
 * await logoutUser();
 */
export async function logoutUser(): Promise<unknown> {
  await apiRequest<unknown>("/api/auth/logout", { method: "POST" });
  return;
}

/**
 * Запрашивает текущего авторизованного пользователя с сервера.
 *
 * Если сервер отвечает ошибкой авторизации, функция возвращает `null`,
 * чтобы вызывающий код мог безопасно переключиться в гостевой режим.
 *
 * @returns {Promise<User | null>} Текущий пользователь или `null`.
 * @example
 * const currentUser = await getCurrentUser();
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await apiRequest<RawUser>("/api/auth/me", {}, {});
    return mapUser(user);
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    throw error;
  }
}

/**
 * Валидирует первый шаг регистрации на сервере.
 *
 * Нужна для ранней проверки логина и пароля до перехода к следующим шагам формы.
 *
 * @param {RegisterStepOnePayload} payload Данные первого шага регистрации.
 * @returns {Promise<RegisterStepOneValidationResponse>} Результат серверной проверки.
 * @example
 * const validation = await validateRegisterStepOne({
 *   login: "demo",
 *   password1: "secret123",
 *   password2: "secret123",
 * });
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
