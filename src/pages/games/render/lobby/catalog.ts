import { escapeHtml } from "../../../../utils/avatar";
import { gameT } from "../../shared/i18n";
import { getGameCatalogItems } from "../../shared/registry";

/** Рендерит каталог доступных игр. */
export function renderGamesCatalog(): string {
  const games = getGameCatalogItems();
  return `
    <section class="games-catalog content-card">
      <header class="games-catalog__header">
        <div>
          <h1 class="games-catalog__title">${escapeHtml(gameT("catalog.title"))}</h1>
          <p class="games-catalog__subtitle">${escapeHtml(gameT("catalog.subtitle"))}</p>
        </div>
      </header>

      <div class="games-catalog__list" aria-label="${escapeHtml(gameT("catalog.listAria"))}">
        ${games
          .map((game) => {
            const hintId = `games-catalog-hint-${game.id}`;
            return `
            <article class="games-catalog-card" data-game-id="${escapeHtml(game.id)}">
              <a href="${game.href}" class="games-catalog-card__link" data-link>
                <h2 class="games-catalog-card__title">${escapeHtml(game.title)}</h2>
                <span class="games-catalog-card__players">${escapeHtml(gameT("catalog.players", { count: game.playerCount }))}</span>
              </a>
              <button
                type="button"
                class="games-catalog-card__hint-button"
                data-games-catalog-hint
                aria-controls="${escapeHtml(hintId)}"
                aria-label="${escapeHtml(gameT("catalog.showDescription"))}"
                aria-expanded="false"
              >
                ?
              </button>
              <p id="${escapeHtml(hintId)}" class="games-catalog-card__hint" hidden>
                ${escapeHtml(game.description)}
              </p>
            </article>
          `;
          })
          .join("")}
      </div>
    </section>
  `;
}
