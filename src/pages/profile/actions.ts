/**
 * Действия страницы профиля: сохранение, удаление и побочные эффекты UI.
 */
import { uploadPostImages } from "../../api/posts";
import { normalizeName } from "../../utils/profile-validation";
import type { UpdateProfilePayload } from "../../api/profile";

import type { ComposerMediaItem, EditableProfileFields } from "./types";
import { postComposerState, validateProfilePatch, hasProfileFieldErrors } from "./state";
import { renderProfileFieldErrors, clearProfileFieldErrors } from "./render";

export async function uploadPendingComposerImages(): Promise<void> {
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

export async function handlePostImagesSelected(files: FileList | null): Promise<void> {
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

export function readFieldValue(formData: FormData, name: keyof EditableProfileFields): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function getDefaultFieldValue(
  form: HTMLFormElement,
  name: keyof EditableProfileFields,
): string {
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

export function buildProfilePatch(
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

export function getProfileFormSourceValues(form: HTMLFormElement): EditableProfileFields {
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

export function validateProfileFormLive(form: HTMLFormElement): void {
  const sourceValues = getProfileFormSourceValues(form);
  const patch = buildProfilePatch(new FormData(form), sourceValues);
  const errors = validateProfilePatch(patch, sourceValues);

  if (hasProfileFieldErrors(errors)) {
    renderProfileFieldErrors(form, errors);
    return;
  }

  clearProfileFieldErrors(form);
}

export function toggleProfileEditor(root: ParentNode, forceExpanded?: boolean): void {
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

export async function rerenderCurrentRoute(): Promise<void> {
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function isOfflineNetworkError(error: unknown): boolean {
  return !navigator.onLine || error instanceof TypeError;
}
