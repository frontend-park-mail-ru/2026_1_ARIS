/**
 * Типы страницы ленты.
 *
 * Описывает данные, с которыми работает страница и связанные модули.
 */
/**
 * Типы страницы ленты.
 *
 * Описывают режимы ленты, кэши и состояние центральной колонки.
 */
import type { PostcardModel } from "../../api/feed";

/**
 * Режим отображения ленты.
 */
export type FeedMode = "by-time" | "for-you";

/**
 * Тип авторизации для ключей кэша ленты.
 */
export type FeedAuthKey = "guest" | "authorised";

/**
 * Кэш элементов ленты, разбитый по типу пользователя и режиму отображения.
 */
export type FeedItemsCache = Record<FeedAuthKey, Record<FeedMode, PostcardModel[] | null>>;

/**
 * Результат построения центральной колонки ленты.
 */
export type FeedCenterResult =
  /** Успешный результат с набором карточек. */
  | { kind: "items"; items: PostcardModel[] }
  /** Резервный результат с готовым HTML-блоком. */
  | { kind: "html"; html: string };

/**
 * Текущее состояние центральной колонки ленты после рендера.
 */
export type ActiveFeedState = {
  /** Полный список карточек, доступных для отображения. */
  items: PostcardModel[];
  /** Количество карточек, уже выведенных в DOM. */
  renderedCount: number;
  /** Показывает, что сейчас подгружается следующая порция. */
  isLoadingMore: boolean;
};
