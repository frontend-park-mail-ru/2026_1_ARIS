export const COMMENT_CARD_SKELETON_MIN_MS = 450;

export function waitForMinimumLoadingTime(
  startedAtMs: number,
  minDurationMs = COMMENT_CARD_SKELETON_MIN_MS,
): Promise<void> {
  const elapsedMs = Date.now() - startedAtMs;
  const remainingMs = Math.max(0, minDurationMs - elapsedMs);

  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, remainingMs);
  });
}
