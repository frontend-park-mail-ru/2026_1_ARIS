/** Форматирует название рейтингового сезона. */
export function formatSeasonTitle(title: string): string {
  const trimmedTitle = title.trim();
  const match = /^Сезон\s+(\d+):\s*(.+)$/i.exec(trimmedTitle);
  if (match) {
    return `Сезон ${match[1]} (${match[2]})`;
  }
  return trimmedTitle || "Текущий сезон";
}

/** Форматирует количество игровых баллов с правильным склонением. */
export function formatGamePoints(points: number): string {
  const abs = Math.abs(points);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "балл"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "балла"
        : "баллов";
  const value = formatRoundPointValue(points);
  return `${value} ${word}`;
}

/** Форматирует изменение рейтинга со знаком. */
export function formatRatingDelta(delta: number): string {
  return `${delta > 0 ? "+" : ""}${delta} рейтинга`;
}

/** Форматирует число очков раунда без лишних нулей. */
export function formatRoundPointValue(points: number): string {
  return Number.isInteger(points)
    ? String(points)
    : points.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** Форматирует бейдж начисления очков за раунд. */
export function formatRoundPointBadge(points: number): string {
  if (points <= 0) return "";
  return `+${formatRoundPointValue(points)}`;
}
