import { escapeHtml } from "../../utils/avatar";

export type FloatingMenuItem = {
  action: string;
  label: string;
  danger?: boolean;
};

type RenderFloatingMenuOptions = {
  items: FloatingMenuItem[];
  anchorX: number;
  anchorY: number;
};

export function renderFloatingMenu({ items, anchorX, anchorY }: RenderFloatingMenuOptions): string {
  if (!items.length) return "";

  return `
    <div class="floating-menu" data-floating-menu>
      <button
        type="button"
        class="floating-menu__backdrop"
        data-floating-menu-close
        aria-label="Закрыть меню"
      ></button>
      <div
        class="floating-menu__panel floating-menu__panel--align-end"
        style="left:${Math.round(anchorX)}px; top:${Math.round(anchorY + 8)}px;"
        role="menu"
      >
        ${items
          .map(
            (item) => `
              <button
                type="button"
                class="floating-menu__item${item.danger ? " floating-menu__item--danger" : ""}"
                data-floating-menu-action="${escapeHtml(item.action)}"
                role="menuitem"
              >
                ${escapeHtml(item.label)}
              </button>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}
