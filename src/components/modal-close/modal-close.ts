/**
 * Кнопка закрытия модальных окон.
 */
import { renderButton } from "../button/button";

type RenderModalCloseButtonOptions = {
  className?: string;
  attributes?: string;
};

/**
 * Рендерит переиспользуемую кнопку закрытия модалки.
 */
export function renderModalCloseButton({
  className = "",
  attributes = "",
}: RenderModalCloseButtonOptions = {}): string {
  const classes = ["modal-close-button", className].filter(Boolean).join(" ");
  const extraAttributes = ['aria-label="Закрыть"', attributes].filter(Boolean).join(" ");

  return renderButton({
    text: "×",
    variant: "surface",
    tag: "button",
    type: "button",
    className: classes,
    attributes: extraAttributes,
  });
}
