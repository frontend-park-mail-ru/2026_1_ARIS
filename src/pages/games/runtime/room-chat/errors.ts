/**
 * Проверяет, был ли запрос загрузки чата отменён через AbortController.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
