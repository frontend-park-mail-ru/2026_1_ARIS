/**
 * Бесконечная прокрутка ленты.
 */
import { initPostcardExpand } from "../../components/postcard/postcard";
import { t } from "../../state/i18n";
import { activeFeedState, setActiveFeedState } from "./state";
import { renderFeedCards } from "./render";

let feedObserver: IntersectionObserver | null = null;

/** Обновляет индикатор состояния бесконечной прокрутки в DOM. */
export function updateFeedStatusElement(): void {
  const status = document.querySelector("[data-feed-status]");
  if (!(status instanceof HTMLElement) || !activeFeedState) return;

  const hasMore =
    activeFeedState.renderedCount < activeFeedState.items.length || activeFeedState.hasMore;
  status.classList.remove("feed-infinite-status--hidden");
  status.textContent = !hasMore
    ? t("feed.end")
    : activeFeedState.isLoadingMore
      ? t("feed.loadingMore")
      : t("feed.loadMore");
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

  if (
    activeFeedState &&
    activeFeedState.renderedCount >= activeFeedState.items.length &&
    !activeFeedState.hasMore
  ) {
    disconnectFeedObserver();
  }
}

/** Отключает IntersectionObserver бесконечной прокрутки. */
export function disconnectFeedObserver(): void {
  feedObserver?.disconnect();
  feedObserver = null;
}

/** Подключает IntersectionObserver к sentinel-элементу в конце списка. */
export function bindFeedInfiniteScroll(onServerFetch?: () => Promise<void>): void {
  const list = document.querySelector("[data-feed-list]");
  if (!(list instanceof HTMLElement)) return;

  disconnectFeedObserver();

  const sentinel = document.createElement("div");
  sentinel.dataset.feedSentinel = "";
  list.appendChild(sentinel);

  feedObserver = new IntersectionObserver(
    (entries) => {
      if (!entries[0]?.isIntersecting || !activeFeedState || activeFeedState.isLoadingMore) return;

      if (activeFeedState.renderedCount < activeFeedState.items.length) {
        setActiveFeedState({ ...activeFeedState, isLoadingMore: true });
        updateFeedStatusElement();
        appendMoreFeedCards();
        if (activeFeedState) setActiveFeedState({ ...activeFeedState, isLoadingMore: false });
        updateFeedStatusElement();
      } else if (activeFeedState.hasMore && onServerFetch) {
        setActiveFeedState({ ...activeFeedState, isLoadingMore: true });
        updateFeedStatusElement();
        let fetchFailed = false;
        void onServerFetch()
          .catch(() => {
            fetchFailed = true;
          })
          .finally(() => {
            if (activeFeedState) setActiveFeedState({ ...activeFeedState, isLoadingMore: false });
            updateFeedStatusElement();

            const currentSentinel = document.querySelector("[data-feed-sentinel]");
            if (
              !fetchFailed &&
              currentSentinel instanceof Element &&
              feedObserver &&
              activeFeedState?.hasMore
            ) {
              feedObserver.unobserve(currentSentinel);
              feedObserver.observe(currentSentinel);
            }
          });
      } else {
        disconnectFeedObserver();
      }
    },
    { rootMargin: "200px" },
  );

  feedObserver.observe(sentinel);
}

/** Инициализирует бесконечную прокрутку для текущего центрального блока ленты. */
export function initFeedInfiniteScroll(onServerFetch?: () => Promise<void>): void {
  const center = document.querySelector("[data-feed-center]");
  if (!(center instanceof HTMLElement) || !activeFeedState) return;

  bindFeedInfiniteScroll(onServerFetch);
  initPostcardExpand(center);
  updateFeedStatusElement();
}
