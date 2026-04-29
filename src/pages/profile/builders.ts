/**
 * Сборщики отображаемой модели профиля.
 *
 * Преобразуют разные источники данных в единый `DisplayProfile`:
 * - моковые записи
 * - fallback-профили
 * - ответы backend API
 */
import { getSessionUser } from "../../state/session";
import { getProfileRecordById, type ProfileRecord } from "./profile-data";
import type { ProfileResponse } from "../../api/profile";
import type { DisplayProfile, EditableProfileFields, ProfileParams } from "./types";
import { normalizeProfileId, normaliseAvatarLink, resolveOwnAvatarLink } from "./state";

/**
 * Нормализует часть имени до вида `Имя`.
 *
 * @param {string} value Исходное значение.
 * @returns {string} Отформатированная часть имени.
 */
export function formatNamePart(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Возвращает значение или человекочитаемый fallback.
 *
 * @param {string} value Исходное значение.
 * @param {string} [fallback="Не указано"] Текст-заглушка.
 * @returns {string} Очищенное значение или fallback.
 */
export function valueOrFallback(value: string, fallback = "Не указано"): string {
  return value.trim() || fallback;
}

/**
 * Преобразует код пола в подпись для интерфейса.
 *
 * @param {EditableProfileFields["gender"]} value Значение из формы или API.
 * @returns {string} Подпись для отображения.
 */
export function formatGender(value: EditableProfileFields["gender"]): string {
  if (value === "male") return "Мужской";
  if (value === "female") return "Женский";
  return "Не указано";
}

/**
 * Форматирует дату рождения в локализованную строку.
 *
 * @param {string} [value] Дата в ISO-формате.
 * @returns {string} Подпись для интерфейса.
 */
export function normaliseDate(value?: string): string {
  if (!value) return "";

  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!isoDatePattern.test(value)) {
    return value;
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

/**
 * Форматирует дату дружбы без технического суффикса `г.`.
 *
 * @param {string} [value] Исходная дата.
 * @returns {string} Отформатированная дата.
 */
export function formatFriendshipDate(value?: string): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(parsed)
    .replace(/\s*г\.$/, "");
}

/**
 * Строит резервную идентичность профиля по его id.
 *
 * Нужен, чтобы даже частично заполненный или отсутствующий профиль
 * выглядел в интерфейсе как осмысленная сущность, а не как пустой объект.
 *
 * @param {string | number} profileId Идентификатор профиля.
 * @returns {{ firstName: string; lastName: string; username: string }} Резервные данные профиля.
 */
export function getFallbackIdentity(profileId: string | number): {
  firstName: string;
  lastName: string;
  username: string;
} {
  const normalizedProfileId = normalizeProfileId(profileId);
  const rawParts = normalizedProfileId
    .split(/[-_]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const firstName = formatNamePart(rawParts[0] ?? "Новый");
  const lastName = formatNamePart(rawParts[1] ?? "пользователь");

  return {
    firstName,
    lastName,
    username: normalizedProfileId,
  };
}

/**
 * Преобразует локальную запись профиля в отображаемую модель страницы.
 *
 * @param {ProfileRecord} profile Исходная запись.
 * @param {boolean} isOwnProfile Открыт ли собственный профиль.
 * @returns {DisplayProfile} Модель для рендера.
 */
export function mapRecordToDisplayProfile(
  profile: ProfileRecord,
  isOwnProfile: boolean,
): DisplayProfile {
  const primaryEducation = profile.education[0];

  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    username: profile.username,
    status: profile.status,
    city: profile.city,
    nativeTown: profile.city,
    phone: profile.phone,
    email: profile.email,
    birthday: profile.birthday,
    gender: profile.gender,
    interests: profile.interests,
    favoriteMusic: profile.favoriteMusic,
    workCompany: profile.workCompany,
    workRole: profile.workRole,
    education: profile.education,
    friends: profile.friends
      .map((friendId) => getProfileRecordById(friendId))
      .filter((friend): friend is ProfileRecord => Boolean(friend))
      .map((friend) => ({
        profileId: String(friend.publicId),
        firstName: friend.firstName,
        lastName: friend.lastName,
        username: friend.username,
        status: "accepted" as const,
        avatarLink: friend.avatarLink,
      })),
    isOwnProfile,
    isApiBacked: false,
    avatarLink: profile.avatarLink,
    friendRelation: isOwnProfile ? "friend" : "none",
    friendshipCreatedAt: undefined,
    isMissingProfile: false,
    editable: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.status,
      gender:
        profile.gender.toLowerCase() === "мужской"
          ? "male"
          : profile.gender.toLowerCase() === "женский"
            ? "female"
            : "",
      birthdayDate: "",
      nativeTown: profile.city,
      town: profile.city,
      phone: profile.phone === "Не указано" ? "" : profile.phone,
      email: profile.email === "Не указано" ? "" : profile.email,
      interests: profile.interests,
      favMusic: profile.favoriteMusic,
      institution: primaryEducation?.place ?? "",
      group: primaryEducation?.subtitle ?? "",
      company: profile.workCompany,
      jobTitle: profile.workRole,
    },
  };
}

/**
 * Создаёт fallback-профиль, когда полных данных ещё нет.
 *
 * @param {string | number} profileId Идентификатор профиля.
 * @param {boolean} [useSessionIdentity=false] Нужно ли брать имя и аватар из активной сессии.
 * @returns {DisplayProfile} Временная модель профиля.
 */
export function createFallbackProfile(
  profileId: string | number,
  useSessionIdentity = false,
): DisplayProfile {
  const sessionUser = getSessionUser();
  const normalizedProfileId = normalizeProfileId(profileId);
  const generatedIdentity = getFallbackIdentity(profileId);
  const firstName =
    useSessionIdentity && sessionUser?.firstName
      ? sessionUser.firstName
      : generatedIdentity.firstName;
  const lastName =
    useSessionIdentity && sessionUser?.lastName ? sessionUser.lastName : generatedIdentity.lastName;
  const username =
    useSessionIdentity && sessionUser?.id
      ? normalizeProfileId(sessionUser.id)
      : generatedIdentity.username;

  return {
    id: normalizedProfileId,
    firstName,
    lastName,
    username,
    status: "Собираю профиль по частям, но уже открыт для общения и новых знакомств.",
    city: useSessionIdentity ? "Не указано" : "Москва",
    nativeTown: useSessionIdentity ? "Не указано" : "Москва",
    phone: useSessionIdentity ? "Не указано" : "+7 999 123-45-67",
    email: useSessionIdentity ? "Не указано" : `${username}@arisnet.dev`,
    birthday: useSessionIdentity ? "Не указано" : "12 марта 2001",
    gender: "Не указано",
    interests: "Технологии, дизайн продуктов, цифровые сообщества",
    favoriteMusic: "The xx, ODESZA, Kedr Livanskiy",
    workCompany: useSessionIdentity ? "ARISNET" : "ARISNET Community",
    workRole: "Участник сообщества",
    education: [
      {
        place: useSessionIdentity ? "Информация появится позже" : "МГТУ им. Н.Э. Баумана '24",
        subtitle: useSessionIdentity
          ? "Профиль еще заполняется"
          : "Информационные системы и технологии",
      },
    ],
    friends: [],
    isOwnProfile:
      useSessionIdentity && sessionUser ? normalizedProfileId === sessionUser.id : false,
    isApiBacked: useSessionIdentity && sessionUser ? true : false,
    avatarLink: sessionUser?.avatarLink,
    friendRelation: useSessionIdentity && sessionUser ? "friend" : "none",
    friendshipCreatedAt: undefined,
    isMissingProfile: false,
    editable: {
      firstName,
      lastName,
      bio: "Собираю профиль по частям, но уже открыт для общения и новых знакомств.",
      gender: "",
      birthdayDate: "",
      nativeTown: "",
      town: "",
      phone: "",
      email: "",
      interests: "Технологии, дизайн продуктов, цифровые сообщества",
      favMusic: "The xx, ODESZA, Kedr Livanskiy",
      institution: "",
      group: "",
      company: useSessionIdentity ? "ARISNET" : "ARISNET Community",
      jobTitle: "Участник сообщества",
    },
  };
}

/**
 * Создаёт модель отсутствующего профиля.
 *
 * @param {string} profileId Идентификатор профиля.
 * @returns {DisplayProfile} Профиль-заглушка для сценария 404/удаления.
 */
export function createMissingProfile(profileId: string): DisplayProfile {
  return {
    id: profileId,
    firstName: "",
    lastName: "",
    username: profileId,
    status: "Профиль не существует или был удален.",
    city: "",
    nativeTown: "",
    phone: "",
    email: "",
    birthday: "",
    gender: "",
    interests: "",
    favoriteMusic: "",
    workCompany: "",
    workRole: "",
    education: [],
    friends: [],
    isOwnProfile: false,
    isApiBacked: false,
    avatarLink: undefined,
    friendRelation: "none",
    friendshipCreatedAt: undefined,
    isMissingProfile: true,
    editable: {
      firstName: "",
      lastName: "",
      bio: "",
      gender: "",
      birthdayDate: "",
      nativeTown: "",
      town: "",
      phone: "",
      email: "",
      interests: "",
      favMusic: "",
      institution: "",
      group: "",
      company: "",
      jobTitle: "",
    },
  };
}

/**
 * Возвращает профиль из локальных моков или fallback-данных.
 *
 * @param {ProfileParams} params Параметры маршрута профиля.
 * @returns {DisplayProfile} Модель профиля для рендера.
 */
export function resolveMockProfile(params: ProfileParams): DisplayProfile {
  const sessionUser = getSessionUser();
  const profileId = params.id ?? sessionUser?.id ?? "profile";
  const ownProfileFallback =
    sessionUser && !params.id
      ? (() => {
          const fallback = createFallbackProfile(sessionUser.id, true);

          return {
            ...fallback,
            id: sessionUser.id,
            username: sessionUser.id,
            firstName: sessionUser.firstName,
            lastName: sessionUser.lastName,
            avatarLink: sessionUser.avatarLink,
            isOwnProfile: true,
            editable: {
              ...fallback.editable,
              firstName: sessionUser.firstName,
              lastName: sessionUser.lastName,
            },
          };
        })()
      : null;
  const profileRecord = params.id ? getProfileRecordById(profileId) : null;

  if (profileRecord) {
    return mapRecordToDisplayProfile(
      profileRecord,
      sessionUser ? profileId === sessionUser.id : false,
    );
  }

  if (params.id) {
    return createMissingProfile(profileId);
  }

  return ownProfileFallback ?? createFallbackProfile(profileId, !params.id);
}

/**
 * Преобразует API-ответ собственного профиля в отображаемую модель.
 *
 * @param {string} profileId Идентификатор профиля.
 * @param {ProfileResponse} data Ответ backend API.
 * @returns {DisplayProfile} Нормализованная модель профиля.
 */
export function createOwnProfileFromApi(profileId: string, data: ProfileResponse): DisplayProfile {
  const educationItem = data.education?.[0];
  const workItem = data.work?.[0];
  const birthdayDate = data.birthdayDate ?? data.birthday ?? data.dirthday ?? "";
  const bio = data.bio?.trim() ?? "";
  const genderValue = data.gender === "male" || data.gender === "female" ? data.gender : "";
  const firstName = data.firstName || "Имя";
  const lastName = data.lastName || "Фамилия";

  const apiAvatarLink = normaliseAvatarLink(data.imageLink);

  return {
    id: profileId,
    firstName,
    lastName,
    username: profileId,
    status: bio,
    city: valueOrFallback(data.town ?? ""),
    nativeTown: valueOrFallback(data.nativeTown ?? ""),
    phone: valueOrFallback(data.phone ?? ""),
    email: valueOrFallback(data.email ?? ""),
    birthday: valueOrFallback(normaliseDate(birthdayDate)),
    gender: formatGender(genderValue),
    interests: valueOrFallback(data.interests ?? ""),
    favoriteMusic: valueOrFallback(data.favMusic ?? ""),
    workCompany: valueOrFallback(workItem?.company ?? ""),
    workRole: valueOrFallback(workItem?.jobTitle ?? ""),
    education: [
      {
        place: valueOrFallback(educationItem?.institution ?? ""),
        subtitle: valueOrFallback(educationItem?.grade ?? ""),
      },
    ],
    friends: [],
    isOwnProfile: true,
    isApiBacked: true,
    avatarLink: resolveOwnAvatarLink(apiAvatarLink),
    friendRelation: "friend",
    friendshipCreatedAt: undefined,
    isMissingProfile: false,
    editable: {
      firstName,
      lastName,
      bio: data.bio ?? "",
      gender: genderValue,
      birthdayDate,
      nativeTown: data.nativeTown ?? "",
      town: data.town ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      interests: data.interests ?? "",
      favMusic: data.favMusic ?? "",
      institution: educationItem?.institution ?? "",
      group: educationItem?.grade ?? "",
      company: workItem?.company ?? "",
      jobTitle: workItem?.jobTitle ?? "",
    },
  };
}

/**
 * Преобразует API-ответ публичного профиля в отображаемую модель.
 *
 * @param {string} profileId Идентификатор профиля.
 * @param {ProfileResponse} data Ответ backend API.
 * @returns {DisplayProfile} Нормализованная модель профиля.
 */
export function createPublicProfileFromApi(
  profileId: string,
  data: ProfileResponse,
): DisplayProfile {
  const educationItem = data.education?.[0];
  const workItem = data.work?.[0];
  const birthdayDate = data.birthdayDate ?? data.birthday ?? data.dirthday ?? "";
  const bio = data.bio?.trim() ?? "";

  const apiAvatarLink = normaliseAvatarLink(data.imageLink);

  return {
    id: profileId,
    firstName: data.firstName || "Имя",
    lastName: data.lastName || "Фамилия",
    username: profileId,
    status: bio,
    city: valueOrFallback(data.town ?? ""),
    nativeTown: valueOrFallback(data.nativeTown ?? ""),
    phone: valueOrFallback(data.phone ?? ""),
    email: valueOrFallback(data.email ?? ""),
    birthday: valueOrFallback(normaliseDate(birthdayDate)),
    gender: formatGender(data.gender === "male" || data.gender === "female" ? data.gender : ""),
    interests: valueOrFallback(data.interests ?? ""),
    favoriteMusic: valueOrFallback(data.favMusic ?? ""),
    workCompany: valueOrFallback(workItem?.company ?? ""),
    workRole: valueOrFallback(workItem?.jobTitle ?? ""),
    education: [
      {
        place: valueOrFallback(educationItem?.institution ?? ""),
        subtitle: valueOrFallback(educationItem?.grade ?? ""),
      },
    ],
    friends: [],
    isOwnProfile: false,
    isApiBacked: true,
    avatarLink: apiAvatarLink,
    friendRelation: "none",
    friendshipCreatedAt: undefined,
    isMissingProfile: false,
    editable: {
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      bio: "",
      gender: "",
      birthdayDate: "",
      nativeTown: "",
      town: "",
      phone: "",
      email: "",
      interests: "",
      favMusic: "",
      institution: "",
      group: "",
      company: "",
      jobTitle: "",
    },
  };
}
