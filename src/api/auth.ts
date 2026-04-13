import { trackedFetch } from "../state/network-status";

/**
 * Generic API error with response metadata.
 */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Generic error response shape.
 */
type ErrorResponse = {
  error?: string;
};

/**
 * Login request payload.
 */
export type LoginPayload = {
  login: string;
  password: string;
};

/**
 * Registration request payload.
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
 * Register step one validation payload.
 */
export type RegisterStepOnePayload = {
  login: string;
  password1: string;
  password2: string;
};

/**
 * Minimal authorised user shape used on the client.
 */
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  avatarLink?: string;
};

/**
 * Step one validation response.
 */
export type RegisterStepOneValidationResponse = {
  ok?: boolean;
  errors?: Record<string, string>;
};

/**
 * Safely parses JSON response body.
 */
async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    return { error: text || "invalid server response" } as T;
  }
}

/**
 * Builds typed API error from response payload.
 */
function createApiError(
  fallbackMessage: string,
  status: number,
  data: ErrorResponse | unknown,
): ApiError {
  const message =
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ErrorResponse).error === "string"
      ? (data as ErrorResponse).error!
      : fallbackMessage;

  return new ApiError(message, status, data);
}

/**
 * Sends login request to the backend.
 */
export async function loginUser(payload: LoginPayload): Promise<User> {
  const response = await trackedFetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await parseJson<User | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("login failed", response.status, data);
  }

  return data as User;
}

/**
 * Sends registration request to the backend.
 */
export async function registerUser(payload: RegisterPayload): Promise<User> {
  const response = await trackedFetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await parseJson<User | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("register failed", response.status, data);
  }

  return data as User;
}

/**
 * Sends logout request to the backend.
 */
export async function logoutUser(): Promise<unknown> {
  const response = await trackedFetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  const data = await parseJson<unknown>(response);

  if (!response.ok) {
    throw createApiError("logout failed", response.status, data);
  }

  return data;
}

/**
 * Requests current authorised user from the backend.
 */
export async function getCurrentUser(): Promise<User | null> {
  const response = await trackedFetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return await parseJson<User>(response);
}

/**
 * Validates register step one on the backend.
 */
export async function validateRegisterStepOne(
  payload: RegisterStepOnePayload,
): Promise<RegisterStepOneValidationResponse> {
  const response = await trackedFetch("/api/auth/register/step-one", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await parseJson<RegisterStepOneValidationResponse | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("register step one validation failed", response.status, data);
  }

  return data as RegisterStepOneValidationResponse;
}
