import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectAlphabet,
  getDaysInMonth,
  isLeapYear,
  normalizeName,
  validateAlphabetConsistency,
  validateBirthDate,
  validateIsoBirthDate,
  validateName,
  validateOptionalEmail,
} from "./profile-validation";

describe("утилиты валидации профиля", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("определяет високосный год и длину месяца", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(getDaysInMonth(2, 2024)).toBe(29);
    expect(getDaysInMonth(2, 2023)).toBe(28);
  });

  it("нормализует имена и определяет алфавит", () => {
    expect(normalizeName("иВан")).toBe("Иван");
    expect(detectAlphabet("Ivan")).toBe("latin");
    expect(detectAlphabet("Иван")).toBe("cyrillic");
    expect(detectAlphabet("Ivan1")).toBeNull();
  });

  it("валидирует ограничения для имени", () => {
    expect(validateName("", "Имя", true)).toBe("Обязательное поле");
    expect(validateName("Ivan1", "Имя", true)).toBe('В поле "имя" не должно быть цифр');
    expect(validateName("Иvан", "Имя", true)).toBe(
      "В этом поле нельзя смешивать русский и английский языки",
    );
    expect(validateName("Иван", "Имя", true)).toBe("");
  });

  it("проверяет совпадение алфавита имени и фамилии", () => {
    expect(validateAlphabetConsistency("Ivan", "Иванов")).toBe(
      "Имя и фамилия должны быть на одном языке",
    );
    expect(validateAlphabetConsistency("Иван", "Иванов")).toBe("");
  });

  it("валидирует дату рождения и возрастные ограничения", () => {
    expect(validateBirthDate("31/04/2000", true)).toBe("В этом месяце 30 дней");
    expect(validateBirthDate("29/02/2023", true)).toBe("В феврале 2023 года 28 дней");
    expect(validateBirthDate("01/01/2018", true)).toBe("Вам должно быть не меньше 12 лет");
    expect(validateBirthDate("29/02/2012", true)).toBe("");
  });

  it("валидирует дату рождения в iso-формате", () => {
    expect(validateIsoBirthDate("2000-02-29")).toBe("");
    expect(validateIsoBirthDate("2001-02-29")).toBe("Некорректная дата рождения");
    expect(validateIsoBirthDate("01-01-2000")).toBe("Дата должна быть в формате гггг-мм-дд");
  });

  it("валидирует необязательный email", () => {
    expect(validateOptionalEmail("")).toBe("");
    expect(validateOptionalEmail("user@example.com")).toBe("");
    expect(validateOptionalEmail("bad..mail@example.com")).toBe("Введите корректный email");
    expect(validateOptionalEmail("user@example")).toBe("Введите корректный email");
  });
});
