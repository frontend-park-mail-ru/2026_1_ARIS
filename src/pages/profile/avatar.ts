/**
 * Управление аватаром профиля и связанными действиями.
 */
import type { DisplayProfile } from "./types";
import { renderModalCloseButton } from "../../components/modal-close/modal-close";
import {
  avatarModalState,
  AVATAR_MIN_SIZE,
  AVATAR_CROP_OUTPUT_SIZE,
  getAvatarCropSize,
  getRotatedAvatarDimensions,
  clampAvatarOffsets,
  getAvatarZoomPercent,
  applyAvatarEditorSource,
  readCurrentAvatarSrc,
} from "./state";
import { escapeHtml, getInitials, getAvatarImageSrc } from "./helpers";

export function renderAvatarModal(profile: DisplayProfile): string {
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
        <span class="profile-avatar-modal__initials">
          ${escapeHtml(getInitials(profile.firstName, profile.lastName))}
        </span>
      </div>
    `;

  return `
    <div
      class="profile-avatar-modal"
      data-profile-avatar-modal
      data-profile-current-avatar-src="${
        profile.avatarLink ? escapeHtml(getAvatarImageSrc(profile.avatarLink)) : ""
      }"
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
          ${renderModalCloseButton({
            className: "profile-avatar-modal__close",
            attributes: "data-profile-avatar-close",
          })}
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

export function renderAvatarDeleteModal(): string {
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
          ${renderModalCloseButton({
            className: "profile-avatar-delete-modal__close",
            attributes: "data-profile-avatar-delete-close",
          })}
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

export function syncAvatarModalUi(root: ParentNode): void {
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

export async function loadAvatarFile(file: File, root: ParentNode): Promise<void> {
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

export async function loadAvatarFromUrl(
  src: string,
  root: ParentNode,
  fileName = "avatar.jpg",
): Promise<void> {
  avatarModalState.errorMessage = "";

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const previewImage = new Image();
      previewImage.crossOrigin = "anonymous";
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

export function ensureAvatarEditorSource(root: ParentNode): void {
  if (avatarModalState.objectUrl) {
    return;
  }

  const currentAvatarSrc = readCurrentAvatarSrc(root);
  if (
    !currentAvatarSrc ||
    currentAvatarSrc.includes("default-avatar") ||
    currentAvatarSrc.startsWith("data:")
  ) {
    return;
  }

  void loadAvatarFromUrl(currentAvatarSrc, root);
}

export function setAvatarZoom(root: ParentNode, zoomPercent: number): void {
  if (!avatarModalState.objectUrl) {
    return;
  }

  const safeZoom = Math.min(300, Math.max(100, zoomPercent));
  avatarModalState.scale = avatarModalState.minScale * (safeZoom / 100);
  clampAvatarOffsets(root);
  syncAvatarModalUi(root);
}

export function rotateAvatar(root: ParentNode, direction: "left" | "right"): void {
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

export async function buildAvatarFile(root: ParentNode): Promise<File> {
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
    previewImage.crossOrigin = "anonymous";
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
