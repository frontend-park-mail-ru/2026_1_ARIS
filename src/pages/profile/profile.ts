import { renderHeader } from "../../components/header/header";
import { renderPostcard } from "../../components/postcard/postcard";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { createPrivateChat } from "../../api/chat";
import {
  acceptFriendRequest,
  declineFriendRequest,
  deleteFriend,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  getUserFriends,
  requestFriendship,
  revokeFriendRequest,
  type Friend,
} from "../../api/friends";
import {
  getMyProfile,
  getProfileById,
  updateMyProfile,
  type UpdateProfilePayload,
} from "../../api/profile";
import { getSessionUser, setSessionUser } from "../../state/session";
import {
  normalizeName,
  validateAlphabetConsistency,
  validateIsoBirthDate,
  validateName,
  validateOptionalEmail,
} from "../../utils/profile-validation";
import { renderFeed } from "../feed/feed";
import { invalidateFriendsState } from "../friends/friends";
import { getProfileRecordById, PROFILE_RECORDS, type ProfileRecord } from "./profile-data";

type ProfileParams = {
  id?: string;
};

type ProfileRoot = (Document | HTMLElement) & {
  __profileInteractionsBound?: boolean;
};

type ProfileFriendRelation = "friend" | "incoming" | "outgoing" | "none";

type EditableProfileFields = {
  firstName: string;
  lastName: string;
  bio: string;
  gender: "male" | "female" | "";
  birthdayDate: string;
  nativeTown: string;
  town: string;
  phone: string;
  email: string;
  interests: string;
  favMusic: string;
  institution: string;
  group: string;
  company: string;
  jobTitle: string;
};

type ProfileFieldErrorMap = Partial<Record<keyof EditableProfileFields, string>>;

type DisplayProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  status: string;
  city: string;
  nativeTown: string;
  phone: string;
  email: string;
  birthday: string;
  gender: string;
  interests: string;
  favoriteMusic: string;
  workCompany: string;
  workRole: string;
  education: Array<{
    place: string;
    subtitle: string;
  }>;
  friends: Friend[];
  isOwnProfile: boolean;
  isApiBacked: boolean;
  avatarLink: string | undefined;
  friendRelation: ProfileFriendRelation;
  friendshipCreatedAt?: string | undefined;
  editable: EditableProfileFields;
};

type ProfileFriendState = {
  relation: ProfileFriendRelation;
  friendshipCreatedAt?: string | undefined;
};

type ProfilePost = {
  id: string;
  text: string;
  time: string;
  likes: number;
  reposts: number;
  comments: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatNamePart(value: string): string {
  if (!value) return "";

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function normalizeProfileId(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function valueOrFallback(value: string, fallback = "Не указано"): string {
  return value.trim() || fallback;
}

function hasVisibleValue(value?: string): boolean {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  return trimmed !== "" && trimmed !== "Не указано";
}

function normaliseDate(value?: string): string {
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

function formatFriendshipDate(value?: string): string {
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

function formatGender(value: EditableProfileFields["gender"]): string {
  if (value === "male") return "Мужской";
  if (value === "female") return "Женский";
  return "Не указано";
}

function validateProfilePatch(
  patch: UpdateProfilePayload,
  sourceValues: EditableProfileFields,
): ProfileFieldErrorMap {
  const firstName = patch.firstName ?? sourceValues.firstName;
  const lastName = patch.lastName ?? sourceValues.lastName;
  const birthdayDate = patch.birthdayDate ?? sourceValues.birthdayDate;
  const gender = patch.gender ?? sourceValues.gender;
  const errors: ProfileFieldErrorMap = {};

  const firstNameError = validateName(firstName, "Имя", true);
  if (firstNameError) {
    errors.firstName = firstNameError;
  }

  const lastNameError = validateName(lastName, "Фамилия", true);
  if (lastNameError) {
    errors.lastName = lastNameError;
  }

  const alphabetError = validateAlphabetConsistency(firstName, lastName);
  if (alphabetError && !errors.firstName && !errors.lastName) {
    errors.lastName = alphabetError;
  }

  if (!birthdayDate) {
    errors.birthdayDate = "Обязательное поле";
  }

  const birthdayError = validateIsoBirthDate(birthdayDate);
  if (birthdayError) {
    errors.birthdayDate = birthdayError;
  }

  if (!gender) {
    errors.gender = "Обязательное поле";
  }

  const emailError = validateOptionalEmail(patch.email ?? "");
  if (emailError) {
    errors.email = emailError;
  }

  return errors;
}

function hasProfileFieldErrors(errors: ProfileFieldErrorMap): boolean {
  return Object.values(errors).some(Boolean);
}

function renderEditorFieldError(name: keyof EditableProfileFields): string {
  return `
    <p class="profile-editor__field-error profile-editor__field-error--hidden" data-profile-field-error="${name}">
      ${" "}
    </p>
  `;
}

function clearProfileFieldErrors(form: HTMLFormElement): void {
  const errorNodes = form.querySelectorAll<HTMLElement>("[data-profile-field-error]");
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    ".profile-editor__input, .profile-editor__textarea",
  );

  errorNodes.forEach((node) => {
    node.textContent = " ";
    node.classList.add("profile-editor__field-error--hidden");
  });

  fields.forEach((field) => {
    field.classList.remove("profile-editor__control--error");
  });
}

function renderProfileFieldErrors(form: HTMLFormElement, errors: ProfileFieldErrorMap): void {
  clearProfileFieldErrors(form);

  (Object.entries(errors) as Array<[keyof EditableProfileFields, string]>).forEach(
    ([name, message]) => {
      if (!message) {
        return;
      }

      const errorNode = form.querySelector<HTMLElement>(`[data-profile-field-error="${name}"]`);
      const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[name="${name}"]`,
      );

      if (errorNode) {
        errorNode.textContent = message;
        errorNode.classList.remove("profile-editor__field-error--hidden");
      }

      if (field) {
        field.classList.add("profile-editor__control--error");
      }
    },
  );
}

function focusFirstProfileErrorField(form: HTMLFormElement, errors: ProfileFieldErrorMap): void {
  const firstErrorFieldName = (
    Object.entries(errors) as Array<[keyof EditableProfileFields, string]>
  ).find(([, message]) => Boolean(message))?.[0];

  if (!firstErrorFieldName) {
    return;
  }

  const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    `[name="${firstErrorFieldName}"]`,
  );

  if (!field) {
    return;
  }

  field.focus({ preventScroll: true });
  field.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

function getFallbackIdentity(profileId: string | number): {
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

function mapRecordToDisplayProfile(profile: ProfileRecord, isOwnProfile: boolean): DisplayProfile {
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

function createFallbackProfile(
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

function resolveMockProfile(params: ProfileParams): DisplayProfile {
  const sessionUser = getSessionUser();
  const profileId = params.id ?? sessionUser?.id ?? PROFILE_RECORDS[0]?.id ?? "profile";
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
  const profileRecord = getProfileRecordById(profileId);

  if (profileRecord) {
    return mapRecordToDisplayProfile(
      profileRecord,
      sessionUser ? profileId === sessionUser.id : false,
    );
  }

  return ownProfileFallback ?? createFallbackProfile(profileId, !params.id);
}

function createOwnProfileFromApi(
  profileId: string,
  data: Awaited<ReturnType<typeof getMyProfile>>,
): DisplayProfile {
  const educationItem = data.education?.[0];
  const workItem = data.work?.[0];
  const birthdayDate = data.birthdayDate ?? data.birthday ?? data.dirthday ?? "";
  const bio = data.bio?.trim() ?? "";
  const genderValue = data.gender === "male" || data.gender === "female" ? data.gender : "";
  const firstName = data.firstName || "Имя";
  const lastName = data.lastName || "Фамилия";

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
    avatarLink: data.imageLink || getSessionUser()?.avatarLink,
    friendRelation: "friend",
    friendshipCreatedAt: undefined,
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

function createPublicProfileFromApi(
  profileId: string,
  data: Awaited<ReturnType<typeof getProfileById>>,
): DisplayProfile {
  const educationItem = data.education?.[0];
  const workItem = data.work?.[0];
  const birthdayDate = data.birthdayDate ?? data.birthday ?? data.dirthday ?? "";
  const bio = data.bio?.trim() ?? "";

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
    avatarLink: data.imageLink,
    friendRelation: "none",
    friendshipCreatedAt: undefined,
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

async function resolveProfileFriendState(profileId: string): Promise<ProfileFriendState> {
  try {
    const [friends, incoming, outgoing] = await Promise.all([
      getFriends("accepted"),
      getIncomingFriendRequests("pending"),
      getOutgoingFriendRequests("pending"),
    ]);

    const acceptedFriend = friends.find((friend) => friend.profileId === profileId);
    if (acceptedFriend) {
      return {
        relation: "friend",
        friendshipCreatedAt: acceptedFriend.createdAt,
      };
    }

    if (incoming.some((friend) => friend.profileId === profileId)) {
      return { relation: "incoming" };
    }

    if (outgoing.some((friend) => friend.profileId === profileId)) {
      return { relation: "outgoing" };
    }
  } catch (error) {
    console.error("[profile] source=api scope=friends failed id=%s", profileId, error);
  }

  return { relation: "none" };
}

async function resolveProfile(params: ProfileParams): Promise<DisplayProfile> {
  const sessionUser = getSessionUser();
  const requestedId = params.id ?? sessionUser?.id ?? PROFILE_RECORDS[0]?.id ?? "profile";
  const isOwnProfile = !params.id || params.id === sessionUser?.id;

  if (sessionUser && isOwnProfile) {
    try {
      const profileData = await getMyProfile();
      console.info("[profile] source=api scope=me id=%s", sessionUser.id, profileData);
      const profile = createOwnProfileFromApi(sessionUser.id, profileData);
      profile.friends = await getFriends("accepted");
      return profile;
    } catch (error) {
      console.error("[profile] source=api scope=me failed id=%s", sessionUser.id, error);
    }
  }

  if (!isOwnProfile) {
    try {
      const profileData = await getProfileById(requestedId);
      console.info("[profile] source=api scope=public id=%s", requestedId, profileData);
      const profile = createPublicProfileFromApi(requestedId, profileData);
      const [friends, friendState] = await Promise.all([
        getUserFriends(requestedId),
        resolveProfileFriendState(requestedId),
      ]);
      profile.friends = friends;
      profile.friendRelation = friendState.relation;
      profile.friendshipCreatedAt = friendState.friendshipCreatedAt;
      return profile;
    } catch (error) {
      console.error("[profile] source=api scope=public failed id=%s", requestedId, error);
    }
  }

  console.warn("[profile] source=fallback id=%s", requestedId);
  return resolveMockProfile(params);
}

function renderAvatar(profile: DisplayProfile, className: string): string {
  if (profile.avatarLink) {
    return `
      <img
        class="${className}"
        src="/image-proxy?url=${encodeURIComponent(profile.avatarLink)}"
        alt="${escapeHtml(`${profile.firstName} ${profile.lastName}`)}"
      >
    `;
  }

  return `
    <div class="${className} ${className}--placeholder" aria-hidden="true">
      ${escapeHtml(getInitials(profile.firstName, profile.lastName))}
    </div>
  `;
}

function renderSection(title: string, content: string, action = ""): string {
  if (!content.trim()) {
    return "";
  }

  return `
    <section class="profile-section">
      <header class="profile-section__header">
        <h2 class="profile-section__title">${escapeHtml(title)}</h2>
        ${action}
      </header>
      <div class="profile-section__body">
        ${content}
      </div>
    </section>
  `;
}

function renderProfileFriendActions(profile: DisplayProfile): string {
  if (profile.isOwnProfile || !profile.isApiBacked) {
    return "";
  }

  const messageButton = `
    <button
      type="button"
      class="profile-friend-action profile-friend-action--secondary"
      data-profile-open-chat="${escapeHtml(profile.id)}"
    >
      Сообщение
    </button>
  `;

  if (profile.friendRelation === "friend") {
    return `
      <div class="profile-friend-actions">
        ${messageButton}
        <button
          type="button"
          class="profile-friend-action profile-friend-action--danger"
          data-profile-delete-friend="${escapeHtml(profile.id)}"
        >
          Удалить из друзей
        </button>
      </div>
    `;
  }

  if (profile.friendRelation === "incoming") {
    return `
      <div class="profile-friend-actions">
        ${messageButton}
        <button
          type="button"
          class="profile-friend-action profile-friend-action--primary"
          data-profile-accept-friend="${escapeHtml(profile.id)}"
        >
          Принять в друзья
        </button>
        <button
          type="button"
          class="profile-friend-action profile-friend-action--danger"
          data-profile-decline-friend="${escapeHtml(profile.id)}"
        >
          Отклонить
        </button>
      </div>
    `;
  }

  if (profile.friendRelation === "outgoing") {
    return `
      <div class="profile-friend-actions">
        ${messageButton}
        <div class="profile-friend-request-state">
          <span>Запрос отправлен.</span>
          <button
            type="button"
            class="profile-friend-request-cancel"
            data-profile-revoke-friend="${escapeHtml(profile.id)}"
          >
            Отменить
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="profile-friend-actions">
      ${messageButton}
      <button
        type="button"
        class="profile-friend-action profile-friend-action--primary"
        data-profile-request-friend="${escapeHtml(profile.id)}"
      >
        Добавить в друзья
      </button>
    </div>
  `;
}

function renderDeleteFriendModal(profile: DisplayProfile): string {
  if (profile.isOwnProfile || profile.friendRelation !== "friend") {
    return "";
  }

  const friendName = `${profile.firstName} ${profile.lastName}`.trim() || profile.username;
  const friendshipDate = formatFriendshipDate(profile.friendshipCreatedAt);
  const friendshipCopy = friendshipDate ? `Вы в друзьях с ${friendshipDate} года` : "";

  return `
    <div class="profile-delete-modal" data-profile-delete-modal hidden>
      <section
        class="profile-delete-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Удалить из друзей"
      >
        <header class="profile-delete-modal__header">
          <h2 class="profile-delete-modal__title">Удалить из друзей</h2>
          <button
            type="button"
            class="profile-delete-modal__close"
            data-profile-delete-modal-close
            aria-label="Закрыть"
          >
            [X]
          </button>
        </header>

        <div class="profile-delete-modal__identity">
          ${renderAvatar(profile, "profile-delete-modal__avatar")}
          <p class="profile-delete-modal__name">${escapeHtml(friendName)}</p>
        </div>

        <p class="profile-delete-modal__text">
          Вы действительно хотите удалить этого пользователя из друзей?
        </p>

        ${
          friendshipCopy
            ? `<p class="profile-delete-modal__hint">${escapeHtml(friendshipCopy)}</p>`
            : ""
        }

        <div class="profile-delete-modal__actions">
          <button
            type="button"
            class="profile-delete-modal__button profile-delete-modal__button--primary"
            data-profile-confirm-delete="${escapeHtml(profile.id)}"
          >
            Удалить из друзей
          </button>
          <button
            type="button"
            class="profile-delete-modal__button"
            data-profile-delete-modal-close
          >
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

function getProfilePosts(profile: DisplayProfile): ProfilePost[] {
  return [
    {
      id: `${profile.id}-intro`,
      text: `${profile.status}

Сейчас больше всего внимания уделяю задачам на стыке продукта и интерфейсов. Люблю, когда в решении есть и чистая логика, и нормальное визуальное ощущение от страницы.`,
      time: "1 д назад",
      likes: 324000,
      reposts: 167000,
      comments: 88,
    },
    {
      id: `${profile.id}-details`,
      text: `Сейчас фокус на направлениях: ${profile.interests}. В работе особенно интересно выстраивать понятные сценарии и не перегружать экран лишними деталями.

Из того, что постоянно играет в наушниках: ${profile.favoriteMusic}.`,
      time: "3 д назад",
      likes: 91000,
      reposts: 12000,
      comments: 24,
    },
  ];
}

function renderInfoRows(profile: DisplayProfile): string {
  const rows = [
    hasVisibleValue(profile.gender)
      ? `
        <div class="profile-info-grid__row">
          <dt>Пол</dt>
          <dd>${escapeHtml(profile.gender)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.birthday)
      ? `
        <div class="profile-info-grid__row">
          <dt>День рождения</dt>
          <dd>${escapeHtml(profile.birthday)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.phone)
      ? `
        <div class="profile-info-grid__row">
          <dt>Телефон</dt>
          <dd>${escapeHtml(profile.phone)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.email)
      ? `
        <div class="profile-info-grid__row">
          <dt>Email</dt>
          <dd>${escapeHtml(profile.email)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.city)
      ? `
        <div class="profile-info-grid__row">
          <dt>Город</dt>
          <dd>${escapeHtml(profile.city)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.nativeTown)
      ? `
        <div class="profile-info-grid__row">
          <dt>Родной город</dt>
          <dd>${escapeHtml(profile.nativeTown)}</dd>
        </div>
      `
      : "",
  ]
    .filter(Boolean)
    .join("");

  if (!rows) {
    return "";
  }

  return `
    <div class="profile-info-grid">
      ${rows}
    </div>
  `;
}

function renderEducation(profile: DisplayProfile): string {
  const items = profile.education.filter(
    (item) => hasVisibleValue(item.place) || hasVisibleValue(item.subtitle),
  );

  if (!items.length) {
    return "";
  }

  return `
    <div class="profile-stack">
      ${items
        .map(
          (item) => `
            <article class="profile-stack__item">
              ${hasVisibleValue(item.place) ? `<h3>${escapeHtml(item.place)}</h3>` : ""}
              ${hasVisibleValue(item.subtitle) ? `<p>${escapeHtml(item.subtitle)}</p>` : ""}
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderWork(profile: DisplayProfile): string {
  const hasCompany = hasVisibleValue(profile.workCompany);
  const hasRole = hasVisibleValue(profile.workRole);

  if (!hasCompany && !hasRole) {
    return "";
  }

  return `
    <div class="profile-stack">
      <article class="profile-stack__item">
        ${hasCompany ? `<h3>${escapeHtml(profile.workCompany)}</h3>` : ""}
        ${hasRole ? `<p>${escapeHtml(profile.workRole)}</p>` : ""}
      </article>
    </div>
  `;
}

function renderPersonal(profile: DisplayProfile): string {
  const rows = [
    hasVisibleValue(profile.status)
      ? `
        <div class="profile-info-grid__row">
          <dt>О себе</dt>
          <dd>${escapeHtml(profile.status)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.interests)
      ? `
        <div class="profile-info-grid__row">
          <dt>Интересы</dt>
          <dd>${escapeHtml(profile.interests)}</dd>
        </div>
      `
      : "",
    hasVisibleValue(profile.favoriteMusic)
      ? `
        <div class="profile-info-grid__row">
          <dt>Любимая музыка</dt>
          <dd>${escapeHtml(profile.favoriteMusic)}</dd>
        </div>
      `
      : "",
  ]
    .filter(Boolean)
    .join("");

  if (!rows) {
    return "";
  }

  return `
    <div class="profile-info-grid">
      ${rows}
    </div>
  `;
}

function renderFriends(profile: DisplayProfile): string {
  const friends = profile.friends;
  const previewCount = 6;
  const hasMoreFriends = friends.length > previewCount;
  const title = profile.isOwnProfile ? "Друзья" : "Друзья этого пользователя";
  const countMarkup =
    friends.length > 0
      ? `<span class="profile-friends-card__count">(${friends.length})</span>`
      : "";

  return `
    <section class="profile-friends-card">
      <div class="profile-friends-card__header">
        <h2>
          ${title}
          ${countMarkup}
        </h2>
      </div>

      ${
        friends.length
          ? `
            <div class="profile-friends-card__list">
              ${friends
                .slice(0, previewCount)
                .map(
                  (friend) => `
                    <a
                      href="/id${encodeURIComponent(friend.profileId)}"
                      data-link
                      class="profile-friend"
                    >
                      <img
                        class="profile-friend__avatar"
                        src="${
                          friend.avatarLink
                            ? `/image-proxy?url=${encodeURIComponent(friend.avatarLink)}`
                            : "/assets/img/default-avatar.png"
                        }"
                        alt="${escapeHtml(`${friend.firstName} ${friend.lastName}`)}"
                      >
                      <div class="profile-friend__content">
                        <strong>${escapeHtml(`${friend.firstName} ${friend.lastName}`)}</strong>
                      </div>
                    </a>
                  `,
                )
                .join("")}
            </div>
          `
          : `<p class="profile-empty-copy">Друзей пока нет</p>`
      }

      ${
        hasMoreFriends
          ? `
            <footer class="profile-friends-card__footer">
              <a
                href="/friends"
                data-link
                class="profile-friends-card__more"
              >
                показать всех
              </a>
            </footer>
          `
          : ""
      }
    </section>
  `;
}

function renderProfilePosts(profile: DisplayProfile): string {
  const posts = getProfilePosts(profile);

  return `
    <section class="profile-posts" id="profile-posts">
      <header class="profile-posts__header">
        <h2>Публикации</h2>
      </header>

      ${posts
        .map((post) =>
          renderPostcard({
            id: post.id,
            authorId: profile.id,
            author: profile.username,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatar: profile.avatarLink ?? "/assets/img/default-avatar.png",
            text: post.text,
            time: post.time,
            likes: post.likes,
            comments: post.comments,
            reposts: post.reposts,
            images: [],
          }),
        )
        .join("")}
    </section>
  `;
}

function renderEditorTextField(
  name: keyof EditableProfileFields,
  label: string,
  value: string,
  options: {
    type?: "text" | "email" | "tel" | "date";
    inputMode?: "text" | "email" | "tel";
    placeholder?: string;
  } = {},
): string {
  return `
    <label class="profile-editor__field">
      <span>${escapeHtml(label)}</span>
      <input
        class="profile-editor__input"
        type="${options.type ?? "text"}"
        name="${name}"
        value="${escapeHtml(value)}"
        inputmode="${escapeHtml(options.inputMode ?? options.type ?? "text")}"
        placeholder="${escapeHtml(options.placeholder ?? "")}"
      >
      ${renderEditorFieldError(name)}
    </label>
  `;
}

function renderEditorTextarea(
  name: keyof EditableProfileFields,
  label: string,
  value: string,
  placeholder = "",
): string {
  return `
    <label class="profile-editor__field profile-editor__field--wide">
      <span>${escapeHtml(label)}</span>
      <textarea
        class="profile-editor__textarea"
        name="${name}"
        rows="4"
        placeholder="${escapeHtml(placeholder)}"
      >${escapeHtml(value)}</textarea>
      ${renderEditorFieldError(name)}
    </label>
  `;
}

function renderProfileEditor(profile: DisplayProfile): string {
  if (!profile.isOwnProfile) {
    return "";
  }

  return `
    <section class="profile-editor" data-profile-editor hidden>
      <form class="profile-editor__form" data-profile-edit-form novalidate>
        <div class="profile-editor__intro">
          <h2>Редактирование профиля</h2>
          <p>Отправим только изменённые поля. Остальное останется как есть.</p>
        </div>

        <div class="profile-editor__grid">
          ${renderEditorTextField("firstName", "Имя", profile.editable.firstName)}
          ${renderEditorTextField("lastName", "Фамилия", profile.editable.lastName)}
          ${renderEditorTextField("email", "Email", profile.editable.email, {
            type: "text",
            inputMode: "email",
            placeholder: "mail@example.com",
          })}
          ${renderEditorTextField("phone", "Телефон", profile.editable.phone, {
            type: "tel",
          })}
          ${renderEditorTextField("town", "Текущий город", profile.editable.town)}
          ${renderEditorTextField("nativeTown", "Родной город", profile.editable.nativeTown)}
          ${renderEditorTextField("birthdayDate", "Дата рождения", profile.editable.birthdayDate, {
            type: "date",
          })}

          <label class="profile-editor__field">
            <span>Пол</span>
            <select class="profile-editor__input" name="gender">
              <option value="male" ${profile.editable.gender === "male" ? "selected" : ""}>Мужской</option>
              <option value="female" ${profile.editable.gender === "female" ? "selected" : ""}>Женский</option>
            </select>
            ${renderEditorFieldError("gender")}
          </label>

          ${renderEditorTextField("institution", "Учебное заведение", profile.editable.institution)}
          ${renderEditorTextField("group", "Группа / курс", profile.editable.group)}
          ${renderEditorTextField("company", "Компания", profile.editable.company)}
          ${renderEditorTextField("jobTitle", "Роль / должность", profile.editable.jobTitle)}
          ${renderEditorTextarea("bio", "О себе", profile.editable.bio, "Коротко о себе")}
          ${renderEditorTextarea(
            "interests",
            "Интересы",
            profile.editable.interests,
            "Что тебе действительно интересно",
          )}
          ${renderEditorTextarea(
            "favMusic",
            "Любимая музыка",
            profile.editable.favMusic,
            "Артисты, жанры, плейлисты",
          )}
        </div>

        <p class="profile-editor__message" data-profile-form-message hidden></p>

        <div class="profile-editor__actions">
          <button type="submit" class="profile-editor__button profile-editor__button--primary">
            Сохранить изменения
          </button>
          <button
            type="button"
            class="profile-editor__button"
            data-profile-edit-cancel
          >
            Отмена
          </button>
        </div>
      </form>
    </section>
  `;
}

export async function renderProfile(params: ProfileParams = {}): Promise<string> {
  const isAuthorised = getSessionUser() !== null;

  if (!isAuthorised) {
    return renderFeed();
  }

  const profile = await resolveProfile(params);
  const profileInfoAction = profile.isOwnProfile
    ? `
        <button type="button" class="profile-section__action-button" data-profile-edit-toggle>
          редактировать
        </button>
      `
    : "";

  return `
    <div class="app-page">
      ${renderHeader()}

      <main class="app-layout">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised })}
        </aside>

        <section class="app-layout__center">
          <section class="profile-page">
            <article class="profile-card">
              <header class="profile-card__hero">
                ${renderAvatar(profile, "profile-card__avatar")}

                <div class="profile-card__hero-copy">
                  ${profile.isOwnProfile ? '<div class="profile-card__eyebrow">Мой профиль</div>' : ""}
                  <h1>${escapeHtml(`${profile.firstName} ${profile.lastName}`)}</h1>
                  ${hasVisibleValue(profile.status) ? `<p>${escapeHtml(profile.status)}</p>` : ""}
                  ${renderProfileFriendActions(profile)}
                </div>
              </header>

              <div class="profile-card__details">
                ${renderSection("Информация", renderInfoRows(profile), profileInfoAction)}

                <div class="profile-card__more" hidden>
                  ${renderSection("Образование", renderEducation(profile))}
                  ${renderSection("Место работы", renderWork(profile))}
                  ${renderSection("Личная информация", renderPersonal(profile))}
                </div>

                <button type="button" class="profile-card__toggle" data-profile-toggle aria-expanded="false">
                  показать подробнее
                </button>
              </div>
            </article>

            ${renderProfileEditor(profile)}

            <a href="#profile-posts" class="profile-composer" data-profile-anchor>
              + Написать пост
            </a>

            ${renderProfilePosts(profile)}
          </section>
        </section>

        <aside class="app-layout__right">
          <div class="profile-right-rail">
            ${renderFriends(profile)}
          </div>
        </aside>
      </main>

      ${renderDeleteFriendModal(profile)}
    </div>
  `;
}

function readFieldValue(formData: FormData, name: keyof EditableProfileFields): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getDefaultFieldValue(form: HTMLFormElement, name: keyof EditableProfileFields): string {
  const field = form.querySelector(`[name="${name}"]`);

  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    return field.defaultValue.trim();
  }

  if (field instanceof HTMLSelectElement) {
    return field.value.trim();
  }

  return "";
}

function buildProfilePatch(
  formData: FormData,
  sourceValues: EditableProfileFields,
): UpdateProfilePayload {
  const nextValues: EditableProfileFields = {
    firstName: normalizeName(readFieldValue(formData, "firstName")),
    lastName: normalizeName(readFieldValue(formData, "lastName")),
    bio: readFieldValue(formData, "bio"),
    gender: readFieldValue(formData, "gender") as EditableProfileFields["gender"],
    birthdayDate: readFieldValue(formData, "birthdayDate"),
    nativeTown: readFieldValue(formData, "nativeTown"),
    town: readFieldValue(formData, "town"),
    phone: readFieldValue(formData, "phone"),
    email: readFieldValue(formData, "email"),
    interests: readFieldValue(formData, "interests"),
    favMusic: readFieldValue(formData, "favMusic"),
    institution: readFieldValue(formData, "institution"),
    group: readFieldValue(formData, "group"),
    company: readFieldValue(formData, "company"),
    jobTitle: readFieldValue(formData, "jobTitle"),
  };

  const patch: UpdateProfilePayload = {};

  (Object.keys(nextValues) as Array<keyof EditableProfileFields>).forEach((key) => {
    if (nextValues[key] === sourceValues[key]) {
      return;
    }

    if (key === "gender") {
      if (nextValues.gender) {
        patch.gender = nextValues.gender;
      }

      return;
    }

    patch[key] = nextValues[key];
  });

  return patch;
}

function getProfileFormSourceValues(form: HTMLFormElement): EditableProfileFields {
  return {
    firstName: getDefaultFieldValue(form, "firstName"),
    lastName: getDefaultFieldValue(form, "lastName"),
    bio: getDefaultFieldValue(form, "bio"),
    gender: getDefaultFieldValue(form, "gender") as EditableProfileFields["gender"],
    birthdayDate: getDefaultFieldValue(form, "birthdayDate"),
    nativeTown: getDefaultFieldValue(form, "nativeTown"),
    town: getDefaultFieldValue(form, "town"),
    phone: getDefaultFieldValue(form, "phone"),
    email: getDefaultFieldValue(form, "email"),
    interests: getDefaultFieldValue(form, "interests"),
    favMusic: getDefaultFieldValue(form, "favMusic"),
    institution: getDefaultFieldValue(form, "institution"),
    group: getDefaultFieldValue(form, "group"),
    company: getDefaultFieldValue(form, "company"),
    jobTitle: getDefaultFieldValue(form, "jobTitle"),
  };
}

function validateProfileFormLive(form: HTMLFormElement): void {
  const sourceValues = getProfileFormSourceValues(form);
  const patch = buildProfilePatch(new FormData(form), sourceValues);
  const errors = validateProfilePatch(patch, sourceValues);

  if (hasProfileFieldErrors(errors)) {
    renderProfileFieldErrors(form, errors);
    return;
  }

  clearProfileFieldErrors(form);
}

function toggleProfileEditor(root: ParentNode, forceExpanded?: boolean): void {
  const editor = root.querySelector("[data-profile-editor]");
  const button = root.querySelector("[data-profile-edit-toggle]");

  if (!(editor instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
    return;
  }

  const isExpanded = forceExpanded ?? editor.hidden;
  editor.hidden = !isExpanded;
  button.textContent = isExpanded ? "скрыть форму" : "редактировать";
  button.setAttribute("aria-expanded", String(isExpanded));
}

async function rerenderCurrentRoute(): Promise<void> {
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function initProfileToggle(root: Document | HTMLElement = document): void {
  const bindableRoot = root as ProfileRoot;

  if (bindableRoot.__profileInteractionsBound) {
    return;
  }

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openChatButton = target.closest("[data-profile-open-chat]");
    if (openChatButton instanceof HTMLButtonElement) {
      const profileId = openChatButton.getAttribute("data-profile-open-chat");
      if (!profileId) {
        return;
      }

      void createPrivateChat(profileId)
        .then((chat) => {
          window.history.pushState({}, "", `/chats?chatId=${encodeURIComponent(chat.id)}`);
          window.dispatchEvent(new PopStateEvent("popstate"));
        })
        .catch((error: unknown) => {
          console.error("[profile] open chat failed", error);
        });
      return;
    }

    const requestFriendButton = target.closest("[data-profile-request-friend]");
    if (requestFriendButton instanceof HTMLButtonElement) {
      const profileId = requestFriendButton.getAttribute("data-profile-request-friend");
      if (!profileId) {
        return;
      }

      requestFriendButton.disabled = true;
      void requestFriendship(profileId)
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          console.error("[profile] request friend failed", error);
          requestFriendButton.disabled = false;
        });
      return;
    }

    const revokeFriendButton = target.closest("[data-profile-revoke-friend]");
    if (revokeFriendButton instanceof HTMLButtonElement) {
      const profileId = revokeFriendButton.getAttribute("data-profile-revoke-friend");
      if (!profileId) {
        return;
      }

      revokeFriendButton.disabled = true;
      void revokeFriendRequest(profileId)
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          console.error("[profile] revoke friend request failed", error);
          revokeFriendButton.disabled = false;
        });
      return;
    }

    const acceptFriendButton = target.closest("[data-profile-accept-friend]");
    if (acceptFriendButton instanceof HTMLButtonElement) {
      const profileId = acceptFriendButton.getAttribute("data-profile-accept-friend");
      if (!profileId) {
        return;
      }

      acceptFriendButton.disabled = true;
      void acceptFriendRequest(profileId)
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          console.error("[profile] accept friend failed", error);
          acceptFriendButton.disabled = false;
        });
      return;
    }

    const declineFriendButton = target.closest("[data-profile-decline-friend]");
    if (declineFriendButton instanceof HTMLButtonElement) {
      const profileId = declineFriendButton.getAttribute("data-profile-decline-friend");
      if (!profileId) {
        return;
      }

      declineFriendButton.disabled = true;
      void declineFriendRequest(profileId)
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          console.error("[profile] decline friend failed", error);
          declineFriendButton.disabled = false;
        });
      return;
    }

    const deleteFriendButton = target.closest("[data-profile-delete-friend]");
    if (deleteFriendButton instanceof HTMLButtonElement) {
      const deleteModal = root.querySelector("[data-profile-delete-modal]");
      if (!(deleteModal instanceof HTMLElement)) {
        return;
      }

      deleteModal.hidden = false;
      return;
    }

    const closeDeleteModalButton = target.closest("[data-profile-delete-modal-close]");
    const deleteModalBackdrop = target.closest("[data-profile-delete-modal]");
    if (closeDeleteModalButton instanceof HTMLButtonElement || deleteModalBackdrop === target) {
      const deleteModal = root.querySelector("[data-profile-delete-modal]");
      if (deleteModal instanceof HTMLElement) {
        deleteModal.hidden = true;
      }
      return;
    }

    const confirmDeleteButton = target.closest("[data-profile-confirm-delete]");
    if (confirmDeleteButton instanceof HTMLButtonElement) {
      const profileId = confirmDeleteButton.getAttribute("data-profile-confirm-delete");
      if (!profileId) {
        return;
      }

      confirmDeleteButton.disabled = true;
      void deleteFriend(profileId)
        .then(async () => {
          invalidateFriendsState();
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          console.error("[profile] delete friend failed", error);
          confirmDeleteButton.disabled = false;
        });
      return;
    }

    const button = target.closest("[data-profile-toggle]");
    if (!(button instanceof HTMLButtonElement)) return;

    const card = button.closest(".profile-card");
    if (!(card instanceof HTMLElement)) return;

    const more = card.querySelector(".profile-card__more");
    if (!(more instanceof HTMLElement)) return;

    const isExpanded = button.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;

    more.hidden = !nextExpanded;
    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? "свернуть" : "показать подробнее";
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("[data-friends-toggle]");
    if (!(button instanceof HTMLButtonElement)) return;

    const card = button.closest(".profile-friends-card");
    if (!(card instanceof HTMLElement)) return;

    const hiddenFriends = card.querySelectorAll<HTMLElement>("[data-friend-extra]");
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;

    hiddenFriends.forEach((friend) => {
      friend.hidden = !nextExpanded;
    });

    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? "свернуть" : "показать всех";
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const editButton = target.closest("[data-profile-edit-toggle]");
    if (editButton instanceof HTMLButtonElement) {
      toggleProfileEditor(root);
      return;
    }

    const cancelButton = target.closest("[data-profile-edit-cancel]");
    if (!(cancelButton instanceof HTMLButtonElement)) return;

    const form = cancelButton.closest("[data-profile-edit-form]");

    if (!(form instanceof HTMLFormElement)) return;

    form.reset();
    clearProfileFieldErrors(form);
    toggleProfileEditor(root, false);

    const message = form.querySelector("[data-profile-form-message]");
    if (message instanceof HTMLElement) {
      message.hidden = true;
      message.textContent = "";
      message.classList.remove("is-error", "is-success");
    }
  });

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;
    if (!target.matches("[data-profile-edit-form]")) return;

    event.preventDefault();

    const submitButton = target.querySelector('button[type="submit"]');
    const message = target.querySelector("[data-profile-form-message]");

    if (!(submitButton instanceof HTMLButtonElement) || !(message instanceof HTMLElement)) {
      return;
    }

    const sourceValues = getProfileFormSourceValues(target);

    const patch = buildProfilePatch(new FormData(target), sourceValues);
    clearProfileFieldErrors(target);

    if (!Object.keys(patch).length) {
      message.hidden = false;
      message.textContent = "Изменений пока нет.";
      message.classList.remove("is-error");
      message.classList.add("is-success");
      return;
    }

    const validationErrors = validateProfilePatch(patch, sourceValues);
    if (hasProfileFieldErrors(validationErrors)) {
      renderProfileFieldErrors(target, validationErrors);
      focusFirstProfileErrorField(target, validationErrors);
      message.hidden = true;
      message.textContent = "";
      message.classList.remove("is-error", "is-success");
      return;
    }

    message.hidden = true;
    message.textContent = "";
    message.classList.remove("is-error", "is-success");
    submitButton.disabled = true;
    submitButton.textContent = "Сохраняем...";

    void updateMyProfile(patch)
      .then(async () => {
        const sessionUser = getSessionUser();

        if (sessionUser) {
          setSessionUser({
            ...sessionUser,
            firstName: patch.firstName ?? sessionUser.firstName,
            lastName: patch.lastName ?? sessionUser.lastName,
          });
        }

        await rerenderCurrentRoute();
      })
      .catch((error: unknown) => {
        message.hidden = false;
        message.textContent =
          error instanceof Error ? error.message : "Не получилось сохранить изменения.";
        message.classList.remove("is-success");
        message.classList.add("is-error");
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Сохранить изменения";
      });
  });

  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    const form = target.closest("[data-profile-edit-form]");
    if (!(form instanceof HTMLFormElement)) return;

    const message = form.querySelector("[data-profile-form-message]");
    if (message instanceof HTMLElement && message.classList.contains("is-success")) {
      message.hidden = true;
      message.textContent = "";
      message.classList.remove("is-success");
    }

    validateProfileFormLive(form);
  });

  root.addEventListener("change", (event: Event) => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    const form = target.closest("[data-profile-edit-form]");
    if (!(form instanceof HTMLFormElement)) return;

    validateProfileFormLive(form);
  });

  bindableRoot.__profileInteractionsBound = true;
}
