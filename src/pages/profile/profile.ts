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
  uploadProfileAvatar,
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

type AvatarModalState = {
  open: boolean;
  deleteConfirmOpen: boolean;
  isSaving: boolean;
  errorMessage: string;
  objectUrl: string | null;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
  scale: number;
  minScale: number;
  rotation: 0 | 90 | 180 | 270;
  offsetX: number;
  offsetY: number;
  dragPointerId: number | null;
  dragStartX: number;
  dragStartY: number;
  dragStartOffsetX: number;
  dragStartOffsetY: number;
};

const AVATAR_MIN_SIZE = 400;
const AVATAR_CROP_OUTPUT_SIZE = 400;
const DEFAULT_AVATAR_CROP_SIZE = 152;
let ownAvatarOverride: string | null | undefined;

const avatarModalState: AvatarModalState = {
  open: false,
  deleteConfirmOpen: false,
  isSaving: false,
  errorMessage: "",
  objectUrl: null,
  fileName: "",
  naturalWidth: 0,
  naturalHeight: 0,
  scale: 1,
  minScale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  dragPointerId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragStartOffsetX: 0,
  dragStartOffsetY: 0,
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

function getAvatarImageSrc(avatarLink?: string): string {
  if (!avatarLink) {
    return "/assets/img/default-avatar.png";
  }

  if (avatarLink.startsWith("/image-proxy?url=") || /^https?:\/\//i.test(avatarLink)) {
    return avatarLink;
  }

  return `/image-proxy?url=${encodeURIComponent(avatarLink)}`;
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

function normaliseAvatarLink(value?: string): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveOwnAvatarLink(apiAvatarLink?: string): string | undefined {
  if (ownAvatarOverride === null) {
    return undefined;
  }

  if (typeof ownAvatarOverride === "string") {
    return ownAvatarOverride;
  }

  return apiAvatarLink ?? getSessionUser()?.avatarLink;
}

function updateSessionUserAvatarLink(nextAvatarLink?: string): void {
  const sessionUser = getSessionUser();
  if (!sessionUser) {
    return;
  }

  if (nextAvatarLink) {
    setSessionUser({
      ...sessionUser,
      avatarLink: nextAvatarLink,
    });
    return;
  }

  const { avatarLink: _avatarLink, ...sessionUserWithoutAvatar } = sessionUser;
  setSessionUser(sessionUserWithoutAvatar);
}

function readCurrentAvatarSrc(root: ParentNode): string | undefined {
  const modal = root.querySelector<HTMLElement>("[data-profile-avatar-modal]");
  const rawSrc = modal?.getAttribute("data-profile-current-avatar-src");
  const nextSrc = typeof rawSrc === "string" ? rawSrc.trim() : "";
  return nextSrc || undefined;
}

function applyAvatarEditorSource(
  src: string,
  image: HTMLImageElement,
  root: ParentNode,
  fileName: string,
): void {
  revokeAvatarObjectUrl();
  avatarModalState.objectUrl = src;
  avatarModalState.fileName = fileName;
  avatarModalState.naturalWidth = image.naturalWidth;
  avatarModalState.naturalHeight = image.naturalHeight;

  const cropSize = getAvatarCropSize(root);
  avatarModalState.minScale = Math.max(
    cropSize / image.naturalWidth,
    cropSize / image.naturalHeight,
  );
  avatarModalState.scale = avatarModalState.minScale;
  avatarModalState.rotation = 0;
  avatarModalState.offsetX = 0;
  avatarModalState.offsetY = 0;
  clampAvatarOffsets(root);
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
        src="${getAvatarImageSrc(profile.avatarLink)}"
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

function revokeAvatarObjectUrl(): void {
  avatarModalState.objectUrl = null;
}

function resetAvatarModalState(): void {
  revokeAvatarObjectUrl();
  avatarModalState.open = false;
  avatarModalState.deleteConfirmOpen = false;
  avatarModalState.isSaving = false;
  avatarModalState.errorMessage = "";
  avatarModalState.fileName = "";
  avatarModalState.naturalWidth = 0;
  avatarModalState.naturalHeight = 0;
  avatarModalState.scale = 1;
  avatarModalState.minScale = 1;
  avatarModalState.rotation = 0;
  avatarModalState.offsetX = 0;
  avatarModalState.offsetY = 0;
  avatarModalState.dragPointerId = null;
  avatarModalState.dragStartX = 0;
  avatarModalState.dragStartY = 0;
  avatarModalState.dragStartOffsetX = 0;
  avatarModalState.dragStartOffsetY = 0;
}

function getAvatarCropSize(root: ParentNode): number {
  const stage = root.querySelector<HTMLElement>("[data-profile-avatar-crop-stage]");
  return stage?.clientWidth || DEFAULT_AVATAR_CROP_SIZE;
}

function getRotatedAvatarDimensions(): { width: number; height: number } {
  const rotated = avatarModalState.rotation === 90 || avatarModalState.rotation === 270;

  return {
    width: rotated ? avatarModalState.naturalHeight : avatarModalState.naturalWidth,
    height: rotated ? avatarModalState.naturalWidth : avatarModalState.naturalHeight,
  };
}

function clampAvatarOffsets(root: ParentNode): void {
  if (
    !avatarModalState.objectUrl ||
    !avatarModalState.naturalWidth ||
    !avatarModalState.naturalHeight
  ) {
    avatarModalState.offsetX = 0;
    avatarModalState.offsetY = 0;
    return;
  }

  const cropSize = getAvatarCropSize(root);
  const rotatedSize = getRotatedAvatarDimensions();
  const displayWidth = rotatedSize.width * avatarModalState.scale;
  const displayHeight = rotatedSize.height * avatarModalState.scale;
  const maxOffsetX = Math.max(0, (displayWidth - cropSize) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - cropSize) / 2);

  avatarModalState.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, avatarModalState.offsetX));
  avatarModalState.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, avatarModalState.offsetY));
}

function getAvatarZoomPercent(): number {
  if (!avatarModalState.objectUrl) {
    return 100;
  }

  const ratio = avatarModalState.scale / avatarModalState.minScale;
  return Math.round(Math.min(300, Math.max(100, ratio * 100)));
}

function renderAvatarModal(profile: DisplayProfile): string {
  if (!profile.isOwnProfile) {
    return "";
  }

  const currentAvatarPreview = profile.avatarLink
    ? `
        <div
          class="profile-avatar-modal__current-image"
          data-profile-avatar-current-image
          style="background-image: url('${escapeHtml(getAvatarImageSrc(profile.avatarLink))}');"
          aria-label="${escapeHtml(`${profile.firstName} ${profile.lastName}`)}"
          role="img"
        >
        </div>
      `
    : `
        <div
          class="profile-avatar-modal__current-image profile-avatar-modal__current-image--placeholder"
          data-profile-avatar-current-image
          aria-hidden="true"
        >
          ${escapeHtml(getInitials(profile.firstName, profile.lastName))}
        </div>
      `;

  return `
    <div
      class="profile-avatar-modal"
      data-profile-avatar-modal
      data-profile-current-avatar-src="${escapeHtml(getAvatarImageSrc(profile.avatarLink))}"
      hidden
    >
      <section
        class="profile-avatar-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Изменить аватар"
      >
        <header class="profile-avatar-modal__header">
          <h2 class="profile-avatar-modal__title">Изменить аватар</h2>
          <button
            type="button"
            class="profile-avatar-modal__close"
            data-profile-avatar-close
            aria-label="Закрыть"
          >
            [X]
          </button>
        </header>

        <p class="profile-avatar-modal__text">
          Мы просим загружать только настоящую фотографию и оставляем за собой право применять
          меры к пользователям, которые загружают изображения, нарушающие Правила нашего сервиса
        </p>

        <div class="profile-avatar-modal__preview" data-avatar-fallback="ignore">
          <div class="profile-avatar-modal__crop-stage" data-profile-avatar-crop-stage>
            <div
              class="profile-avatar-modal__crop-image"
              data-profile-avatar-crop-image
              hidden
              aria-label="Предпросмотр новой аватарки"
              role="img"
            ></div>
            ${currentAvatarPreview}
            <div class="profile-avatar-modal__crop-ring" aria-hidden="true"></div>
          </div>
        </div>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          hidden
          data-profile-avatar-input
        >

        <button
          type="button"
          class="profile-avatar-modal__button profile-avatar-modal__button--primary"
          data-profile-avatar-pick
        >
          Выбрать фото
        </button>

        ${
          profile.avatarLink
            ? `
              <button
                type="button"
                class="profile-avatar-modal__button profile-avatar-modal__button--primary profile-avatar-modal__button--danger"
                data-profile-avatar-delete-open
              >
                Удалить фото
              </button>
            `
            : ""
        }

        <div class="profile-avatar-modal__zoom" data-profile-avatar-zoom-wrap hidden>
          <div class="profile-avatar-modal__tools">
            <button
              type="button"
              class="profile-avatar-modal__tool-button"
              data-profile-avatar-rotate-left
            >
              Повернуть -90°
            </button>
            <button
              type="button"
              class="profile-avatar-modal__tool-button"
              data-profile-avatar-rotate-right
            >
              Повернуть +90°
            </button>
          </div>
          <span class="profile-avatar-modal__zoom-label">Масштаб</span>
          <input
            type="range"
            class="profile-avatar-modal__zoom-input"
            min="100"
            max="300"
            step="1"
            value="100"
            data-profile-avatar-zoom
          >
        </div>

        <p class="profile-avatar-modal__error" data-profile-avatar-error hidden></p>

        <div class="profile-avatar-modal__actions">
          <button
            type="button"
            class="profile-avatar-modal__button profile-avatar-modal__button--primary"
            data-profile-avatar-save
          >
            Сохранить
          </button>
          <button
            type="button"
            class="profile-avatar-modal__button profile-avatar-modal__button--ghost"
            data-profile-avatar-close
          >
            Выйти
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderAvatarDeleteModal(): string {
  return `
    <div class="profile-avatar-delete-modal" data-profile-avatar-delete-modal hidden>
      <section
        class="profile-avatar-delete-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Удалить аватар"
      >
        <header class="profile-avatar-delete-modal__header">
          <h2 class="profile-avatar-delete-modal__title">Удалить аватар</h2>
          <button
            type="button"
            class="profile-avatar-delete-modal__close"
            data-profile-avatar-delete-close
            aria-label="Закрыть"
          >
            [X]
          </button>
        </header>

        <p class="profile-avatar-delete-modal__text">
          Вы действительно хотите удалить текущую аватарку?
        </p>

        <div class="profile-avatar-delete-modal__actions">
          <button
            type="button"
            class="profile-avatar-delete-modal__button profile-avatar-delete-modal__button--primary"
            data-profile-avatar-delete-confirm
          >
            Удалить фото
          </button>
          <button
            type="button"
            class="profile-avatar-delete-modal__button"
            data-profile-avatar-delete-close
          >
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

function syncAvatarModalUi(root: ParentNode): void {
  const modal = root.querySelector<HTMLElement>("[data-profile-avatar-modal]");
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const cropImage = modal.querySelector<HTMLElement>("[data-profile-avatar-crop-image]");
  const currentImage = modal.querySelector<HTMLElement>("[data-profile-avatar-current-image]");
  const zoomWrap = modal.querySelector<HTMLElement>("[data-profile-avatar-zoom-wrap]");
  const zoomInput = modal.querySelector<HTMLInputElement>("[data-profile-avatar-zoom]");
  const saveButton = modal.querySelector<HTMLButtonElement>("[data-profile-avatar-save]");
  const pickButton = modal.querySelector<HTMLButtonElement>("[data-profile-avatar-pick]");
  const deleteButton = modal.querySelector<HTMLButtonElement>("[data-profile-avatar-delete-open]");
  const rotateButtons = modal.querySelectorAll<HTMLButtonElement>(
    "[data-profile-avatar-rotate-left], [data-profile-avatar-rotate-right]",
  );
  const closeButtons = modal.querySelectorAll<HTMLButtonElement>("[data-profile-avatar-close]");
  const errorNode = modal.querySelector<HTMLElement>("[data-profile-avatar-error]");
  const fileInput = modal.querySelector<HTMLInputElement>("[data-profile-avatar-input]");
  const deleteModal = root.querySelector<HTMLElement>("[data-profile-avatar-delete-modal]");
  const deleteModalButtons = root.querySelectorAll<HTMLButtonElement>(
    "[data-profile-avatar-delete-close], [data-profile-avatar-delete-confirm]",
  );

  modal.hidden = !avatarModalState.open;
  modal.classList.toggle("is-open", avatarModalState.open);

  if (errorNode instanceof HTMLElement) {
    errorNode.hidden = !avatarModalState.errorMessage;
    errorNode.textContent = avatarModalState.errorMessage;
  }

  const hasNewImage = Boolean(avatarModalState.objectUrl);
  modal.classList.toggle("is-previewing", hasNewImage);

  if (cropImage instanceof HTMLElement) {
    cropImage.hidden = !hasNewImage;

    if (hasNewImage && avatarModalState.objectUrl) {
      cropImage.style.backgroundImage = `url("${avatarModalState.objectUrl}")`;
      cropImage.style.width = `${avatarModalState.naturalWidth * avatarModalState.scale}px`;
      cropImage.style.height = `${avatarModalState.naturalHeight * avatarModalState.scale}px`;
      cropImage.style.transform = `translate(-50%, -50%) translate(${avatarModalState.offsetX}px, ${avatarModalState.offsetY}px) rotate(${avatarModalState.rotation}deg)`;
    } else {
      cropImage.style.backgroundImage = "";
      cropImage.style.width = "";
      cropImage.style.height = "";
      cropImage.style.transform = "";
    }
  }

  if (currentImage instanceof HTMLElement) {
    currentImage.hidden = hasNewImage;
  }

  if (zoomWrap instanceof HTMLElement) {
    zoomWrap.hidden = !hasNewImage;
  }

  if (zoomInput instanceof HTMLInputElement) {
    zoomInput.value = String(getAvatarZoomPercent());
    zoomInput.disabled = !hasNewImage || avatarModalState.isSaving;
  }

  if (saveButton instanceof HTMLButtonElement) {
    saveButton.disabled = !hasNewImage || avatarModalState.isSaving;
    saveButton.textContent = avatarModalState.isSaving ? "Сохраняем..." : "Сохранить";
  }

  if (pickButton instanceof HTMLButtonElement) {
    pickButton.disabled = avatarModalState.isSaving;
    pickButton.textContent = hasNewImage ? "Заменить фото" : "Выбрать фото";
  }

  if (deleteButton instanceof HTMLButtonElement) {
    deleteButton.disabled = avatarModalState.isSaving;
  }

  rotateButtons.forEach((button) => {
    button.disabled = !hasNewImage || avatarModalState.isSaving;
  });

  closeButtons.forEach((button) => {
    button.disabled = avatarModalState.isSaving;
  });

  if (deleteModal instanceof HTMLElement) {
    deleteModal.hidden = !avatarModalState.deleteConfirmOpen;
  }

  deleteModalButtons.forEach((button) => {
    button.disabled = avatarModalState.isSaving;
  });

  if (fileInput instanceof HTMLInputElement && !avatarModalState.open) {
    fileInput.value = "";
  }
}

async function loadAvatarFile(file: File, root: ParentNode): Promise<void> {
  avatarModalState.errorMessage = "";

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Не получилось прочитать изображение."));
      };
      reader.onerror = () => reject(new Error("Не получилось прочитать изображение."));
      reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const previewImage = new Image();
      previewImage.onload = () => resolve(previewImage);
      previewImage.onerror = () => reject(new Error("Не получилось прочитать изображение."));
      previewImage.src = dataUrl;
    });

    if (image.naturalWidth < AVATAR_MIN_SIZE || image.naturalHeight < AVATAR_MIN_SIZE) {
      throw new Error("Фотография должна быть не меньше 400x400.");
    }

    applyAvatarEditorSource(dataUrl, image, root, file.name);
  } catch (error) {
    avatarModalState.errorMessage =
      error instanceof Error ? error.message : "Не получилось подготовить изображение.";
  }

  syncAvatarModalUi(root);
}

async function loadAvatarFromUrl(
  src: string,
  root: ParentNode,
  fileName = "avatar.jpg",
): Promise<void> {
  avatarModalState.errorMessage = "";

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const previewImage = new Image();
      previewImage.onload = () => resolve(previewImage);
      previewImage.onerror = () => reject(new Error("Не получилось загрузить текущее фото."));
      previewImage.src = src;
    });

    applyAvatarEditorSource(src, image, root, fileName);
    syncAvatarModalUi(root);
  } catch (error) {
    avatarModalState.errorMessage =
      error instanceof Error ? error.message : "Не получилось загрузить текущее фото.";
    syncAvatarModalUi(root);
  }
}

function ensureAvatarEditorSource(root: ParentNode): void {
  if (avatarModalState.objectUrl) {
    return;
  }

  const currentAvatarSrc = readCurrentAvatarSrc(root);
  if (!currentAvatarSrc || currentAvatarSrc === "/assets/img/default-avatar.png") {
    return;
  }

  void loadAvatarFromUrl(currentAvatarSrc, root);
}

function setAvatarZoom(root: ParentNode, zoomPercent: number): void {
  if (!avatarModalState.objectUrl) {
    return;
  }

  const safeZoom = Math.min(300, Math.max(100, zoomPercent));
  avatarModalState.scale = avatarModalState.minScale * (safeZoom / 100);
  clampAvatarOffsets(root);
  syncAvatarModalUi(root);
}

function rotateAvatar(root: ParentNode, direction: "left" | "right"): void {
  if (!avatarModalState.objectUrl) {
    return;
  }

  const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  const currentIndex = rotations.indexOf(avatarModalState.rotation);
  const nextIndex =
    direction === "right"
      ? (currentIndex + 1) % rotations.length
      : (currentIndex - 1 + rotations.length) % rotations.length;

  avatarModalState.rotation = rotations[nextIndex]!;

  const cropSize = getAvatarCropSize(root);
  const rotatedSize = getRotatedAvatarDimensions();
  avatarModalState.minScale = Math.max(cropSize / rotatedSize.width, cropSize / rotatedSize.height);
  avatarModalState.scale = Math.max(avatarModalState.scale, avatarModalState.minScale);
  clampAvatarOffsets(root);
  syncAvatarModalUi(root);
}

async function buildAvatarFile(root: ParentNode): Promise<File> {
  if (
    !avatarModalState.objectUrl ||
    !avatarModalState.naturalWidth ||
    !avatarModalState.naturalHeight
  ) {
    throw new Error("Сначала выберите фотографию.");
  }

  const cropSize = getAvatarCropSize(root);
  const rotatedSize = getRotatedAvatarDimensions();
  const displayWidth = rotatedSize.width * avatarModalState.scale;
  const displayHeight = rotatedSize.height * avatarModalState.scale;
  const imageLeft = cropSize / 2 - displayWidth / 2 + avatarModalState.offsetX;
  const imageTop = cropSize / 2 - displayHeight / 2 + avatarModalState.offsetY;
  const sourceX = Math.max(0, -imageLeft / avatarModalState.scale);
  const sourceY = Math.max(0, -imageTop / avatarModalState.scale);
  const sourceSize = cropSize / avatarModalState.scale;
  const canvas = document.createElement("canvas");

  canvas.width = AVATAR_CROP_OUTPUT_SIZE;
  canvas.height = AVATAR_CROP_OUTPUT_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Не получилось подготовить изображение.");
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const previewImage = new Image();
    previewImage.onload = () => resolve(previewImage);
    previewImage.onerror = () => reject(new Error("Не получилось подготовить изображение."));
    previewImage.src = avatarModalState.objectUrl!;
  });

  const rotatedCanvas = document.createElement("canvas");
  const rotatedContext = rotatedCanvas.getContext("2d");
  if (!rotatedContext) {
    throw new Error("Не получилось подготовить изображение.");
  }

  rotatedCanvas.width = rotatedSize.width;
  rotatedCanvas.height = rotatedSize.height;
  rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  rotatedContext.rotate((avatarModalState.rotation * Math.PI) / 180);
  rotatedContext.drawImage(
    image,
    -avatarModalState.naturalWidth / 2,
    -avatarModalState.naturalHeight / 2,
  );

  context.drawImage(
    rotatedCanvas,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    AVATAR_CROP_OUTPUT_SIZE,
    AVATAR_CROP_OUTPUT_SIZE,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error("Не получилось подготовить изображение."));
      },
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], avatarModalState.fileName || "avatar.jpg", { type: "image/jpeg" });
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
                <div class="profile-card__avatar-column">
                  ${renderAvatar(profile, "profile-card__avatar")}
                  ${
                    profile.isOwnProfile
                      ? `
                        <button
                          type="button"
                          class="profile-card__avatar-button"
                          data-profile-avatar-open
                        >
                          Изменить аватар
                        </button>
                      `
                      : ""
                  }
                </div>

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
      ${renderAvatarModal(profile)}
      ${renderAvatarDeleteModal()}
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
    const defaultOption = Array.from(field.options).find((option) => option.defaultSelected);
    return (defaultOption?.value ?? field.options[0]?.value ?? "").trim();
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

function isOfflineNetworkError(error: unknown): boolean {
  return !navigator.onLine || error instanceof TypeError;
}

export function initProfileToggle(root: Document | HTMLElement = document): void {
  const bindableRoot = root as ProfileRoot;

  if (bindableRoot.__profileInteractionsBound) {
    syncAvatarModalUi(root);
    return;
  }

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openAvatarButton = target.closest("[data-profile-avatar-open]");
    if (openAvatarButton instanceof HTMLButtonElement) {
      avatarModalState.open = true;
      avatarModalState.errorMessage = "";
      syncAvatarModalUi(root);
      ensureAvatarEditorSource(root);
      return;
    }

    const rotateLeftButton = target.closest("[data-profile-avatar-rotate-left]");
    if (rotateLeftButton instanceof HTMLButtonElement) {
      rotateAvatar(root, "left");
      return;
    }

    const rotateRightButton = target.closest("[data-profile-avatar-rotate-right]");
    if (rotateRightButton instanceof HTMLButtonElement) {
      rotateAvatar(root, "right");
      return;
    }

    const openAvatarDeleteButton = target.closest("[data-profile-avatar-delete-open]");
    if (openAvatarDeleteButton instanceof HTMLButtonElement) {
      avatarModalState.deleteConfirmOpen = true;
      syncAvatarModalUi(root);
      return;
    }

    const closeAvatarDeleteButton = target.closest("[data-profile-avatar-delete-close]");
    const avatarDeleteBackdrop = target.closest("[data-profile-avatar-delete-modal]");
    if (closeAvatarDeleteButton instanceof HTMLButtonElement || avatarDeleteBackdrop === target) {
      avatarModalState.deleteConfirmOpen = false;
      syncAvatarModalUi(root);
      return;
    }

    const confirmAvatarDeleteButton = target.closest("[data-profile-avatar-delete-confirm]");
    if (confirmAvatarDeleteButton instanceof HTMLButtonElement) {
      avatarModalState.isSaving = true;
      avatarModalState.errorMessage = "";
      syncAvatarModalUi(root);

      void updateMyProfile({ removeAvatar: true })
        .then(async () => {
          const freshProfile = await getMyProfile();
          ownAvatarOverride = null;
          updateSessionUserAvatarLink(normaliseAvatarLink(freshProfile.imageLink));

          resetAvatarModalState();
          syncAvatarModalUi(root);
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          avatarModalState.isSaving = false;
          avatarModalState.deleteConfirmOpen = false;
          avatarModalState.errorMessage = isOfflineNetworkError(error)
            ? "Нет соединения с интернетом."
            : error instanceof Error
              ? error.message
              : "Не получилось удалить аватар.";
          syncAvatarModalUi(root);
        });
      return;
    }

    const closeAvatarButton = target.closest("[data-profile-avatar-close]");
    const avatarModalBackdrop = target.closest("[data-profile-avatar-modal]");
    if (closeAvatarButton instanceof HTMLButtonElement || avatarModalBackdrop === target) {
      resetAvatarModalState();
      syncAvatarModalUi(root);
      return;
    }

    const pickAvatarButton = target.closest("[data-profile-avatar-pick]");
    if (pickAvatarButton instanceof HTMLButtonElement) {
      const fileInput = root.querySelector<HTMLInputElement>("[data-profile-avatar-input]");
      if (fileInput) {
        fileInput.value = "";
        fileInput.click();
      }
      return;
    }

    const saveAvatarButton = target.closest("[data-profile-avatar-save]");
    if (saveAvatarButton instanceof HTMLButtonElement) {
      avatarModalState.isSaving = true;
      avatarModalState.errorMessage = "";
      syncAvatarModalUi(root);

      void buildAvatarFile(root)
        .then(async (file) => {
          const uploadedAvatar = await uploadProfileAvatar(file);
          await updateMyProfile({ avatarID: uploadedAvatar.mediaID });
          const freshProfile = await getMyProfile();
          ownAvatarOverride =
            normaliseAvatarLink(freshProfile.imageLink) ?? uploadedAvatar.mediaURL;

          updateSessionUserAvatarLink(ownAvatarOverride);

          resetAvatarModalState();
          syncAvatarModalUi(root);
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          avatarModalState.isSaving = false;
          avatarModalState.errorMessage = isOfflineNetworkError(error)
            ? "Нет соединения с интернетом."
            : error instanceof Error
              ? error.message
              : "Не получилось сохранить аватар.";
          syncAvatarModalUi(root);
        });
      return;
    }

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
        message.textContent = isOfflineNetworkError(error)
          ? "Нет соединения с интернетом. Изменения пока не отправлены."
          : error instanceof Error
            ? error.message
            : "Не получилось сохранить изменения.";
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

    if (target instanceof HTMLInputElement && target.matches("[data-profile-avatar-zoom]")) {
      setAvatarZoom(root, Number.parseInt(target.value, 10) || 100);
      return;
    }

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

    if (target instanceof HTMLInputElement && target.matches("[data-profile-avatar-input]")) {
      const file = target.files?.[0];
      if (!file) {
        return;
      }

      void loadAvatarFile(file, root);
      return;
    }

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

  root.addEventListener("keydown", (event: Event) => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    if (event.key !== "Escape" || !avatarModalState.open || avatarModalState.isSaving) {
      return;
    }

    resetAvatarModalState();
    syncAvatarModalUi(root);
  });

  root.addEventListener("pointerdown", (event: Event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const cropStage = target.closest<HTMLElement>("[data-profile-avatar-crop-stage]");
    if (!(cropStage instanceof HTMLElement) || !avatarModalState.objectUrl) {
      return;
    }

    avatarModalState.dragPointerId = event.pointerId;
    avatarModalState.dragStartX = event.clientX;
    avatarModalState.dragStartY = event.clientY;
    avatarModalState.dragStartOffsetX = avatarModalState.offsetX;
    avatarModalState.dragStartOffsetY = avatarModalState.offsetY;
    cropStage.setPointerCapture(event.pointerId);
    cropStage.classList.add("is-dragging");
  });

  root.addEventListener("pointermove", (event: Event) => {
    if (!(event instanceof PointerEvent) || avatarModalState.dragPointerId !== event.pointerId) {
      return;
    }

    avatarModalState.offsetX =
      avatarModalState.dragStartOffsetX + (event.clientX - avatarModalState.dragStartX);
    avatarModalState.offsetY =
      avatarModalState.dragStartOffsetY + (event.clientY - avatarModalState.dragStartY);
    clampAvatarOffsets(root);
    syncAvatarModalUi(root);
  });

  root.addEventListener("pointerup", (event: Event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    const target = event.target;
    const cropStage =
      target instanceof Element
        ? target.closest<HTMLElement>("[data-profile-avatar-crop-stage]")
        : null;

    if (avatarModalState.dragPointerId === event.pointerId) {
      avatarModalState.dragPointerId = null;
    }

    if (cropStage instanceof HTMLElement) {
      cropStage.classList.remove("is-dragging");
      if (cropStage.hasPointerCapture(event.pointerId)) {
        cropStage.releasePointerCapture(event.pointerId);
      }
    }
  });

  root.addEventListener("pointercancel", (event: Event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    const cropStage = root.querySelector<HTMLElement>("[data-profile-avatar-crop-stage]");
    avatarModalState.dragPointerId = null;
    cropStage?.classList.remove("is-dragging");
  });

  bindableRoot.__profileInteractionsBound = true;
  syncAvatarModalUi(root);
}
