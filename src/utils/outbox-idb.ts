const OUTBOX_DB_NAME = "aris-outbox";
const OUTBOX_DB_VERSION = 1;
const OUTBOX_STORE = "requests";
export const OUTBOX_SYNC_TAG = "aris-outbox";

export type OutboxRequest = {
  id?: number;
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  createdAt: number;
  attempts: number;
};

type SyncRegistrationWithSync = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
};

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
    request.onerror = () => reject(request.error ?? new Error("failed to open outbox db"));
  });
}

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
    transaction.onerror = () => reject(transaction.error ?? new Error("failed to enqueue request"));
  });

  db.close();
}

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
    super("Request queued for background sync");
    this.name = "OutboxQueuedError";
  }
}

export function isOutboxQueuedError(error: unknown): error is OutboxQueuedError {
  return error instanceof Error && error.name === "OutboxQueuedError";
}
