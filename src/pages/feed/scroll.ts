import { initPostcardExpand } from "../../components/postcard/postcard";
import { activeFeedState, setActiveFeedState } from "./state";
import { renderFeedCards } from "./render";

let feedObserver: IntersectionObserver | null = null;

/** Обновляет индикатор состояния бесконечной прокрутки в DOM. */
export function updateFeedStatusElement(): void {
  const status = document.querySelector("[data-feed-status]");
  if (!(status instanceof HTMLElement) || !activeFeedState) return;

  const hasMore = activeFeedState.renderedCount < activeFeedState.items.length;
  status.classList.toggle("feed-infinite-status--hidden", !hasMore);
  status.textContent = activeFeedState.isLoadingMore
    ? "Загружаем ещё публикации..."
    : "Прокрутите ниже, чтобы увидеть ещё публикации.";
}

/** Добавляет следующую порцию карточек в список ленты. */
export function appendMoreFeedCards(): void {
  const list = document.querySelector("[data-feed-list]");
  if (!(list instanceof HTMLElement) || !activeFeedState) return;

  const startIndex = activeFeedState.renderedCount;
  const nextCount = Math.min(activeFeedState.renderedCount + 10, activeFeedState.items.length);

  if (nextCount <= startIndex) return;

  const nextItems = activeFeedState.items.slice(startIndex, nextCount);
  const sentinel = list.querySelector("[data-feed-sentinel]");
  const html = renderFeedCards(nextItems);
  if (sentinel) {
    sentinel.insertAdjacentHTML("beforebegin", html);
  } else {
    list.insertAdjacentHTML("beforeend", html);
  }
  setActiveFeedState({ ...activeFeedState, renderedCount: nextCount });
  initPostcardExpand(list);
  updateFeedStatusElement();

  if (activeFeedState && activeFeedState.renderedCount >= activeFeedState.items.length) {
    disconnectFeedObserver();
  }
}

/** Отключает IntersectionObserver бесконечной прокрутки. */
export function disconnectFeedObserver(): void {
  feedObserver?.disconnect();
  feedObserver = null;
}

/** Подключает IntersectionObserver к sentinel-элементу в конце списка. */
export function bindFeedInfiniteScroll(): void {
  const list = document.querySelector("[data-feed-list]");
  if (!(list instanceof HTMLElement)) return;

  disconnectFeedObserver();

  const sentinel = document.createElement("div");
  sentinel.dataset.feedSentinel = "";
  list.appendChild(sentinel);

  feedObserver = new IntersectionObserver(
    (entries) => {
      if (!entries[0]?.isIntersecting || !activeFeedState || activeFeedState.isLoadingMore) return;
      setActiveFeedState({ ...activeFeedState, isLoadingMore: true });
      updateFeedStatusElement();
      appendMoreFeedCards();
      if (activeFeedState) setActiveFeedState({ ...activeFeedState, isLoadingMore: false });
      updateFeedStatusElement();
    },
    { rootMargin: "200px" },
  );

  feedObserver.observe(sentinel);
}

/** Инициализирует бесконечную прокрутку для текущего центрального блока ленты. */
export function initFeedInfiniteScroll(): void {
  const center = document.querySelector("[data-feed-center]");
  if (!(center instanceof HTMLElement) || !activeFeedState) return;

  bindFeedInfiniteScroll();
  initPostcardExpand(center);
  updateFeedStatusElement();
}
