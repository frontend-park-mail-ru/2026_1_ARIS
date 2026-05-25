import type { GameAnswer } from "./types";

/** Форматирует числовой ответ для интерфейса игры. */
export function formatGameNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "нет ответа";
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("ru-RU", { maximumFractionDigits: 4 });
}

/** Форматирует сохранённый сервером ответ. */
export function formatStoredAnswer(value: number | null): string {
  return formatGameNumber(value);
}

/** Форматирует длительность ответа в миллисекундах. */
export function formatDurationMs(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "нет времени";
  return `${(Math.max(0, value) / 1000).toFixed(2)} сек`;
}

/** Форматирует отклонение ответа для шкалы результата. */
export function formatAnswerDelta(delta: number | null): string {
  if (delta === null || !Number.isFinite(delta)) return "×";
  if (delta === 0) return "✓";
  return `${delta > 0 ? "+" : ""}${formatGameNumber(delta)}`;
}

/** Форматирует расстояние ответа для таблицы результатов. */
export function formatResultTableDistance(answer: GameAnswer | null | undefined): string {
  if (!answer || answer.answer === null || answer.distance === null) return "без ответа";
  return formatStoredAnswer(answer.distance);
}
