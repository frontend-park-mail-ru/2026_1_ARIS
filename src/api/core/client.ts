/**
 * Модуль слоя API.
 *
 * Содержит клиентские запросы и нормализацию данных для интерфейса.
 */
import { trackedFetch } from "../../state/network-status";
import { captureAppException } from "../../utils/sentry";

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

export type ApiQueryValue = string | number | boolean | null | undefined;

export type ApiQuery = URLSearchParams | Record<string, ApiQueryValue | readonly ApiQueryValue[]>;

export type ApiResponseType = "json" | "text" | "blob" | "arrayBuffer" | "empty";

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

/**
 * Собирает URL с query-параметрами и пропускает пустые значения.
 */
export function buildApiUrl(url: string, query?: ApiQuery): string {
  if (!query) {
    return url;
  }

  const params = new URLSearchParams();

  if (query instanceof URLSearchParams) {
    query.forEach((value, key) => {
      if (value !== "") params.append(key, value);
    });
  } else {
    Object.entries(query).forEach(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => {
        if (item === null || item === undefined || item === "") return;
        params.append(key, String(item));
      });
    });
  }

  const queryString = params.toString();
  if (!queryString) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
}

/**
 * Разбирает успешное тело ответа в нужном формате.
 */
export async function parseResponseBody<T>(
  response: Response,
  responseType: ApiResponseType,
  fallback: T,
): Promise<T> {
  if (responseType === "empty") {
    return fallback;
  }

  if (responseType === "text") {
    return (await response.text()) as T;
  }

  if (responseType === "blob") {
    return (await response.blob()) as T;
  }

  if (responseType === "arrayBuffer") {
    return (await response.arrayBuffer()) as T;
  }

  return parseJson<T>(response, fallback);
}

export type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  cache?: RequestCache;
  keepalive?: boolean;
  query?: ApiQuery;
  responseType?: ApiResponseType;
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
  const {
    body,
    headers = {},
    method = "GET",
    credentials = "include",
    signal,
    cache,
    keepalive,
    query,
    responseType = "json",
  } = options;
  const requestUrl = buildApiUrl(url, query);

  // Запросы с AbortSignal не дедуплицируются: каждый вызов управляет своим жизненным циклом сам.
  const dedup = (method === "GET" || method === "HEAD") && !signal;
  const dedupKey = `${method}:${requestUrl}`;

  if (dedup && inFlightRequests.has(dedupKey)) {
    return inFlightRequests.get(dedupKey) as Promise<T>;
  }

  const requestInit: RequestInit = { method, credentials };
  if (signal) requestInit.signal = signal;
  if (cache) requestInit.cache = cache;
  if (keepalive !== undefined) requestInit.keepalive = keepalive;

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

  const promise = trackedFetch(requestUrl, requestInit)
    .then(async (response) => {
      if (!response.ok) {
        const data = await parseJson<unknown>(response, emptyFallback);
        const apiError = createApiError(`Ошибка запроса к ${requestUrl}`, response.status, data);

        if (response.status >= 500) {
          captureAppException(apiError, {
            area: "api",
            action: "request",
            extras: {
              method,
              status: response.status,
              url: requestUrl,
            },
          });
        }

        throw apiError;
      }

      return parseResponseBody<T>(response, responseType, emptyFallback);
    })
    .finally(() => {
      if (dedup) inFlightRequests.delete(dedupKey);
    });

  if (dedup) inFlightRequests.set(dedupKey, promise);
  return promise;
}

type ApiRequestWithoutMethod = Omit<RequestOptions, "method">;
type ApiRequestWithoutMethodAndBody = Omit<RequestOptions, "method" | "body">;

/**
 * Выполняет GET-запрос через единый API-клиент.
 */
export function apiGet<T>(
  url: string,
  options: ApiRequestWithoutMethodAndBody = {},
  emptyFallback: T = {} as T,
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: "GET" }, emptyFallback);
}

/**
 * Выполняет POST-запрос через единый API-клиент.
 */
export function apiPost<T>(
  url: string,
  body?: unknown,
  options: ApiRequestWithoutMethodAndBody = {},
  emptyFallback: T = {} as T,
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: "POST", body }, emptyFallback);
}

/**
 * Выполняет PATCH-запрос через единый API-клиент.
 */
export function apiPatch<T>(
  url: string,
  body?: unknown,
  options: ApiRequestWithoutMethodAndBody = {},
  emptyFallback: T = {} as T,
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: "PATCH", body }, emptyFallback);
}

/**
 * Выполняет DELETE-запрос через единый API-клиент.
 */
export function apiDelete<T>(
  url: string,
  options: ApiRequestWithoutMethod = {},
  emptyFallback: T = {} as T,
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: "DELETE" }, emptyFallback);
}
