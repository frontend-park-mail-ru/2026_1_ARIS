import {
  getNetworkStatus,
  markConnectionAvailable,
  markConnectionUnavailable,
  subscribeToNetworkStatus,
  type NetworkStatus,
} from "../state/network-status";

const INDICATOR_ID = "app-network-status";

function getStatusMessage(status: NetworkStatus): string {
  return status === "unavailable" ? "Нет соединения с интернетом" : "Соединение восстановлено.";
}

export function initOfflineIndicator(): void {
  document.getElementById(INDICATOR_ID)?.remove();
  document.body.classList.remove("has-network-status");

  const indicator = document.createElement("div");
  indicator.id = INDICATOR_ID;
  indicator.className = "app-network-status";
  indicator.hidden = true;
  document.body.prepend(indicator);

  let hideTimeoutId: number | null = null;
  let lastStatus = getNetworkStatus();

  const showStatus = (status: NetworkStatus): void => {
    if (hideTimeoutId !== null) {
      window.clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }

    indicator.textContent = getStatusMessage(status);

    if (status === "unavailable") {
      indicator.hidden = false;
      document.body.classList.add("has-network-status");
      return;
    }

    indicator.hidden = false;
    document.body.classList.add("has-network-status");
    hideTimeoutId = window.setTimeout(() => {
      indicator.hidden = true;
      document.body.classList.remove("has-network-status");
    }, 2400);
  };

  subscribeToNetworkStatus((status) => {
    const previousStatus = lastStatus;
    lastStatus = status;

    if (status === "connected" && previousStatus === "connected") {
      return;
    }

    showStatus(status);
  });

  window.addEventListener("online", () => {
    markConnectionAvailable();
  });

  window.addEventListener("offline", () => {
    markConnectionUnavailable();
  });

  if (!navigator.onLine || lastStatus === "unavailable") {
    showStatus("unavailable");
  }
}
