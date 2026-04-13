export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function getDaysInMonth(month: number, year: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 31;
}

export function normalizeName(value: string): string {
  if (!value) return value;

  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function detectAlphabet(value: string): "latin" | "cyrillic" | null {
  if (/^[A-Za-z-]+$/.test(value)) {
    return "latin";
  }

  if (/^[А-Яа-яЁё-]+$/u.test(value)) {
    return "cyrillic";
  }

  return null;
}

export function validateName(value: string, label: string, isSubmitAttempted = false): string {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (value.length > 12) {
    return `${label} может содержать максимум 12 символов`;
  }

  if (/\d/.test(value)) {
    return `В поле "${label.toLowerCase()}" не должно быть цифр`;
  }

  if (!/^[A-Za-zА-Яа-яЁё-]+$/u.test(value)) {
    return `В поле "${label.toLowerCase()}" не должно быть символов`;
  }

  const hasLatin = /[A-Za-z]/.test(value);
  const hasCyrillic = /[А-Яа-яЁё]/u.test(value);

  if (hasLatin && hasCyrillic) {
    return "В этом поле нельзя смешивать русский и английский языки";
  }

  return "";
}

export function validateAlphabetConsistency(firstName: string, lastName: string): string {
  if (!firstName || !lastName) {
    return "";
  }

  const firstLang = detectAlphabet(firstName);
  const lastLang = detectAlphabet(lastName);

  if (!firstLang || !lastLang) {
    return "";
  }

  if (firstLang !== lastLang) {
    return "Имя и фамилия должны быть на одном языке";
  }

  return "";
}

export function validateAgeRange(date: Date): string {
  const now = new Date();

  if (date > now) {
    return "Дата рождения не может быть в будущем";
  }

  const ageLimit = new Date(date.getFullYear() + 12, date.getMonth(), date.getDate());
  if (ageLimit > now) {
    return "Вам должно быть не меньше 12 лет";
  }

  const maxAgeLimit = new Date(date.getFullYear() + 130, date.getMonth(), date.getDate());
  if (maxAgeLimit < now) {
    return "Возраст не может превышать 130 лет";
  }

  return "";
}

export function validateBirthDate(value: string, isSubmitAttempted = false): string {
  if (!value) {
    return isSubmitAttempted ? "Обязательное поле" : "";
  }

  if (!/^[\d/]*$/.test(value)) {
    return "Дата должна быть в формате дд/мм/гггг";
  }

  const parts = value.split("/");

  if (parts.length > 3) {
    return "Дата должна быть в формате дд/мм/гггг";
  }

  const [dayString = "", monthString = "", yearString = ""] = parts;

  if (dayString.length > 2 || monthString.length > 2 || yearString.length > 4) {
    return "Дата должна быть в формате дд/мм/гггг";
  }

  if (dayString.length === 2) {
    const day = Number(dayString);

    if (day < 1 || day > 31) {
      return "Некорректный день";
    }
  }

  if (monthString.length === 2) {
    const month = Number(monthString);

    if (month < 1 || month > 12) {
      return "Некорректный месяц";
    }
  }

  if (dayString.length === 2 && monthString.length === 2) {
    const day = Number(dayString);
    const month = Number(monthString);

    const maxDaysWithoutYear: Record<number, number> = {
      1: 31,
      2: 29,
      3: 31,
      4: 30,
      5: 31,
      6: 30,
      7: 31,
      8: 31,
      9: 30,
      10: 31,
      11: 30,
      12: 31,
    };

    const maxDay = maxDaysWithoutYear[month];

    if (month >= 1 && month <= 12 && maxDay && day > maxDay) {
      if (month === 2) {
        return "В феврале максимум 29 дней";
      }

      return `В этом месяце ${maxDay} дней`;
    }
  }

  if (yearString.length === 4) {
    const year = Number(yearString);
    const now = new Date();

    if (year > now.getFullYear()) {
      return "Некорректный год";
    }
  }

  if (yearString.length > 0 && yearString.length < 4) {
    return "Введите год в формате гггг";
  }

  if (value.length < 10) {
    return isSubmitAttempted ? "Введите дату рождения в формате дд/мм/гггг" : "";
  }

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return "Дата должна быть в формате дд/мм/гггг";
  }

  const day = Number(dayString);
  const month = Number(monthString);
  const year = Number(yearString);

  const maxDay = getDaysInMonth(month, year);

  if (day > maxDay) {
    if (month === 2) {
      return `В феврале ${year} года ${maxDay} дней`;
    }

    return `В этом месяце ${maxDay} дней`;
  }

  const birthDate = new Date(year, month - 1, day);
  return validateAgeRange(birthDate);
}

export function validateIsoBirthDate(value: string): string {
  if (!value) {
    return "";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Дата должна быть в формате гггг-мм-дд";
  }

  const [yearString, monthString, dayString] = value.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "Некорректная дата рождения";
  }

  return validateAgeRange(date);
}

export function validateOptionalEmail(value: string): string {
  if (!value) {
    return "";
  }

  if (value.length > 254) {
    return "Введите корректный email";
  }

  const emailParts = value.split("@");
  if (emailParts.length !== 2) {
    return "Введите корректный email";
  }

  const [localPart, domain] = emailParts;

  if (!localPart || !domain || localPart.length > 64) {
    return "Введите корректный email";
  }

  if (localPart.includes("..") || domain.includes("..")) {
    return "Введите корректный email";
  }

  if (!/^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/.test(localPart)) {
    return "Введите корректный email";
  }

  const domainLabels = domain.split(".");
  if (domainLabels.length < 2 || domainLabels.some((label) => !label)) {
    return "Введите корректный email";
  }

  const topLevelDomain = domainLabels[domainLabels.length - 1] ?? "";
  if (!/^[A-Za-z]{2,}$/.test(topLevelDomain)) {
    return "Введите корректный email";
  }

  const isValidDomainLabel = (label: string): boolean =>
    /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label);

  if (!domainLabels.every(isValidDomainLabel)) {
    return "Введите корректный email";
  }

  return "";
}
