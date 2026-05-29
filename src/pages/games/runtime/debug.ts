export function isGamesDebugEnabled(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      ["1", "verbose"].includes(window.localStorage.getItem("aris:games:debug") ?? "")
    );
  } catch {
    return false;
  }
}

export function isGamesDebugVerboseEnabled(): boolean {
  try {
    return (
      typeof window !== "undefined" && window.localStorage.getItem("aris:games:debug") === "verbose"
    );
  } catch {
    return false;
  }
}

export function debugGamesEvent(label: string, payload: unknown): void {
  if (!isGamesDebugEnabled()) return;
  try {
    console.debug(`[games-debug] ${label} ${JSON.stringify(payload)}`);
    return;
  } catch {
    console.debug(`[games-debug] ${label}`, payload);
  }
}

export function debugGamesVerboseEvent(label: string, payload: unknown): void {
  if (!isGamesDebugVerboseEnabled()) return;
  debugGamesEvent(label, payload);
}
