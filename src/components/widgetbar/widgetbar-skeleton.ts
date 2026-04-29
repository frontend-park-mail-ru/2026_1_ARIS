/**
 * Скелетон правой колонки с виджетами.
 */
/**
 * Рендерит placeholder-версию widgetbar.
 *
 * @returns {string} HTML-разметка скелетона.
 */
export function renderWidgetbarSkeleton(): string {
  const nameWidths = [110, 140, 100, 125];

  return `
    <aside class="widgetbar" aria-hidden="true">
      <section class="widgetbar-card">
        <span class="skeleton" style="display:block;width:170px;height:17px"></span>
        ${nameWidths
          .map(
            (w) => `
          <div class="widgetbar-person">
            <span class="widgetbar-person__avatar avatar-skeleton skeleton"></span>
            <span class="skeleton" style="display:block;width:${w}px;height:14px"></span>
          </div>
        `,
          )
          .join("")}
      </section>
    </aside>
  `;
}
