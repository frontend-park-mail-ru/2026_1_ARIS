/**
 * IndexedDB-хранилище отложенных сетевых запросов.
 *
 * Используется для offline-first сценариев, когда запись нельзя отправить
 * сразу и её нужно сохранить до фоновой синхронизации.
 */
const OUTBOX_DB_NAME = "aris-outbox";
const OUTBOX_DB_VERSION = 1;
const OUTBOX_STORE = "requests";
export const OUTBOX_SYNC_TAG = "aris-outbox";

export type OutboxRequest = {
  /** Автоинкрементный идентификатор записи в IndexedDB. */
  id?: number;
  /** URL исходного запроса. */
  url: string;
  /** HTTP-метод запроса. */
  method: "POST" | "PATCH" | "DELETE";
  /** Заголовки исходного запроса. */
  headers?: Record<string, string>;
  /** Сериализованное тело запроса. */
  body?: string;
  /** Время постановки в очередь. */
  createdAt: number;
  /** Количество попыток повторной отправки. */
  attempts: number;
};

type SyncRegistrationWithSync = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
};

/**
 * Открывает IndexedDB-хранилище outbox.
 *
 * @returns {Promise<IDBDatabase>} Подключение к базе.
 */
function openOutboxDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OUTBOX_DB_NAME, OUTBOX_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = db.createObjectStore(OUTBOX_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Не удалось открыть outbox-хранилище."));
  });
}

/**
 * Ставит запрос в очередь фоновой синхронизации.
 *
 * @param {Omit<OutboxRequest, "createdAt" | "attempts">} request Исходный запрос без служебных полей.
 * @returns {Promise<void>}
 */
export async function enqueueRequest(
  request: Omit<OutboxRequest, "createdAt" | "attempts">,
): Promise<void> {
  const db = await openOutboxDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, "readwrite");
    const store = transaction.objectStore(OUTBOX_STORE);

    store.add({
      ...request,
      createdAt: Date.now(),
      attempts: 0,
    } satisfies OutboxRequest);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Не удалось добавить запрос в outbox."));
  });

  db.close();
}

/**
 * Регистрирует фоновую синхронизацию для обработки outbox.
 *
 * Если `Background Sync` недоступен, посылает сообщение активному service worker.
 *
 * @returns {Promise<void>}
 */
export async function registerOutboxSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = (await navigator.serviceWorker.ready) as SyncRegistrationWithSync;

  if (registration.sync) {
    await registration.sync.register(OUTBOX_SYNC_TAG);
    return;
  }

  registration.active?.postMessage({ type: "ARIS_DRAIN_OUTBOX" });
}

export class OutboxQueuedError extends Error {
  constructor() {
    super("Запрос поставлен в очередь фоновой синхронизации.");
    this.name = "OutboxQueuedError";
  }
}

/**
 * Проверяет, что ошибка означает успешную постановку запроса в outbox.
 *
 * @param {unknown} error Проверяемая ошибка.
 * @returns {error is OutboxQueuedError}
 */
export function isOutboxQueuedError(error: unknown): error is OutboxQueuedError {
  return error instanceof Error && error.name === "OutboxQueuedError";
}
