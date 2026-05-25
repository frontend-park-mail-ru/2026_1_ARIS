/**
 * Рендерит skeleton каталога игр.
 */
export function renderGameCatalogSkeleton(): string {
  const cards = Array.from(
    { length: 2 },
    () => `
      <article class="games-catalog-card games-catalog-card--skeleton" aria-hidden="true">
        <div class="games-catalog-card__link">
          <span class="skeleton" style="display:block;width:190px;height:22px"></span>
          <span class="skeleton" style="display:block;width:100%;height:14px"></span>
          <span class="skeleton" style="display:block;width:74%;height:14px"></span>
          <span class="skeleton" style="display:block;width:82px;height:14px;margin-top:4px"></span>
        </div>
      </article>
    `,
  ).join("");

  return `
    <section class="games-page" data-games-page>
      <section class="games-catalog content-card" aria-hidden="true">
        <header class="games-catalog__header">
          <div style="display:flex;flex-direction:column;gap:10px;min-width:0;width:100%">
            <span class="skeleton" style="display:block;width:180px;height:28px"></span>
            <span class="skeleton" style="display:block;width:min(520px, 100%);height:14px"></span>
          </div>
        </header>
        <div class="games-catalog__list">${cards}</div>
      </section>
    </section>
  `;
}
