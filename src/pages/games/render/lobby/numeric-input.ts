import { escapeHtml } from "../../../../utils/avatar";
import { gameT } from "../../shared/i18n";
import type { RenderNumericCreateInputOptions } from "./types";

/** Рендерит числовое поле формы создания комнаты. */
export function renderNumericCreateInput({
  name,
  value,
  min,
  max,
  maxMessage,
  minMessage,
  invalidMessage = gameT("common.invalidNumber"),
}: RenderNumericCreateInputOptions): string {
  return `
    <input
      type="text"
      name="${escapeHtml(name)}"
      inputmode="numeric"
      pattern="[0-9]*"
      autocomplete="off"
      value="${escapeHtml(value)}"
      required
      data-games-number-field
      data-games-number-min="${min}"
      data-games-number-max="${max}"
      data-games-number-min-message="${escapeHtml(minMessage)}"
      data-games-number-max-message="${escapeHtml(maxMessage)}"
      data-games-number-invalid-message="${escapeHtml(invalidMessage)}"
      aria-invalid="false"
      aria-readonly="false"
    >
    <span class="games-field__error games-field__error--stable" data-games-field-error aria-live="polite"></span>
  `;
}
