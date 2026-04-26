function renderSkeletonCard(): string {
  return `
    <article class="postcard" aria-hidden="true">
      <header class="postcard__header">
        <span class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0"></span>
        <span class="skeleton" style="width:120px;height:14px;align-self:center"></span>
      </header>
      <div class="postcard__text-container" style="display:flex;flex-direction:column;gap:8px;padding-block:12px">
        <span class="skeleton" style="width:100%;height:13px"></span>
        <span class="skeleton" style="width:82%;height:13px"></span>
        <span class="skeleton" style="width:60%;height:13px"></span>
      </div>
      <footer class="postcard__footer">
        <span class="skeleton" style="width:60px;height:12px"></span>
      </footer>
    </article>
  `;
}

export function renderFeedSkeleton(): string {
  const cards = Array.from({ length: 4 }, renderSkeletonCard).join("");
  return `
    <div class="app-page">
      <div class="header"></div>
      <main class="app-layout">
        <aside class="app-layout__left"></aside>
        <section class="app-layout__center">
          <div class="feed-stream">${cards}</div>
        </section>
        <aside class="app-layout__right"></aside>
      </main>
    </div>
  `;
}
