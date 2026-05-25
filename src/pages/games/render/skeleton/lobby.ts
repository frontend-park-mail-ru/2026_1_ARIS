/**
 * Рендерит skeleton пункта меню лобби.
 */
function renderLobbyOptionSkeleton(index: number): string {
  const titleWidth = index === 0 ? 190 : index === 1 ? 240 : 210;
  const metaWidth = index === 0 ? 360 : index === 1 ? 420 : 330;

  return `
    <article class="games-lobby-option games-lobby-option--skeleton" aria-hidden="true">
      <span class="skeleton" style="display:block;width:${titleWidth}px;max-width:72%;height:22px"></span>
      <span class="skeleton" style="display:block;width:${metaWidth}px;max-width:100%;height:14px;margin-top:10px"></span>
    </article>
  `;
}

/**
 * Рендерит skeleton лобби игры.
 */
export function renderGameLobbySkeleton(): string {
  const options = Array.from({ length: 3 }, (_, index) => renderLobbyOptionSkeleton(index)).join(
    "",
  );

  return `
    <section class="games-page" data-games-page>
      <div class="games-layout">
        <div class="games-main">
          <section class="games-panel content-card" aria-hidden="true">
            <header class="games-panel__header">
              <div style="display:flex;flex-direction:column;gap:10px;min-width:0;width:100%">
                <span class="skeleton" style="display:block;width:280px;height:24px"></span>
                <span class="skeleton" style="display:block;width:100%;height:14px"></span>
                <span class="skeleton" style="display:block;width:78%;height:14px"></span>
              </div>
            </header>
            <div class="games-lobby-menu" aria-hidden="true">
              ${options}
            </div>
            <div class="games-panel__footer">
              <span class="skeleton" style="display:block;width:150px;height:var(--control-height);border-radius:var(--radius-small)"></span>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}
