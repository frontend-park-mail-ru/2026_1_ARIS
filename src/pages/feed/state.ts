/**
 * Состояние страницы ленты.
 *
 * Содержит runtime-состояние, кэши и вспомогательные функции управления состоянием.
 */
import type { PostcardModel } from "../../api/feed";
import type { ActiveFeedState } from "./types";
import { StateManager } from "../../state/StateManager";
import { TtlCache } from "../../utils/ttl-cache";

type FeedCoreState = {
  active: ActiveFeedState | null;
  isScrollBound: boolean;
  loadScheduled: boolean;
  isRefreshInFlight: boolean;
};

/** Реактивное хранилище состояния ленты. На изменения можно подписаться через `feedStore.subscribe()`. */
export const feedStore = new StateManager<FeedCoreState>({
  active: null,
  isScrollBound: false,
  loadScheduled: false,
  isRefreshInFlight: false,
});

/** Кэш ленты в памяти с TTL 5 минут. Ключ: "{authKey}:{modeKey}". */
export const feedItemsCache = new TtlCache<string, PostcardModel[]>(5 * 60 * 1000);

export let activeFeedState: ActiveFeedState | null = null;
export let isFeedScrollBound = false;
export let feedLoadScheduled = false;
export let isFeedRefreshInFlight = false;

export function setActiveFeedState(state: ActiveFeedState | null): void {
  activeFeedState = state;
  feedStore.patch({ active: state });
}

export function setIsFeedScrollBound(value: boolean): void {
  isFeedScrollBound = value;
  feedStore.patch({ isScrollBound: value });
}

export function setFeedLoadScheduled(value: boolean): void {
  feedLoadScheduled = value;
  feedStore.patch({ loadScheduled: value });
}

export function setIsFeedRefreshInFlight(value: boolean): void {
  isFeedRefreshInFlight = value;
  feedStore.patch({ isRefreshInFlight: value });
}
