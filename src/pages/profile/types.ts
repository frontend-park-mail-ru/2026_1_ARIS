/**
 * Типы страницы профиля.
 *
 * Описывает данные, с которыми работает страница и связанные модули.
 */
/**
 * Типы страницы профиля.
 *
 * Описывают публичное представление профиля, посты, редактор и состояние модалок.
 */
import type { PostMedia } from "../../api/posts";
import type { Friend } from "../../api/friends";

/**
 * Параметры маршрута страницы профиля.
 */
export type ProfileParams = {
  /** Идентификатор профиля в URL, если открыт чужой профиль. */
  id?: string;
};

/**
 * Отношение текущего пользователя к открытому профилю.
 */
export type ProfileFriendRelation = "friend" | "incoming" | "outgoing" | "none";

/**
 * Поля, которые можно редактировать в профиле.
 */
export type EditableProfileFields = {
  /** Имя пользователя. */
  firstName: string;
  /** Фамилия пользователя. */
  lastName: string;
  /** Краткое описание профиля. */
  bio: string;
  /** Пол в форме редактирования. */
  gender: "male" | "female" | "";
  /** Дата рождения в формате поля формы. */
  birthdayDate: string;
  /** Родной город. */
  nativeTown: string;
  /** Текущий город проживания. */
  town: string;
  /** Телефон. */
  phone: string;
  /** Электронная почта. */
  email: string;
  /** Интересы. */
  interests: string;
  /** Любимая музыка. */
  favMusic: string;
  /** Учебное заведение. */
  institution: string;
  /** Группа или направление обучения. */
  group: string;
  /** Компания. */
  company: string;
  /** Должность. */
  jobTitle: string;
};

/**
 * Карта ошибок валидации полей профиля.
 */
export type ProfileFieldErrorMap = Partial<Record<keyof EditableProfileFields, string>>;

/**
 * Профиль в представлении страницы.
 */
export type DisplayProfile = {
  /** Идентификатор профиля. */
  id: string;
  /** Имя пользователя. */
  firstName: string;
  /** Фамилия пользователя. */
  lastName: string;
  /** Логин или служебный идентификатор. */
  username: string;
  /** Статус или биография, показываемая в шапке профиля. */
  status: string;
  /** Текущий город. */
  city: string;
  /** Родной город. */
  nativeTown: string;
  /** Телефон. */
  phone: string;
  /** Электронная почта. */
  email: string;
  /** Дата рождения в человекочитаемом виде. */
  birthday: string;
  /** Пол в отображаемом виде. */
  gender: string;
  /** Интересы пользователя. */
  interests: string;
  /** Любимая музыка. */
  favoriteMusic: string;
  /** Компания. */
  workCompany: string;
  /** Должность. */
  workRole: string;
  /** Список учебных записей. */
  education: Array<{
    /** Название места обучения. */
    place: string;
    /** Дополнительная подпись, например группа или направление. */
    subtitle: string;
  }>;
  /** Друзья профиля. */
  friends: Friend[];
  /** Показывает, открыт ли собственный профиль. */
  isOwnProfile: boolean;
  /** Показывает, что профиль собран из данных API, а не из fallback-источника. */
  isApiBacked: boolean;
  /** Ссылка на аватар профиля. */
  avatarLink: string | undefined;
  /** Отношение текущего пользователя к профилю. */
  friendRelation: ProfileFriendRelation;
  /** Дата создания дружбы, если она известна. */
  friendshipCreatedAt?: string | undefined;
  /** Показывает, что профиль не найден. */
  isMissingProfile: boolean;
  /** Набор редактируемых полей для формы профиля. */
  editable: EditableProfileFields;
};

/**
 * Краткое состояние дружбы для профиля.
 */
export type ProfileFriendState = {
  /** Тип отношения между пользователями. */
  relation: ProfileFriendRelation;
  /** Дата установления текущего отношения, если она известна. */
  friendshipCreatedAt?: string | undefined;
};

/**
 * Публикация в профиле в клиентском представлении.
 */
export type ProfilePost = {
  /** Идентификатор поста. */
  id: string;
  /** Идентификатор автора. */
  authorId: string;
  /** Имя автора. */
  authorFirstName: string;
  /** Фамилия автора. */
  authorLastName: string;
  /** Логин автора. */
  authorUsername: string;
  /** Ссылка на аватар автора. */
  authorAvatarLink?: string;
  /** Признак собственного поста. */
  isOwnPost: boolean;
  /** Основной текст публикации. */
  text: string;
  /** Короткая подпись времени. */
  time: string;
  /** Полная дата публикации в формате ISO. */
  timeRaw: string;
  /** Дата последнего редактирования в формате ISO. */
  updatedAtRaw?: string;
  /** Количество лайков. */
  likes: number;
  /** Количество репостов. */
  reposts: number;
  /** Количество комментариев. */
  comments: number;
  /** Медиавложения поста в нормализованном виде. */
  media: PostMedia[];
  /** Список изображений для карточки поста. */
  images: string[];
};

/**
 * Элемент медиаконтента в композере поста.
 */
export type ComposerMediaItem = {
  /** Идентификатор медиа после загрузки на сервер. */
  mediaID?: number;
  /** Ссылка на локальное превью или серверный файл. */
  mediaURL: string;
  /** Исходный файл до загрузки на сервер. */
  file?: File;
  /** Показывает, был ли файл уже загружен на сервер. */
  isUploaded: boolean;
};

/**
 * Состояние композера поста.
 */
export type PostComposerState = {
  /** Показывает, открыт ли композер. */
  open: boolean;
  /** Режим композера: создание или редактирование. */
  mode: "create" | "edit";
  /** Идентификатор редактируемого поста. */
  editingPostId: string | null;
  /** Идентификатор поста в модалке удаления. */
  deleteConfirmPostId: string | null;
  /** Показывает, что пост сейчас сохраняется. */
  isSaving: boolean;
  /** Текст ошибки композера. */
  errorMessage: string;
  /** Текст публикации. */
  text: string;
  /** Список выбранных медиаэлементов. */
  mediaItems: ComposerMediaItem[];
};

/**
 * Состояние модального окна редактирования аватара.
 */
export type AvatarModalState = {
  /** Показывает, открыто ли окно редактирования аватара. */
  open: boolean;
  /** Показывает, открыто ли подтверждение удаления аватара. */
  deleteConfirmOpen: boolean;
  /** Показывает, что сейчас выполняется сохранение. */
  isSaving: boolean;
  /** Текст ошибки в модалке аватара. */
  errorMessage: string;
  /** Локальный `objectURL` выбранного изображения. */
  objectUrl: string | null;
  /** Имя выбранного файла. */
  fileName: string;
  /** Натуральная ширина исходного изображения. */
  naturalWidth: number;
  /** Натуральная высота исходного изображения. */
  naturalHeight: number;
  /** Текущий масштаб изображения. */
  scale: number;
  /** Минимально допустимый масштаб. */
  minScale: number;
  /** Текущий угол поворота изображения. */
  rotation: 0 | 90 | 180 | 270;
  /** Горизонтальное смещение изображения. */
  offsetX: number;
  /** Вертикальное смещение изображения. */
  offsetY: number;
  /** Идентификатор активного указателя во время drag-сценария. */
  dragPointerId: number | null;
  /** Начальная X-координата drag-жеста. */
  dragStartX: number;
  /** Начальная Y-координата drag-жеста. */
  dragStartY: number;
  /** Начальное горизонтальное смещение в момент начала drag. */
  dragStartOffsetX: number;
  /** Начальное вертикальное смещение в момент начала drag. */
  dragStartOffsetY: number;
};
