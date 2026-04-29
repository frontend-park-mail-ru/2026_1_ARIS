/**
 * Модуль слоя API.
 *
 * Содержит клиентские запросы и нормализацию данных для интерфейса.
 */
import { trackedFetch } from "../../state/network-status";

/**
 * Универсальная ошибка API со статусом HTTP и сырыми данными ответа.
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

type ErrorResponse = {
  error?: string;
};

/**
 * Безопасно разбирает JSON-тело ответа.
 * Возвращает `fallback`, если тело пустое или не поддаётся разбору.
 */
export async function parseJson<T>(response: Response, fallback: T): Promise<T> {
  const text = await response.text();

  try {
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return { error: text || "Некорректный ответ сервера" } as T;
  }
}

/**
 * Создаёт экземпляр `ApiError` из неуспешного ответа.
 */
export function createApiError(
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

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
};

const inFlightRequests = new Map<string, Promise<unknown>>();

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    (typeof FormData !== "undefined" && value instanceof FormData) ||
    (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof ArrayBuffer !== "undefined" &&
      (value instanceof ArrayBuffer || ArrayBuffer.isView(value)))
  );
}

/**
 * Выполняет типизированный API-запрос с автоматическим разбором JSON и обработкой ошибок.
 * GET- и HEAD-запросы дедуплицируются: одновременные вызовы одного URL получают один `Promise`.
 */
export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {},
  emptyFallback: T = {} as T,
): Promise<T> {
  const { body, headers = {}, method = "GET", credentials = "include", signal } = options;

  // Запросы с AbortSignal не дедуплицируются: каждый вызов управляет своим жизненным циклом сам.
  const dedup = (method === "GET" || method === "HEAD") && !signal;
  const dedupKey = `${method}:${url}`;

  if (dedup && inFlightRequests.has(dedupKey)) {
    return inFlightRequests.get(dedupKey) as Promise<T>;
  }

  const requestInit: RequestInit = { method, credentials };
  if (signal) requestInit.signal = signal;

  if (body !== undefined) {
    if (isBodyInit(body)) {
      requestInit.body = body;
      if (Object.keys(headers).length > 0) {
        requestInit.headers = headers;
      }
    } else {
      requestInit.body = JSON.stringify(body);
      requestInit.headers = { "Content-Type": "application/json", ...headers };
    }
  } else if (Object.keys(headers).length > 0) {
    requestInit.headers = headers;
  }

  const promise = trackedFetch(url, requestInit)
    .then((response) =>
      parseJson<T>(response, emptyFallback).then((data) => {
        if (!response.ok) {
          throw createApiError(`Ошибка запроса к ${url}`, response.status, data);
        }
        return data;
      }),
    )
    .finally(() => {
      if (dedup) inFlightRequests.delete(dedupKey);
    });

  if (dedup) inFlightRequests.set(dedupKey, promise);
  return promise;
}
