import { inferGenderByFirstName } from "./gender";

/**
 * Нормализует русскую букву ё/е в системных сообщениях backend.
 */
function normalizeRussianYo(value: string): string {
  return value.replace(/Ё/g, "Е").replace(/ё/g, "е");
}

/**
 * Нормализует уже сохранённый текст системного сообщения перед сравнением и render.
 */
export function normalizeRenderedSystemMessageText(text: string): string {
  const normalizedText = normalizeRussianYo(text)
    .replace(/"На рейтинг"/g, '"Рейтинговая"')
    .replace(/"Не на рейтинг"/g, '"Обычная"');

  const joinedMatch = text.match(/^(.+?) присоединил(?:ся|ась) к комнате\.$/);
  if (joinedMatch?.[1]) {
    const gender = inferGenderByFirstName(joinedMatch[1].split(/\s+/)[0] ?? "");
    if (gender === "female") {
      return normalizeRussianYo(`${joinedMatch[1]} присоединилась к комнате.`);
    }
    if (gender === "male") {
      return normalizeRussianYo(`${joinedMatch[1]} присоединился к комнате.`);
    }
  }

  const leftMatch = text.match(/^(.+?) выш(?:ел|ла) из комнаты\.$/);
  if (leftMatch?.[1]) {
    const gender = inferGenderByFirstName(leftMatch[1].split(/\s+/)[0] ?? "");
    if (gender === "female") {
      return normalizeRussianYo(`${leftMatch[1]} вышла из комнаты.`);
    }
    if (gender === "male") {
      return normalizeRussianYo(`${leftMatch[1]} вышел из комнаты.`);
    }
  }

  return normalizedText;
}
