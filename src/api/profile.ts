/**
 * API для чтения и редактирования профиля.
 *
 * Содержит:
 * - загрузку своего профиля и чужих профилей;
 * - редактирование профиля;
 * - загрузку аватара.
 */
import { ApiError, apiRequest } from "./core/client";

// Повторно экспортируем `ApiError`, чтобы сохранить текущие импорты в других модулях.
export { ApiError };

/**
 * Запись об образовании в профиле.
 */
export type ProfileEducation = {
  /** Название учебного заведения. */
  institution?: string;
  /** Группа, курс или дополнительная подпись. */
  grade?: string;
};

/**
 * Запись о работе в профиле.
 */
export type ProfileWork = {
  /** Название компании. */
  company?: string;
  /** Должность. */
  jobTitle?: string;
};

/**
 * Профиль в ответе API.
 */
export type ProfileResponse = {
  /** Идентификатор профиля текущего пользователя. */
  profileId?: number;
  /** Идентификатор аккаунта текущего пользователя. */
  userAccountId?: number;
  /** Имя пользователя. */
  firstName: string;
  /** Фамилия пользователя. */
  lastName: string;
  /** Текст статуса или биографии. */
  bio?: string;
  /** Ссылка на изображение профиля. */
  imageLink?: string;
  /** Пол пользователя. */
  gender?: string;
  /** Дата рождения в одном из серверных форматов. */
  birthday?: string;
  /** Старое поле backend с опечаткой, которое ещё может приходить. */
  dirthday?: string;
  /** Дата рождения в формате поля формы. */
  birthdayDate?: string;
  /** Родной город. */
  nativeTown?: string;
  /** Телефон. */
  phone?: string;
  /** Электронная почта. */
  email?: string;
  /** Текущий город. */
  town?: string;
  /** Список записей об образовании. */
  education?: ProfileEducation[];
  /** Список записей о работе. */
  work?: ProfileWork[];
  /** Интересы пользователя. */
  interests?: string;
  /** Любимая музыка. */
  favMusic?: string;
};

/**
 * Тело запроса на обновление профиля.
 */
export type UpdateProfilePayload = {
  /** Имя пользователя. */
  firstName?: string;
  /** Фамилия пользователя. */
  lastName?: string;
  /** Биография или статус. */
  bio?: string;
  /** Идентификатор загруженного аватара. */
  avatarID?: number;
  /** Флаг удаления текущего аватара. */
  removeAvatar?: boolean;
  /** Дата рождения в формате формы. */
  birthdayDate?: string;
  /** Пол пользователя. */
  gender?: "male" | "female";
  /** Родной город. */
  nativeTown?: string;
  /** Текущий город. */
  town?: string;
  /** Телефон. */
  phone?: string;
  /** Электронная почта. */
  email?: string;
  /** Учебное заведение. */
  institution?: string;
  /** Группа или направление. */
  group?: string;
  /** Компания. */
  company?: string;
  /** Должность. */
  jobTitle?: string;
  /** Интересы. */
  interests?: string;
  /** Любимая музыка. */
  favMusic?: string;
};

/**
 * Результат загрузки медиафайла.
 */
export type UploadedMedia = {
  /** Идентификатор медиафайла на сервере. */
  mediaID: number;
  /** Ссылка на загруженный файл. */
  mediaURL: string;
};

type UploadedMediaPayload =
  | UploadedMedia
  | {
      mediaID?: number | string;
      mediaId?: number | string;
      media_id?: number | string;
      mediaURL?: string;
      mediaUrl?: string;
      media_url?: string;
      url?: string;
    };

type UploadMediaResponse = {
  media?: UploadedMediaPayload[];
};

function mapUploadedMedia(raw: UploadedMediaPayload | null | undefined): UploadedMedia | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const mediaID = Number(
    raw.mediaID ??
      ("mediaId" in raw ? raw.mediaId : undefined) ??
      ("media_id" in raw ? raw.media_id : undefined),
  );
  const mediaURL = String(
    raw.mediaURL ??
      ("mediaUrl" in raw ? raw.mediaUrl : undefined) ??
      ("media_url" in raw ? raw.media_url : undefined) ??
      ("url" in raw ? raw.url : undefined) ??
      "",
  ).trim();

  if (!Number.isFinite(mediaID) || mediaID <= 0 || !mediaURL) {
    return null;
  }

  return { mediaID, mediaURL };
}

/**
 * Загружает профиль текущего авторизованного пользователя.
 *
 * Добавляет cache-busting параметр, чтобы после редактирования
 * не использовать устаревшую версию профиля из промежуточных кэшей.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<ProfileResponse>} Данные собственного профиля.
 * @example
 * const profile = await getMyProfile();
 */
export async function getMyProfile(signal?: AbortSignal): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>(
    `/api/profile/me?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {} as ProfileResponse,
  );
}

/**
 * Загружает профиль по его идентификатору.
 *
 * @param {string} profileId Идентификатор профиля.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<ProfileResponse>} Данные выбранного профиля.
 * @example
 * const profile = await getProfileById("7");
 */
export async function getProfileById(
  profileId: string,
  signal?: AbortSignal,
): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>(
    `/api/profile/${encodeURIComponent(profileId)}?ts=${Date.now()}`,
    { ...(signal ? { signal } : {}) },
    {} as ProfileResponse,
  );
}

/**
 * Обновляет собственный профиль.
 *
 * Используется после локальной валидации формы профиля
 * и отправляет только те поля, которые действительно изменились.
 *
 * @param {UpdateProfilePayload} payload Частичный набор обновляемых полей.
 * @returns {Promise<void>}
 * @example
 * await updateMyProfile({ town: "Москва" });
 */
export async function updateMyProfile(payload: UpdateProfilePayload): Promise<void> {
  await apiRequest<unknown>("/api/profile/me/edit", { method: "PATCH", body: payload }, null);
}

/**
 * Загружает новый аватар пользователя.
 *
 * Нужна отдельно от `updateMyProfile`, потому что файл сначала
 * отправляется в хранилище медиа, а уже потом его идентификатор
 * привязывается к профилю отдельным запросом.
 *
 * @param {File} file Файл изображения для загрузки.
 * @returns {Promise<UploadedMedia>} Загруженное медиа с идентификатором и ссылкой.
 * @example
 * const avatar = await uploadProfileAvatar(file);
 * await updateMyProfile({ avatarID: avatar.mediaID });
 */
export async function uploadProfileAvatar(file: File): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("files", file);

  const data = await apiRequest<UploadMediaResponse>(
    "/api/media/upload?for=avatar",
    { method: "POST", body: formData },
    {},
  );
  const uploadedMedia = Array.isArray(data.media) ? data.media : [];

  const uploadedFile = mapUploadedMedia(uploadedMedia[0]);

  if (!uploadedFile) {
    throw new ApiError("Не удалось загрузить аватар.", 200, data);
  }

  return uploadedFile;
}
