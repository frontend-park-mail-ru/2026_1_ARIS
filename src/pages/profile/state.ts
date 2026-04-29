/**
 * Состояние страницы профиля.
 *
 * Содержит runtime-состояние, кэши и вспомогательные функции управления состоянием.
 */
import { getSessionUser, setSessionUserSilently } from "../../state/session";
import { StateManager } from "../../state/StateManager";
import {
  validateAlphabetConsistency,
  validateIsoBirthDate,
  validateName,
  validateOptionalEmail,
} from "../../utils/profile-validation";
import type { UpdateProfilePayload } from "../../api/profile";
import type {
  EditableProfileFields,
  ProfileFieldErrorMap,
  ProfilePost,
  PostComposerState,
  AvatarModalState,
} from "./types";

export const AVATAR_MIN_SIZE = 400;
export const AVATAR_CROP_OUTPUT_SIZE = 400;
export const DEFAULT_AVATAR_CROP_SIZE = 152;
export const OWN_PROFILE_CACHE_KEY = "arisfront:profile:me";
export const OWN_PROFILE_POSTS_CACHE_KEY = "arisfront:profile:me:posts";

type ProfileRuntimeState = {
  ownAvatarOverride: string | null | undefined;
  currentProfilePosts: ProfilePost[];
  postComposer: PostComposerState;
  avatarModal: AvatarModalState;
};

export let ownAvatarOverride: string | null | undefined = undefined;
export function setOwnAvatarOverride(value: string | null | undefined): void {
  ownAvatarOverride = value;
  profileStore.patch({ ownAvatarOverride: value });
}

export let currentProfilePosts: ProfilePost[] = [];
export function setCurrentProfilePosts(posts: ProfilePost[]): void {
  currentProfilePosts = posts;
  profileStore.patch({ currentProfilePosts: posts });
}

function createInitialPostComposerState(): PostComposerState {
  return {
    open: false,
    mode: "create",
    editingPostId: null,
    deleteConfirmPostId: null,
    isSaving: false,
    errorMessage: "",
    text: "",
    mediaItems: [],
  };
}

function createInitialAvatarModalState(): AvatarModalState {
  return {
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
}

const mutablePostComposerState = createInitialPostComposerState();
const mutableAvatarModalState = createInitialAvatarModalState();

/** Реактивное состояние страницы профиля. */
export const profileStore = new StateManager<ProfileRuntimeState>({
  ownAvatarOverride,
  currentProfilePosts,
  postComposer: mutablePostComposerState,
  avatarModal: mutableAvatarModalState,
});

function createProfileStateProxy<T extends object>(
  target: T,
  key: "postComposer" | "avatarModal",
): T {
  return new Proxy(target, {
    set(obj, prop: string | symbol, value: unknown) {
      Reflect.set(obj, prop, value);
      profileStore.patch({ [key]: obj } as Partial<ProfileRuntimeState>);
      return true;
    },
  });
}

function publishPostComposerState(): void {
  profileStore.patch({ postComposer: mutablePostComposerState });
}

export const postComposerState = createProfileStateProxy(mutablePostComposerState, "postComposer");

export const avatarModalState = createProfileStateProxy(mutableAvatarModalState, "avatarModal");

export function readJsonStorage<T>(key: string): T | null {
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

export function writeJsonStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Игнорируем ошибки хранилища.
  }
}

export function resolveOwnAvatarLink(apiAvatarLink?: string): string | undefined {
  if (ownAvatarOverride === null) {
    return undefined;
  }

  if (typeof ownAvatarOverride === "string") {
    return ownAvatarOverride;
  }

  return apiAvatarLink ?? getSessionUser()?.avatarLink;
}

export function updateSessionUserAvatarLink(nextAvatarLink?: string): void {
  const sessionUser = getSessionUser();
  if (!sessionUser) {
    return;
  }

  if (nextAvatarLink) {
    setSessionUserSilently({
      ...sessionUser,
      avatarLink: nextAvatarLink,
    });
    return;
  }

  const sessionUserWithoutAvatar = { ...sessionUser };
  delete sessionUserWithoutAvatar.avatarLink;
  setSessionUserSilently(sessionUserWithoutAvatar);
}

export function resetPostComposerState(): void {
  postComposerState.open = false;
  postComposerState.mode = "create";
  postComposerState.editingPostId = null;
  postComposerState.deleteConfirmPostId = null;
  postComposerState.isSaving = false;
  postComposerState.errorMessage = "";
  postComposerState.text = "";
  postComposerState.mediaItems = [];
}

export function openCreatePostComposer(): void {
  resetPostComposerState();
  postComposerState.open = true;
}

export function openEditPostComposer(postId: string): void {
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

export function removeComposerMediaItem(index: number): void {
  if (index < 0 || index >= postComposerState.mediaItems.length || postComposerState.isSaving) {
    return;
  }

  postComposerState.mediaItems.splice(index, 1);
  publishPostComposerState();
}

export function revokeAvatarObjectUrl(): void {
  avatarModalState.objectUrl = null;
}

export function resetAvatarModalState(): void {
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

export function getAvatarCropSize(root: ParentNode): number {
  const stage = root.querySelector<HTMLElement>("[data-profile-avatar-crop-stage]");
  return stage?.clientWidth || DEFAULT_AVATAR_CROP_SIZE;
}

export function getRotatedAvatarDimensions(): { width: number; height: number } {
  const rotated = avatarModalState.rotation === 90 || avatarModalState.rotation === 270;

  return {
    width: rotated ? avatarModalState.naturalHeight : avatarModalState.naturalWidth,
    height: rotated ? avatarModalState.naturalWidth : avatarModalState.naturalHeight,
  };
}

export function clampAvatarOffsets(root: ParentNode): void {
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

export function getAvatarZoomPercent(): number {
  if (!avatarModalState.objectUrl) {
    return 100;
  }

  const ratio = avatarModalState.scale / avatarModalState.minScale;
  return Math.round(Math.min(300, Math.max(100, ratio * 100)));
}

export function applyAvatarEditorSource(
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

export function readCurrentAvatarSrc(root: ParentNode): string | undefined {
  const modal = root.querySelector<HTMLElement>("[data-profile-avatar-modal]");
  const rawSrc = modal?.getAttribute("data-profile-current-avatar-src");
  const nextSrc = typeof rawSrc === "string" ? rawSrc.trim() : "";
  return nextSrc || undefined;
}

export function normalizeProfileId(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

export function normaliseAvatarLink(value?: string): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

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

export function validateProfilePatch(
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

export function hasProfileFieldErrors(errors: ProfileFieldErrorMap): boolean {
  return Object.values(errors).some(Boolean);
}
