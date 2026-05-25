/**
 * Возвращает оставшееся время в сантисекундах без отрицательных значений.
 */
export function getTimerRemainingCentiseconds(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 10));
}

/**
 * Форматирует оставшееся время для игровых таймеров.
 */
export function formatTimerRemainingMs(remainingMs: number): string {
  const centiseconds = getTimerRemainingCentiseconds(remainingMs);
  if (centiseconds === 0) return "0";
  if (remainingMs < 3000) {
    return (Math.ceil(centiseconds / 10) / 10).toFixed(1);
  }
  return String(Math.ceil(centiseconds / 100));
}
