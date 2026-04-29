export type NetworkStatus = "connected" | "unavailable";

type NetworkStatusDetail = {
  status: NetworkStatus;
};

const NETWORK_STATUS_EVENT = "networkstatuschange";

let networkStatus: NetworkStatus = navigator.onLine ? "connected" : "unavailable";

function emitNetworkStatus(status: NetworkStatus): void {
  if (networkStatus === status) {
    return;
  }

  networkStatus = status;
  window.dispatchEvent(
    new CustomEvent<NetworkStatusDetail>(NETWORK_STATUS_EVENT, {
      detail: { status },
    }),
  );
}

export function getNetworkStatus(): NetworkStatus {
  return networkStatus;
}

export function markConnectionAvailable(): void {
  emitNetworkStatus("connected");
}

export function markConnectionUnavailable(): void {
  emitNetworkStatus("unavailable");
}

export function isNetworkUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? Number((error as { status: number }).status)
      : undefined;

  return (
    !navigator.onLine ||
    error instanceof TypeError ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("proxy") ||
    message.includes("failed to fetch")
  );
}

export async function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    const response = await fetch(input, init);
    const responseSource = response.headers.get("x-aris-response-source");

    if (responseSource === "cache" && !navigator.onLine) {
      markConnectionUnavailable();
    } else {
      markConnectionAvailable();
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    markConnectionUnavailable();
    throw error;
  }
}

export function subscribeToNetworkStatus(listener: (status: NetworkStatus) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<NetworkStatusDetail>).detail;
    listener(detail?.status ?? "unavailable");
  };

  window.addEventListener(NETWORK_STATUS_EVENT, handler);
  return () => window.removeEventListener(NETWORK_STATUS_EVENT, handler);
}
