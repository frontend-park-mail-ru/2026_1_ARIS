/**
 * Форматирование отображаемых имён с учётом выбранного языка.
 */
import { getLanguageMode } from "../state/language";

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function matchCase(source: string, replacement: string): string {
  if (!replacement) return replacement;
  if (source[0] === source[0]?.toUpperCase()) {
    return `${replacement[0]?.toUpperCase() ?? ""}${replacement.slice(1)}`;
  }
  return replacement;
}

/**
 * Транслитерирует кириллицу в латиницу для отображения в английском интерфейсе.
 */
export function transliterateCyrillic(value: string): string {
  return value.replace(/[А-Яа-яЁё]/g, (char) => {
    const replacement = CYRILLIC_TO_LATIN[char.toLowerCase()] ?? char;
    return matchCase(char, replacement);
  });
}

/**
 * Возвращает строку имени, транслитерированную только в English-режиме.
 */
export function formatDisplayName(value: string): string {
  const trimmed = value.trim();
  return getLanguageMode() === "EN" ? transliterateCyrillic(trimmed) : trimmed;
}

/**
 * Собирает имя и фамилию для отображения.
 */
export function formatPersonName(firstName?: string, lastName?: string, fallback = ""): string {
  return formatDisplayName(`${firstName ?? ""} ${lastName ?? ""}`.trim() || fallback);
}
