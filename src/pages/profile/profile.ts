import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { createPrivateChat } from "../../api/chat";
import {
  createPost,
  deletePost,
  getMyPosts,
  getPostsByProfileId,
  updatePost,
  uploadPostImages,
  type PostMedia,
  type PostResponse,
} from "../../api/posts";
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
import { clearFeedCache } from "../feed/feed";
import {
  normalizeName,
  validateAlphabetConsistency,
  validateIsoBirthDate,
  validateName,
  validateOptionalEmail,
} from "../../utils/profile-validation";
import { renderFeed } from "../feed/feed";
import { invalidateFriendsState } from "../friends/friends";
import { getProfileRecordById, type ProfileRecord } from "./profile-data";

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
  isMissingProfile: boolean;
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
  timeRaw: string;
  updatedAtRaw?: string;
  likes: number;
  reposts: number;
  comments: number;
  media: PostMedia[];
  images: string[];
};

type ComposerMediaItem = {
  mediaID?: number;
  mediaURL: string;
  file?: File;
  isUploaded: boolean;
};

type PostComposerState = {
  open: boolean;
  mode: "create" | "edit";
  editingPostId: string | null;
  deleteConfirmPostId: string | null;
  isSaving: boolean;
  errorMessage: string;
  text: string;
  mediaItems: ComposerMediaItem[];
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
const OWN_PROFILE_CACHE_KEY = "arisfront:profile:me";
const OWN_PROFILE_POSTS_CACHE_KEY = "arisfront:profile:me:posts";
let ownAvatarOverride: string | null | undefined;
let currentProfilePosts: ProfilePost[] = [];

const postComposerState: PostComposerState = {
  open: false,
  mode: "create",
  editingPostId: null,
  deleteConfirmPostId: null,
  isSaving: false,
  errorMessage: "",
  text: "",
  mediaItems: [],
};

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

function readJsonStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors.
  }
}

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

  const sessionUserWithoutAvatar = { ...sessionUser };
  delete sessionUserWithoutAvatar.avatarLink;
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

function createMissingProfile(profileId: string): DisplayProfile {
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

function resolveMockProfile(params: ProfileParams): DisplayProfile {
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

async function enrichFriendsWithAvatarLinks(friends: Friend[]): Promise<Friend[]> {
  return Promise.all(
    friends.map(async (friend) => {
      if (friend.avatarLink) {
        return friend;
      }

      try {
        const profile = await getProfileById(friend.profileId);
        const avatarLink = normaliseAvatarLink(profile.imageLink);

        return avatarLink
          ? {
              ...friend,
              avatarLink,
            }
          : friend;
      } catch (error) {
        console.error(
          "[profile] source=api scope=friend-avatar failed id=%s",
          friend.profileId,
          error,
        );
        return friend;
      }
    }),
  );
}

async function resolveProfile(params: ProfileParams): Promise<DisplayProfile> {
  const sessionUser = getSessionUser();
  const requestedId = params.id ?? sessionUser?.id ?? "profile";
  const isOwnProfile = !params.id || params.id === sessionUser?.id;

  if (sessionUser && isOwnProfile) {
    try {
      const profileData = await getMyProfile();
      console.info("[profile] source=api scope=me id=%s", sessionUser.id, profileData);
      const profile = createOwnProfileFromApi(sessionUser.id, profileData);
      profile.friends = await enrichFriendsWithAvatarLinks(await getFriends("accepted"));
      writeJsonStorage(OWN_PROFILE_CACHE_KEY, profile);
      return profile;
    } catch (error) {
      console.error("[profile] source=api scope=me failed id=%s", sessionUser.id, error);

      const cachedProfile = readJsonStorage<DisplayProfile>(OWN_PROFILE_CACHE_KEY);
      if (cachedProfile) {
        return {
          ...cachedProfile,
          avatarLink: resolveOwnAvatarLink(cachedProfile.avatarLink),
        };
      }
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
      profile.friends = await enrichFriendsWithAvatarLinks(friends);
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
  if (profile.isMissingProfile) {
    return `
      <div class="${className} ${className}--placeholder" aria-hidden="true">
        ?
      </div>
    `;
  }

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

function renderMissingProfileCard(profile: DisplayProfile): string {
  return `
    <article class="profile-card profile-card--missing">
      <header class="profile-card__hero">
        <div class="profile-card__avatar-column">
          ${renderAvatar(profile, "profile-card__avatar")}
        </div>

        <div class="profile-card__hero-copy">
          <div class="profile-card__eyebrow">Профиль</div>
          <h1>Профиль не существует</h1>
          <p>${escapeHtml(profile.status)}</p>
        </div>
      </header>
    </article>
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
            ×
          </button>
        </header>

        <p class="profile-avatar-modal__text">
          Мы просим загружать только настоящую фотографию и оставляем за собой право применять
          меры к пользователям, которые загружают изображения, нарушающие
          <br>
          правила нашего сервиса
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

        <div class="profile-avatar-modal__zoom" data-profile-avatar-zoom-wrap hidden>
          <div class="profile-avatar-modal__tools">
            <button
              type="button"
              class="profile-avatar-modal__button profile-avatar-modal__button--secondary profile-avatar-modal__tool-button"
              data-profile-avatar-rotate-left
            >
              Повернуть влево
            </button>
            <button
              type="button"
              class="profile-avatar-modal__button profile-avatar-modal__button--secondary profile-avatar-modal__tool-button"
              data-profile-avatar-rotate-right
            >
              Повернуть вправо
            </button>
          </div>

          <button
            type="button"
            class="profile-avatar-modal__button profile-avatar-modal__button--secondary profile-avatar-modal__button--full"
            data-profile-avatar-pick
          >
            Выбрать фото
          </button>

          ${
            profile.avatarLink
              ? `
                <button
                  type="button"
                  class="profile-avatar-modal__button profile-avatar-modal__button--secondary profile-avatar-modal__button--full profile-avatar-modal__button--danger"
                  data-profile-avatar-delete-open
                >
                  Удалить фото
                </button>
              `
              : ""
          }

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
            ×
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
            ×
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

function formatPostRelativeTime(iso?: string): string {
  if (!iso) return "";

  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) {
    return "";
  }

  const diff = Date.now() - createdAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} д назад`;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt);
}

function formatPostExactTime(iso?: string): string {
  if (!iso) {
    return "";
  }

  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) {
    return "";
  }

  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(createdAt);

  const timePart = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt);

  return `${datePart}\n${timePart}`;
}

function mapApiPostToProfilePost(post: PostResponse): ProfilePost {
  const media = Array.isArray(post.media)
    ? post.media.filter(
        (item): item is PostMedia =>
          Boolean(item) &&
          typeof item.mediaID === "number" &&
          typeof item.mediaURL === "string" &&
          item.mediaURL.trim().length > 0,
      )
    : [];

  const images = Array.isArray(post.mediaURL)
    ? post.mediaURL.filter(Boolean)
    : media.map((item) => item.mediaURL);

  const nextPost: ProfilePost = {
    id: String(post.id),
    text: typeof post.text === "string" ? post.text : "",
    time: formatPostRelativeTime(post.createdAt),
    timeRaw: post.createdAt ?? "",
    likes: 0,
    reposts: 0,
    comments: 0,
    media,
    images,
  };

  if (post.updatedAt) {
    nextPost.updatedAtRaw = post.updatedAt;
  }

  return nextPost;
}

async function resolveProfilePosts(profile: DisplayProfile): Promise<ProfilePost[]> {
  try {
    const posts = profile.isOwnProfile ? await getMyPosts() : await getPostsByProfileId(profile.id);
    const mappedPosts = posts.map(mapApiPostToProfilePost);

    if (profile.isOwnProfile) {
      writeJsonStorage(OWN_PROFILE_POSTS_CACHE_KEY, mappedPosts);
    }

    return mappedPosts;
  } catch (error) {
    console.error("[profile] source=api scope=posts failed id=%s", profile.id, error);

    if (profile.isOwnProfile) {
      const cachedPosts = readJsonStorage<ProfilePost[]>(OWN_PROFILE_POSTS_CACHE_KEY);
      if (Array.isArray(cachedPosts)) {
        return cachedPosts;
      }
    }

    return [];
  }
}

function resetPostComposerState(): void {
  postComposerState.open = false;
  postComposerState.mode = "create";
  postComposerState.editingPostId = null;
  postComposerState.deleteConfirmPostId = null;
  postComposerState.isSaving = false;
  postComposerState.errorMessage = "";
  postComposerState.text = "";
  postComposerState.mediaItems = [];
}

function openCreatePostComposer(): void {
  resetPostComposerState();
  postComposerState.open = true;
}

function openEditPostComposer(postId: string): void {
  const post = currentProfilePosts.find((item) => item.id === postId);
  if (!post) {
    return;
  }

  resetPostComposerState();
  postComposerState.open = true;
  postComposerState.mode = "edit";
  postComposerState.editingPostId = post.id;
  postComposerState.text = post.text;
  postComposerState.mediaItems = post.media.map((item) => ({
    mediaID: item.mediaID,
    mediaURL: item.mediaURL,
    isUploaded: true,
  }));
}

async function uploadPendingComposerImages(): Promise<void> {
  const pendingItems = postComposerState.mediaItems.filter((item) => !item.isUploaded && item.file);
  if (!pendingItems.length) {
    return;
  }

  const uploadedMedia = await uploadPostImages(pendingItems.map((item) => item.file!));
  let uploadIndex = 0;

  postComposerState.mediaItems = postComposerState.mediaItems.map((item) => {
    if (item.isUploaded) {
      return item;
    }

    const uploaded = uploadedMedia[uploadIndex];
    uploadIndex += 1;

    if (!uploaded) {
      return item;
    }

    return {
      mediaID: uploaded.mediaID,
      mediaURL: uploaded.mediaURL,
      isUploaded: true,
    };
  });
}

function removeComposerMediaItem(index: number): void {
  if (index < 0 || index >= postComposerState.mediaItems.length || postComposerState.isSaving) {
    return;
  }

  postComposerState.mediaItems.splice(index, 1);
}

function syncPostComposerUi(root: ParentNode): void {
  const modal = root.querySelector<HTMLElement>("[data-profile-post-modal]");
  const deleteModal = root.querySelector<HTMLElement>("[data-profile-post-delete-modal]");

  if (!(modal instanceof HTMLElement)) {
    if (deleteModal instanceof HTMLElement) {
      deleteModal.hidden = true;
    }
    return;
  }

  if (deleteModal instanceof HTMLElement) {
    deleteModal.hidden = !postComposerState.deleteConfirmPostId;
  }

  const textarea = modal.querySelector<HTMLTextAreaElement>("[data-profile-post-text]");
  const saveButton = modal.querySelector<HTMLButtonElement>("[data-profile-post-save]");
  const errorNode = modal.querySelector<HTMLElement>("[data-profile-post-error]");
  const titleNode = modal.querySelector<HTMLElement>("[data-profile-post-title]");
  const imageInput = modal.querySelector<HTMLInputElement>("[data-profile-post-image-input]");
  const previewWrap = modal.querySelector<HTMLElement>("[data-profile-post-previews]");
  const pickButton = modal.querySelector<HTMLButtonElement>("[data-profile-post-pick-image]");

  modal.hidden = !postComposerState.open;
  modal.classList.toggle("is-open", postComposerState.open);

  if (titleNode) {
    titleNode.textContent =
      postComposerState.mode === "edit" ? "Редактировать пост" : "Новая публикация";
  }

  if (textarea) {
    textarea.value = postComposerState.text;
    textarea.disabled = postComposerState.isSaving;
  }

  if (saveButton) {
    saveButton.disabled =
      postComposerState.isSaving ||
      (!postComposerState.text.trim() && postComposerState.mediaItems.length === 0) ||
      postComposerState.text.length > 5000;

    saveButton.textContent =
      postComposerState.mode === "edit"
        ? postComposerState.isSaving
          ? "Сохраняем..."
          : "Опубликовать"
        : postComposerState.isSaving
          ? "Публикуем..."
          : "Опубликовать";
  }

  if (pickButton) {
    pickButton.disabled = postComposerState.isSaving || postComposerState.mediaItems.length >= 5;
    pickButton.textContent =
      postComposerState.mediaItems.length >= 5 ? "Достигнут лимит 5 изображений" : "+ Изображения";
  }

  if (imageInput && !postComposerState.open) {
    imageInput.value = "";
  }

  if (errorNode) {
    errorNode.hidden = !postComposerState.errorMessage;
    errorNode.textContent = postComposerState.errorMessage;
  }

  if (previewWrap) {
    previewWrap.innerHTML = postComposerState.mediaItems
      .map(
        (item, index) => `
          <div class="profile-post-modal__preview">
            <img src="${escapeHtml(item.mediaURL)}" alt="Изображение ${index + 1}">
            <button
              type="button"
              class="profile-post-modal__preview-remove"
              data-profile-post-remove-image="${index}"
              aria-label="Удалить изображение"
            >
              [X]
            </button>
          </div>
        `,
      )
      .join("");

    previewWrap.hidden = postComposerState.mediaItems.length === 0;
  }
}

async function handlePostImagesSelected(files: FileList | null): Promise<void> {
  if (!files?.length) {
    return;
  }

  postComposerState.errorMessage = "";
  const availableSlots = Math.max(0, 5 - postComposerState.mediaItems.length);
  const nextFiles = Array.from(files).slice(0, availableSlots);

  if (!nextFiles.length) {
    return;
  }

  const previewUrls = await Promise.all(
    nextFiles.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
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
        }),
    ),
  );

  postComposerState.mediaItems = postComposerState.mediaItems.concat(
    previewUrls.reduce<ComposerMediaItem[]>((items, mediaURL, index) => {
      const file = nextFiles[index];
      if (!file) {
        return items;
      }

      items.push({
        mediaURL,
        file,
        isUploaded: false,
      });
      return items;
    }, []),
  );
}

function renderPostComposerModal(): string {
  return `
    <div class="profile-post-modal" data-profile-post-modal hidden>
      <section
        class="profile-post-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Редактор публикации"
      >
        <header class="profile-post-modal__header">
          <h2 class="profile-post-modal__title" data-profile-post-title>Новая публикация</h2>
          <button
            type="button"
            class="profile-post-modal__close"
            data-profile-post-close
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <textarea
          class="profile-post-modal__textarea"
          data-profile-post-text
          rows="8"
          maxlength="5000"
          placeholder="Что у вас нового?"
        ></textarea>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          multiple
          hidden
          data-profile-post-image-input
        >

        <div class="profile-post-modal__toolbar">
          <button
            type="button"
            class="profile-post-modal__button profile-post-modal__button--secondary"
            data-profile-post-pick-image
          >
            + Изображения
          </button>
        </div>

        <div class="profile-post-modal__previews" data-profile-post-previews hidden></div>

        <p class="profile-post-modal__error" data-profile-post-error hidden></p>

        <div class="profile-post-modal__actions">
          <button
            type="button"
            class="profile-post-modal__button profile-post-modal__button--primary"
            data-profile-post-save
          >
            Опубликовать
          </button>
          <button
            type="button"
            class="profile-post-modal__button"
            data-profile-post-close
          >
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderPostDeleteModal(): string {
  return `
    <div class="profile-post-delete-modal" data-profile-post-delete-modal hidden>
      <section
        class="profile-post-delete-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Удалить публикацию"
      >
        <header class="profile-post-delete-modal__header">
          <h2 class="profile-post-delete-modal__title">Удалить публикацию</h2>
          <button
            type="button"
            class="profile-post-delete-modal__close"
            data-profile-post-delete-close
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <p class="profile-post-delete-modal__text">
          Вы действительно хотите удалить этот пост?
        </p>

        <div class="profile-post-delete-modal__actions">
          <button
            type="button"
            class="profile-post-delete-modal__button profile-post-delete-modal__button--primary"
            data-profile-post-delete-confirm
          >
            Удалить пост
          </button>
          <button
            type="button"
            class="profile-post-delete-modal__button"
            data-profile-post-delete-close
          >
            Отмена
          </button>
        </div>
      </section>
    </div>
  `;
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

function renderProfilePostImages(images: string[]): string {
  if (!images.length) {
    return "";
  }

  const count = Math.min(images.length, 5);
  const layoutModifierByCount = {
    1: "profile-post__images--single",
    2: "profile-post__images--double",
    3: "profile-post__images--triple",
    4: "profile-post__images--quad",
    5: "profile-post__images--five",
  } as const;
  const layoutModifier = layoutModifierByCount[count as keyof typeof layoutModifierByCount];

  return `
    <div class="profile-post__images ${layoutModifier}">
      ${images
        .slice(0, 5)
        .map(
          (image, index) => `
            <img
              class="profile-post__image${count === 3 && index === 0 ? " profile-post__image--lead" : ""}"
              src="${escapeHtml(getAvatarImageSrc(image))}"
              alt="Изображение публикации"
            >
          `,
        )
        .join("")}
    </div>
  `;
}

function renderProfilePosts(profile: DisplayProfile, posts: ProfilePost[]): string {
  const isOwnProfile = profile.isOwnProfile;
  const authorProfilePath = profile.isOwnProfile
    ? "/profile"
    : `/profile/${encodeURIComponent(profile.id)}`;

  return `
    <section class="profile-posts" id="profile-posts">
      <header class="profile-posts__header">
        <h2>Публикации</h2>
      </header>

      ${
        posts.length
          ? posts
              .map(
                (post) => `
                  <article class="profile-post">
                    <header class="profile-post__header">
                      <a
                        class="profile-post__author"
                        href="${authorProfilePath}"
                        data-link
                      >
                        ${
                          profile.avatarLink
                            ? `
                              <img
                                class="profile-post__avatar"
                                src="${escapeHtml(getAvatarImageSrc(profile.avatarLink))}"
                                alt="${escapeHtml(`${profile.firstName} ${profile.lastName}`)}"
                              >
                            `
                            : `
                              <div class="profile-post__avatar profile-post__avatar--placeholder" aria-hidden="true">
                                ${escapeHtml(getInitials(profile.firstName, profile.lastName))}
                              </div>
                            `
                        }

                        <div class="profile-post__meta">
                          <strong>${escapeHtml(`${profile.firstName} ${profile.lastName}`)}</strong>
                        </div>
                      </a>

                      ${
                        isOwnProfile
                          ? `
                            <div class="profile-post__actions">
                              <button
                                type="button"
                                class="profile-post__action-link"
                                data-profile-post-edit="${escapeHtml(post.id)}"
                              >
                                редактировать
                              </button>
                              <button
                                type="button"
                                class="profile-post__action-link profile-post__action-link--danger"
                                data-profile-post-delete="${escapeHtml(post.id)}"
                              >
                                удалить
                              </button>
                            </div>
                          `
                          : ""
                      }
                    </header>

                    <p class="profile-post__text">${escapeHtml(post.text)}</p>

                    ${renderProfilePostImages(post.images)}

<footer class="profile-post__footer">
  <div class="profile-post__stats">

  <!-- лайки -->
  <span class="profile-post__stat">
    <img src="/assets/img/icons/heart.svg" class="profile-post__icon" />
    ${post.likes}
  </span>

  <!-- репост -->
  <span class="profile-post__stat">
    <img src="/assets/img/icons/repost.svg" class="profile-post__icon" />
    ${post.reposts}
  </span>

  <!-- комментарии -->
  <span class="profile-post__stat">
    <img src="/assets/img/icons/chat.svg" class="profile-post__icon" />
    ${post.comments}
  </span>

</div>

  <span
    class="profile-post__time"
    ${post.timeRaw ? `title="${escapeHtml(formatPostExactTime(post.timeRaw))}"` : ""}
  >${escapeHtml(post.time)}</span>
</footer>
                  </article>
                `,
              )
              .join("")
          : `
              <div class="profile-posts__empty">
                <p class="profile-empty-copy">Публикаций пока нет</p>
              </div>
            `
      }
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
  resetPostComposerState();
  resetAvatarModalState();
  currentProfilePosts = [];

  const isAuthorised = getSessionUser() !== null;

  if (!isAuthorised) {
    return renderFeed();
  }

  const profile = await resolveProfile(params);
  if (profile.isMissingProfile) {
    return `
      <div class="app-page">
        ${renderHeader()}

        <main class="app-layout">
          <aside class="app-layout__left">
            ${renderSidebar({ isAuthorised })}
          </aside>

          <section class="app-layout__center">
            <section class="profile-page">
              ${renderMissingProfileCard(profile)}
            </section>
          </section>

          <aside class="app-layout__right">
            <div class="profile-right-rail"></div>
          </aside>
        </main>
      </div>
    `;
  }

  const posts = await resolveProfilePosts(profile);
  currentProfilePosts = posts;
  const educationSection = renderSection("Образование", renderEducation(profile));
  const workSection = renderSection("Место работы", renderWork(profile));
  const personalSection = renderSection("Личная информация", renderPersonal(profile));
  const hasMoreSections = Boolean(
    educationSection.trim() || workSection.trim() || personalSection.trim(),
  );

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

                ${
                  hasMoreSections
                    ? `
                      <div class="profile-card__more" hidden>
                        ${educationSection}
                        ${workSection}
                        ${personalSection}
                      </div>

                      <button type="button" class="profile-card__toggle" data-profile-toggle aria-expanded="false">
                        показать подробнее
                      </button>
                    `
                    : ""
                }
              </div>
            </article>

            ${renderProfileEditor(profile)}

            ${
              profile.isOwnProfile
                ? `
                  <button type="button" class="profile-composer" data-profile-post-open>
                    + Написать пост
                  </button>
                `
                : ""
            }

            ${renderProfilePosts(profile, posts)}
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
      ${profile.isOwnProfile ? renderPostComposerModal() : ""}
      ${profile.isOwnProfile ? renderPostDeleteModal() : ""}
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
    syncPostComposerUi(root);
    return;
  }

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openPostComposerButton = target.closest("[data-profile-post-open]");
    if (openPostComposerButton instanceof HTMLButtonElement) {
      openCreatePostComposer();
      syncPostComposerUi(root);
      return;
    }

    const editPostButton = target.closest("[data-profile-post-edit]");
    if (editPostButton instanceof HTMLButtonElement) {
      const postId = editPostButton.getAttribute("data-profile-post-edit");
      if (postId) {
        openEditPostComposer(postId);
        syncPostComposerUi(root);
      }
      return;
    }

    const deletePostButton = target.closest("[data-profile-post-delete]");
    if (deletePostButton instanceof HTMLButtonElement) {
      const postId = deletePostButton.getAttribute("data-profile-post-delete");
      if (postId) {
        postComposerState.deleteConfirmPostId = postId;
        postComposerState.errorMessage = "";
        syncPostComposerUi(root);
      }
      return;
    }

    const closePostDeleteButton = target.closest("[data-profile-post-delete-close]");
    const postDeleteBackdrop = target.closest("[data-profile-post-delete-modal]");
    if (closePostDeleteButton instanceof HTMLButtonElement || postDeleteBackdrop === target) {
      postComposerState.deleteConfirmPostId = null;
      postComposerState.isSaving = false;
      postComposerState.errorMessage = "";
      syncPostComposerUi(root);
      return;
    }

    const closePostComposerButton = target.closest("[data-profile-post-close]");
    const postComposerBackdrop = target.closest("[data-profile-post-modal]");
    if (closePostComposerButton instanceof HTMLButtonElement || postComposerBackdrop === target) {
      resetPostComposerState();
      syncPostComposerUi(root);
      return;
    }

    const pickPostImageButton = target.closest("[data-profile-post-pick-image]");
    if (pickPostImageButton instanceof HTMLButtonElement) {
      const imageInput = root.querySelector<HTMLInputElement>("[data-profile-post-image-input]");
      if (imageInput) {
        imageInput.value = "";
        imageInput.click();
      }
      return;
    }

    const removePostImageButton = target.closest("[data-profile-post-remove-image]");
    if (removePostImageButton instanceof HTMLButtonElement) {
      const index = Number.parseInt(
        removePostImageButton.getAttribute("data-profile-post-remove-image") ?? "-1",
        10,
      );
      removeComposerMediaItem(index);
      syncPostComposerUi(root);
      return;
    }

    const savePostButton = target.closest("[data-profile-post-save]");
    if (savePostButton instanceof HTMLButtonElement) {
      const trimmedText = postComposerState.text.trim();
      if (!trimmedText && postComposerState.mediaItems.length === 0) {
        postComposerState.errorMessage = "Добавьте текст или изображение.";
        syncPostComposerUi(root);
        return;
      }

      postComposerState.isSaving = true;
      postComposerState.errorMessage = "";
      syncPostComposerUi(root);

      const savePromise =
        postComposerState.mode === "edit" && postComposerState.editingPostId
          ? (async () => {
              await uploadPendingComposerImages();
              const knownMediaItems = postComposerState.mediaItems.filter(
                (item): item is ComposerMediaItem & { mediaID: number } =>
                  item.isUploaded && typeof item.mediaID === "number" && item.mediaID > 0,
              );
              const canSyncMedia = knownMediaItems.length === postComposerState.mediaItems.length;

              if (
                !canSyncMedia &&
                postComposerState.mediaItems.some(
                  (item) => !item.isUploaded || item.mediaID == null,
                )
              ) {
                throw new Error(
                  "Не получилось обновить изображения поста. Перезагрузите страницу и попробуйте снова.",
                );
              }

              return updatePost(
                postComposerState.editingPostId!,
                canSyncMedia
                  ? {
                      text: trimmedText,
                      media: knownMediaItems.map((item) => ({
                        mediaID: item.mediaID,
                        mediaURL: item.mediaURL,
                      })),
                    }
                  : {
                      text: trimmedText,
                    },
              );
            })()
          : (async () => {
              await uploadPendingComposerImages();

              const createPayload = {
                media: postComposerState.mediaItems
                  .filter(
                    (item): item is ComposerMediaItem & { mediaID: number } =>
                      item.isUploaded && typeof item.mediaID === "number",
                  )
                  .map((item) => ({
                    mediaID: item.mediaID,
                    mediaURL: item.mediaURL,
                  })),
              } as {
                text?: string;
                media: Array<{ mediaID: number; mediaURL: string }>;
              };

              if (trimmedText) {
                createPayload.text = trimmedText;
              }

              return createPost(createPayload);
            })();

      void savePromise
        .then(async () => {
          clearFeedCache();
          resetPostComposerState();
          syncPostComposerUi(root);
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          postComposerState.isSaving = false;
          postComposerState.errorMessage = isOfflineNetworkError(error)
            ? "Нет соединения с интернетом."
            : error instanceof Error
              ? error.message
              : "Не получилось сохранить публикацию.";
          syncPostComposerUi(root);
        });
      return;
    }

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

    const confirmPostDeleteButton = target.closest("[data-profile-post-delete-confirm]");
    if (confirmPostDeleteButton instanceof HTMLButtonElement) {
      const postId = postComposerState.deleteConfirmPostId;
      if (!postId) {
        return;
      }

      postComposerState.isSaving = true;
      postComposerState.errorMessage = "";
      syncPostComposerUi(root);

      void deletePost(postId)
        .then(async () => {
          clearFeedCache();
          resetPostComposerState();
          syncPostComposerUi(root);
          await rerenderCurrentRoute();
        })
        .catch((error: unknown) => {
          postComposerState.isSaving = false;
          postComposerState.errorMessage = isOfflineNetworkError(error)
            ? "Нет соединения с интернетом."
            : error instanceof Error
              ? error.message
              : "Не получилось удалить публикацию.";
          syncPostComposerUi(root);
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

        clearFeedCache();
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

    if (target instanceof HTMLTextAreaElement && target.matches("[data-profile-post-text]")) {
      postComposerState.text = target.value;
      if (postComposerState.errorMessage) {
        postComposerState.errorMessage = "";
      }
      syncPostComposerUi(root);
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

    if (target instanceof HTMLInputElement && target.matches("[data-profile-post-image-input]")) {
      void handlePostImagesSelected(target.files)
        .catch((error: unknown) => {
          postComposerState.errorMessage =
            error instanceof Error ? error.message : "Не получилось подготовить изображения.";
        })
        .finally(() => {
          syncPostComposerUi(root);
        });
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

    if (event.key !== "Escape") {
      return;
    }

    if (postComposerState.open && !postComposerState.isSaving) {
      resetPostComposerState();
      syncPostComposerUi(root);
      return;
    }

    if (avatarModalState.open && !avatarModalState.isSaving) {
      resetAvatarModalState();
      syncAvatarModalUi(root);
    }
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
  syncPostComposerUi(root);
}
