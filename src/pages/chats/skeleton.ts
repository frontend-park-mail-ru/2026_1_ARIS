function renderSkeletonChatItem(): string {
  return `
    <li style="display:flex;align-items:center;gap:10px;padding:10px 12px" aria-hidden="true">
      <span class="skeleton" style="width:40px;height:40px;border-radius:50%;flex-shrink:0"></span>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <span class="skeleton" style="width:100px;height:13px"></span>
        <span class="skeleton" style="width:140px;height:12px"></span>
      </div>
    </li>
  `;
}

export function renderChatsSkeleton(): string {
  const items = Array.from({ length: 6 }, renderSkeletonChatItem).join("");
  return `
    <div class="app-page">
      <div class="header"></div>
      <main class="app-layout">
        <aside class="app-layout__left"></aside>
        <section class="app-layout__center" data-chats-page>
          <div class="chats-layout">
            <div class="chats-sidebar">
              <ul style="list-style:none;padding:0;margin:0">${items}</ul>
            </div>
            <div class="chats-content"></div>
          </div>
        </section>
        <aside class="app-layout__right"></aside>
      </main>
    </div>
  `;
}
