/**
 * Скелетон страницы чатов.
 *
 * Содержит разметку загрузочного состояния страницы.
 */
import { renderHeaderSkeleton } from "../../components/header/header-skeleton";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { t } from "../../state/i18n";

function renderSkeletonChatItem(): string {
  return `
    <article class="chat-thread" aria-hidden="true">
      <span class="skeleton chat-thread__avatar"></span>
      <div class="chat-thread__content">
        <div class="chat-thread__meta">
          <span class="skeleton" style="width:130px;height:16px"></span>
          <span class="skeleton" style="width:36px;height:12px"></span>
        </div>
        <span class="skeleton" style="width:170px;height:14px"></span>
      </div>
    </article>
  `;
}

function renderSkeletonMessage(): string {
  return `
    <div style="display:flex;align-items:flex-start;gap:12px;max-width:72%" aria-hidden="true">
      <span class="skeleton" style="width:48px;height:48px;border-radius:50%;flex-shrink:0"></span>
      <div style="display:flex;flex-direction:column;gap:8px;min-width:220px">
        <span class="skeleton" style="width:145px;height:16px"></span>
        <span class="skeleton" style="width:260px;height:14px"></span>
        <span class="skeleton" style="width:190px;height:14px"></span>
      </div>
    </div>
  `;
}

export function renderChatsSkeleton(): string {
  const items = Array.from({ length: 6 }, renderSkeletonChatItem).join("");
  const messages = [
    renderSkeletonMessage(),
    renderSkeletonMessage(),
    renderSkeletonMessage(),
    renderSkeletonMessage(),
  ].join("");

  return `
    <div class="app-page app-page--content-wide">
      ${renderHeaderSkeleton()}
      <main class="app-layout app-layout--content-wide">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised: true })}
        </aside>
        <section class="app-layout__center">
          <section class="chats-page content-card" data-chats-page>
            <aside class="chats-sidebar">
              <h1 class="chats-sidebar__title">${t("chats.title")}</h1>

              <div class="chats-list">${items}</div>
            </aside>

            <section class="chat-view">
              <header class="chat-header" aria-hidden="true">
                <span class="skeleton chat-header__avatar"></span>
                <div style="display:flex;flex-direction:column;gap:8px">
                  <span class="skeleton" style="width:160px;height:17px"></span>
                  <span class="skeleton" style="width:110px;height:13px"></span>
                </div>
              </header>

              <div class="chat-messages" style="gap:18px">
                ${messages}
              </div>

              <form class="chat-compose" aria-hidden="true">
                <span class="skeleton chat-compose__input" style="display:block"></span>
                <span class="skeleton chat-compose__button"></span>
              </form>
            </section>
          </section>
        </section>
      </main>
    </div>
  `;
}
