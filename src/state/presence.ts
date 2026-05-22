import {
  forceSiteOffline,
  heartbeatSitePresence,
  markSiteOffline,
  markSiteOnline,
} from "../api/presence";
import { getSessionUser } from "./session";

const HEARTBEAT_INTERVAL_MS = 25_000;

let activeUserID: string | null = null;
let heartbeatTimer: number | null = null;
let eventsBound = false;
let onlineConfirmed = false;
let onlineRequest: Promise<boolean> | null = null;

function clearHeartbeat(): void {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

async function safeOnline(): Promise<boolean> {
  if (onlineConfirmed) {
    return true;
  }

  if (!onlineRequest) {
    onlineRequest = markSiteOnline()
      .then(() => {
        onlineConfirmed = true;
        return true;
      })
      .catch((error) => {
        onlineConfirmed = false;
        console.warn("[presence] online failed", error);
        return false;
      })
      .finally(() => {
        onlineRequest = null;
      });
  }

  return onlineRequest;
}

async function safeHeartbeat(): Promise<void> {
  if (!onlineConfirmed) {
    await safeOnline();
    return;
  }

  try {
    await heartbeatSitePresence();
  } catch (error) {
    console.warn("[presence] heartbeat failed", error);
  }
}

async function safeOffline(options: { preferBeacon?: boolean } = {}): Promise<void> {
  try {
    await markSiteOffline(options);
  } catch (error) {
    console.warn("[presence] offline failed", error);
  }
}

async function safeForceOffline(): Promise<void> {
  try {
    await forceSiteOffline();
  } catch (error) {
    console.warn("[presence] force offline failed", error);
  }
}

function startHeartbeat(): void {
  clearHeartbeat();
  heartbeatTimer = window.setInterval(() => {
    void safeHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
}

function bindLifecycleEvents(): void {
  if (eventsBound || typeof window === "undefined") {
    return;
  }
  eventsBound = true;

  window.addEventListener("pagehide", () => {
    if (activeUserID) {
      clearHeartbeat();
      void safeOffline({ preferBeacon: true });
      activeUserID = null;
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && activeUserID) {
      void safeHeartbeat();
    }
  });
}

export async function startSitePresence(userID: string): Promise<void> {
  if (!userID) {
    return;
  }

  if (activeUserID === userID) {
    if (!onlineConfirmed) {
      await safeOnline();
    }
    return;
  }

  if (activeUserID) {
    await stopSitePresence({ notifyBackend: true });
  }

  activeUserID = userID;
  bindLifecycleEvents();
  await safeOnline();
  startHeartbeat();
}

export async function stopSitePresence(
  options: { notifyBackend?: boolean; force?: boolean } = {},
): Promise<void> {
  if (!activeUserID) {
    return;
  }

  activeUserID = null;
  onlineConfirmed = false;
  clearHeartbeat();

  if (options.notifyBackend ?? true) {
    if (onlineRequest) {
      await onlineRequest;
      onlineConfirmed = false;
    }
    if (options.force) {
      await safeForceOffline();
    } else {
      await safeOffline();
    }
  }
}

export async function syncSitePresenceWithSession(): Promise<void> {
  const user = getSessionUser();
  if (!user?.id) {
    await stopSitePresence({ notifyBackend: true });
    return;
  }

  await startSitePresence(user.id);
}
