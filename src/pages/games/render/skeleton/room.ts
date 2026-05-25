/**
 * Рендерит skeleton игроков в комнате ожидания.
 */
function renderGameRoomPlayersSkeleton(): string {
  return Array.from(
    { length: 3 },
    () => `
      <article class="games-player" aria-hidden="true">
        <div class="games-player__body">
          <span class="skeleton" style="display:inline-flex;width:40px;height:40px;border-radius:50%;vertical-align:middle"></span>
          <span class="skeleton" style="display:inline-flex;width:150px;height:16px;margin-left:8px;vertical-align:middle"></span>
        </div>
      </article>
    `,
  ).join("");
}

/**
 * Рендерит skeleton сообщений чата комнаты.
 */
function renderGameRoomChatMessagesSkeleton(): string {
  return Array.from(
    { length: 3 },
    (_, index) => `
      <article class="games-room-chat-message" aria-hidden="true">
        <div class="games-room-chat-message__header">
          <span class="skeleton" style="display:block;width:28px;height:28px;border-radius:50%"></span>
          <span class="skeleton" style="display:block;width:${index === 1 ? 86 : 64}px;height:14px"></span>
          <span class="skeleton" style="display:block;width:38px;height:12px"></span>
        </div>
        <span class="skeleton" style="display:block;width:${index === 2 ? 72 : 100}%;height:34px"></span>
      </article>
    `,
  ).join("");
}

/**
 * Рендерит skeleton комнаты игры.
 */
export function renderGameRoomSkeleton(): string {
  const players = renderGameRoomPlayersSkeleton();
  const chatMessages = renderGameRoomChatMessagesSkeleton();

  return `
    <section class="games-page" data-games-page>
      <div class="games-layout games-layout--with-chat">
        <div class="games-main">
          <section class="games-panel content-card" aria-hidden="true">
            <header class="games-room-header">
              <div class="games-room-header__top">
                <div style="display:flex;flex-direction:column;gap:10px;min-width:0;width:100%">
                  <span class="skeleton" style="display:block;width:220px;height:24px"></span>
                  <span class="skeleton" style="display:block;width:150px;height:14px"></span>
                </div>
              </div>
            </header>
            <div class="games-scoreboard">${players}</div>
            <section class="games-access-panel">
              <span class="skeleton" style="display:block;width:160px;height:18px"></span>
            </section>
            <div class="games-room-footer">
              <div class="games-room-footer__secondary">
                <span class="skeleton" style="display:block;height:var(--control-height);border-radius:var(--radius-pill)"></span>
                <span class="skeleton" style="display:block;height:var(--control-height);border-radius:var(--radius-small)"></span>
              </div>
              <div class="games-room-footer__primary">
                <span class="skeleton" style="display:block;height:var(--control-height);border-radius:var(--radius-small)"></span>
              </div>
            </div>
          </section>
        </div>
        <aside class="games-room-chat content-card" aria-hidden="true">
          <header class="games-room-chat__header">
            <span class="skeleton" style="display:block;width:128px;height:20px"></span>
          </header>
          <div class="games-room-chat__messages">${chatMessages}</div>
          <span class="skeleton" style="display:block;width:100%;height:72px;border-radius:var(--radius-small)"></span>
          <span class="skeleton" style="display:block;width:100%;height:var(--control-height);border-radius:var(--radius-small)"></span>
        </aside>
      </div>
    </section>
  `;
}
