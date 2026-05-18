import { apiRequest } from "./core/client";

const PRESENCE_ONLINE_URL = "/api/presence/online";
const PRESENCE_HEARTBEAT_URL = "/api/presence/heartbeat";
const PRESENCE_OFFLINE_URL = "/api/presence/offline";
const PRESENCE_FORCE_OFFLINE_URL = "/api/presence/force-offline";

export function markSiteOnline(): Promise<null> {
  return apiRequest<null>(PRESENCE_ONLINE_URL, { method: "POST" }, null);
}

export function heartbeatSitePresence(): Promise<null> {
  return apiRequest<null>(PRESENCE_HEARTBEAT_URL, { method: "POST" }, null);
}

export function markSiteOffline(options: { preferBeacon?: boolean } = {}): Promise<void> {
  if (
    options.preferBeacon &&
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    const queued = navigator.sendBeacon(PRESENCE_OFFLINE_URL, new Blob([], { type: "text/plain" }));
    if (queued) {
      return Promise.resolve();
    }
  }

  if (typeof fetch !== "function") {
    return Promise.resolve();
  }

  return fetch(PRESENCE_OFFLINE_URL, {
    method: "POST",
    credentials: "include",
    keepalive: true,
  }).then(() => undefined);
}

export function forceSiteOffline(): Promise<null> {
  return apiRequest<null>(PRESENCE_FORCE_OFFLINE_URL, { method: "POST" }, null);
}
