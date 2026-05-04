/**
 * Типы страницы друзей.
 *
 * Описывает данные, с которыми работает страница и связанные модули.
 */
/**
 * Типы страницы друзей.
 *
 * Описывают данные для вкладок друзей, заявок и модального удаления.
 */
import type { Friend } from "../../api/friends";

/**
 * Друг в представлении страницы с дополнительной подписью об образовании.
 */
export type DisplayFriend = Friend & {
  /** Короткая подпись об учебном статусе или группе. */
  educationLabel: string;
};

/**
 * Вкладка страницы друзей.
 */
export type FriendsTab = "accepted" | "incoming" | "outgoing";

/**
 * Runtime-состояние страницы друзей.
 */
export type FriendsState = {
  /** Показывает, были ли уже загружены данные страницы. */
  loaded: boolean;
  /** Идентификатор пользователя, для которого загружено состояние. */
  loadedForUserId: string;
  /** Показывает, что сейчас выполняется запрос или действие. */
  loading: boolean;
  /** Текст общей ошибки страницы. */
  errorMessage: string;
  /** Текущий поисковый запрос по друзьям. */
  query: string;
  /** Активная вкладка интерфейса. */
  activeTab: FriendsTab;
  /** Список подтверждённых друзей. */
  friends: DisplayFriend[];
  /** Входящие заявки в друзья. */
  incoming: DisplayFriend[];
  /** Исходящие заявки в друзья. */
  outgoing: DisplayFriend[];
  /** Пользователь, выбранный в модальном окне удаления. */
  deleteModalFriend: DisplayFriend | null;
};

/**
 * Набор списков друзей, используемый как результат загрузки данных страницы.
 */
export type FriendsData = {
  /** Список подтверждённых друзей. */
  friends: DisplayFriend[];
  /** Входящие заявки. */
  incoming: DisplayFriend[];
  /** Исходящие заявки. */
  outgoing: DisplayFriend[];
};

/**
 * Заголовки вкладок страницы друзей.
 */
export const TAB_TITLES: Record<FriendsTab, string> = {
  accepted: "Все друзья",
  incoming: "Входящие заявки",
  outgoing: "Исходящие заявки",
};
