/** Возвращает trimmed-значение текстового поля формы. */
export function getInputValue(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
    ? field.value.trim()
    : "";
}

/** Возвращает состояние checkbox-поля формы. */
export function getCheckboxValue(form: HTMLFormElement, name: string): boolean {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement && field.type === "checkbox" ? field.checked : false;
}

/** Парсит целое число и удерживает его в заданных границах. */
export function parseBoundedInt(value: string, fallback: number, min: number, max: number): number {
  const numberValue = Number.parseInt(value, 10);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}
