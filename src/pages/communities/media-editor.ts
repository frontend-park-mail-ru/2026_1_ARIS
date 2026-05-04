import { API_BASE_URL } from "../../api/config";
import { getAvatarInitials, resolveAvatarSrc } from "../../utils/avatar";
import { resolveMediaUrl } from "../../utils/media";
import { communitiesState } from "./state";
import type { CommunityMediaEditorKind, CommunityMediaEditorState } from "./types";

const DEFAULT_AVATAR_STAGE_SIZE = 152;
const DEFAULT_COVER_STAGE_WIDTH = 320;
const DEFAULT_COVER_STAGE_HEIGHT = 140;
const COMMUNITY_AVATAR_OUTPUT_SIZE = 400;
const COMMUNITY_COVER_OUTPUT_WIDTH = 1600;
const COMMUNITY_COVER_OUTPUT_HEIGHT = 700;

function getCommunityMediaEditor(kind: CommunityMediaEditorKind): CommunityMediaEditorState {
  return kind === "avatar" ? communitiesState.form.avatarEditor : communitiesState.form.coverEditor;
}

function getCommunityMediaStage(
  root: ParentNode,
  kind: CommunityMediaEditorKind,
): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-community-media-stage="${kind}"]`);
}

function getCommunityMediaStageSize(
  root: ParentNode,
  kind: CommunityMediaEditorKind,
): { width: number; height: number } {
  const stage = getCommunityMediaStage(root, kind);

  if (stage && stage.clientWidth > 0 && stage.clientHeight > 0) {
    return { width: stage.clientWidth, height: stage.clientHeight };
  }

  if (kind === "cover") {
    return {
      width: DEFAULT_COVER_STAGE_WIDTH,
      height: DEFAULT_COVER_STAGE_HEIGHT,
    };
  }

  return {
    width: DEFAULT_AVATAR_STAGE_SIZE,
    height: DEFAULT_AVATAR_STAGE_SIZE,
  };
}

function getRotatedCommunityMediaDimensions(kind: CommunityMediaEditorKind): {
  width: number;
  height: number;
} {
  const editor = getCommunityMediaEditor(kind);
  const rotated = editor.rotation === 90 || editor.rotation === 270;

  return {
    width: rotated ? editor.naturalHeight : editor.naturalWidth,
    height: rotated ? editor.naturalWidth : editor.naturalHeight,
  };
}

function clampCommunityMediaOffsets(root: ParentNode, kind: CommunityMediaEditorKind): void {
  const editor = getCommunityMediaEditor(kind);
  if (!editor.objectUrl || !editor.naturalWidth || !editor.naturalHeight) {
    editor.offsetX = 0;
    editor.offsetY = 0;
    return;
  }

  const stageSize = getCommunityMediaStageSize(root, kind);
  const rotatedSize = getRotatedCommunityMediaDimensions(kind);
  const displayWidth = rotatedSize.width * editor.scale;
  const displayHeight = rotatedSize.height * editor.scale;
  const maxOffsetX = Math.max(0, (displayWidth - stageSize.width) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - stageSize.height) / 2);

  editor.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, editor.offsetX));
  editor.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, editor.offsetY));
}

function getCommunityMediaZoomPercent(kind: CommunityMediaEditorKind): number {
  const editor = getCommunityMediaEditor(kind);
  if (!editor.objectUrl) {
    return 100;
  }

  const ratio = editor.scale / editor.minScale;
  return Math.round(Math.min(300, Math.max(100, ratio * 100)));
}

function revokeCommunityMediaObjectUrl(editor: CommunityMediaEditorState): void {
  if (editor.objectUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(editor.objectUrl);
  }
}

function getCurrentCommunityMediaSrc(kind: CommunityMediaEditorKind): string {
  const rawValue =
    kind === "avatar"
      ? resolveAvatarSrc(communitiesState.form.currentAvatarUrl)
      : resolveMediaUrl(communitiesState.form.currentCoverUrl);

  if (
    !rawValue ||
    rawValue.startsWith("data:") ||
    rawValue.startsWith("blob:") ||
    rawValue.startsWith("/image-proxy?url=")
  ) {
    return rawValue;
  }

  try {
    const parsed = new URL(rawValue, window.location.origin);
    const apiBase = API_BASE_URL ? new URL(API_BASE_URL, window.location.origin) : null;
    const isBackendMedia =
      parsed.pathname.startsWith("/media/") &&
      (!!apiBase
        ? parsed.origin === apiBase.origin || rawValue.startsWith(`${API_BASE_URL}/media/`)
        : parsed.origin === window.location.origin);

    if (isBackendMedia) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Ниже останется безопасный fallback.
  }

  return `/image-proxy?url=${encodeURIComponent(rawValue)}`;
}

function applyCommunityMediaSource(
  kind: CommunityMediaEditorKind,
  src: string,
  image: HTMLImageElement,
  root: ParentNode,
  fileName: string,
  dirty: boolean,
): void {
  const editor = getCommunityMediaEditor(kind);
  revokeCommunityMediaObjectUrl(editor);
  editor.objectUrl = src;
  editor.fileName = fileName;
  editor.naturalWidth = image.naturalWidth;
  editor.naturalHeight = image.naturalHeight;
  editor.rotation = 0;
  editor.offsetX = 0;
  editor.offsetY = 0;
  editor.dirty = dirty;
  editor.removed = false;
  editor.loading = false;
  editor.errorMessage = "";

  const stageSize = getCommunityMediaStageSize(root, kind);
  editor.minScale = Math.max(
    stageSize.width / image.naturalWidth,
    stageSize.height / image.naturalHeight,
  );
  editor.scale = editor.minScale;
  clampCommunityMediaOffsets(root, kind);
}

function setCommunityMediaError(kind: CommunityMediaEditorKind, message: string): void {
  const editor = getCommunityMediaEditor(kind);
  editor.loading = false;
  editor.errorMessage = message;
}

export function clearCommunityMediaSelection(kind: CommunityMediaEditorKind): void {
  const editor = getCommunityMediaEditor(kind);
  revokeCommunityMediaObjectUrl(editor);
  editor.objectUrl = null;
  editor.fileName = "";
  editor.naturalWidth = 0;
  editor.naturalHeight = 0;
  editor.scale = 1;
  editor.minScale = 1;
  editor.rotation = 0;
  editor.offsetX = 0;
  editor.offsetY = 0;
  editor.dragPointerId = null;
  editor.dragStartX = 0;
  editor.dragStartY = 0;
  editor.dragStartOffsetX = 0;
  editor.dragStartOffsetY = 0;
  editor.dirty = false;
  editor.removed = false;
  editor.loading = false;
  editor.errorMessage = "";
}

export function resetCommunityMediaChanges(kind: CommunityMediaEditorKind, root: ParentNode): void {
  clearCommunityMediaSelection(kind);
  syncCommunityMediaEditorsUi(root);
}

export function removeCommunityMedia(kind: CommunityMediaEditorKind, root: ParentNode): void {
  const editor = getCommunityMediaEditor(kind);
  clearCommunityMediaSelection(kind);
  editor.dirty = true;
  editor.removed = true;
  syncCommunityMediaEditorsUi(root);
}

export async function loadCommunityMediaFile(
  kind: CommunityMediaEditorKind,
  file: File,
  root: ParentNode,
): Promise<void> {
  const editor = getCommunityMediaEditor(kind);
  editor.errorMessage = "";
  editor.loading = true;
  syncCommunityMediaEditorsUi(root);

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

    applyCommunityMediaSource(kind, dataUrl, image, root, file.name, true);
  } catch (error) {
    setCommunityMediaError(
      kind,
      error instanceof Error ? error.message : "Не получилось подготовить изображение.",
    );
  }

  syncCommunityMediaEditorsUi(root);
}

export async function loadCommunityMediaFromUrl(
  kind: CommunityMediaEditorKind,
  src: string,
  root: ParentNode,
  fileName: string,
): Promise<void> {
  const editor = getCommunityMediaEditor(kind);
  editor.errorMessage = "";
  editor.loading = true;
  syncCommunityMediaEditorsUi(root);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const previewImage = new Image();
      previewImage.crossOrigin = "anonymous";
      previewImage.onload = () => resolve(previewImage);
      previewImage.onerror = () =>
        reject(new Error("Не получилось загрузить текущее изображение."));
      previewImage.src = src;
    });

    applyCommunityMediaSource(kind, src, image, root, fileName, false);
  } catch (error) {
    setCommunityMediaError(
      kind,
      error instanceof Error ? error.message : "Не получилось загрузить текущее изображение.",
    );
  }

  syncCommunityMediaEditorsUi(root);
}

export function ensureCommunityMediaEditorSource(
  kind: CommunityMediaEditorKind,
  root: ParentNode,
): void {
  const editor = getCommunityMediaEditor(kind);
  if (editor.objectUrl || editor.loading) {
    return;
  }
  if (editor.removed) {
    return;
  }

  const currentSrc = getCurrentCommunityMediaSrc(kind);
  if (!currentSrc || currentSrc.includes("default-avatar")) {
    return;
  }

  void loadCommunityMediaFromUrl(
    kind,
    currentSrc,
    root,
    kind === "avatar" ? "community-avatar.jpg" : "community-cover.jpg",
  );
}

export function setCommunityMediaZoom(
  kind: CommunityMediaEditorKind,
  root: ParentNode,
  zoomPercent: number,
): void {
  const editor = getCommunityMediaEditor(kind);
  if (!editor.objectUrl) {
    return;
  }

  const safeZoom = Math.min(300, Math.max(100, zoomPercent));
  editor.scale = editor.minScale * (safeZoom / 100);
  editor.dirty = true;
  clampCommunityMediaOffsets(root, kind);
  syncCommunityMediaEditorsUi(root);
}

export function rotateCommunityMedia(
  kind: CommunityMediaEditorKind,
  root: ParentNode,
  direction: "left" | "right",
): void {
  const editor = getCommunityMediaEditor(kind);
  if (!editor.objectUrl) {
    ensureCommunityMediaEditorSource(kind, root);
    return;
  }

  const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  const currentIndex = rotations.indexOf(editor.rotation);
  const nextIndex =
    direction === "right"
      ? (currentIndex + 1) % rotations.length
      : (currentIndex - 1 + rotations.length) % rotations.length;

  editor.rotation = rotations[nextIndex]!;
  editor.dirty = true;

  const stageSize = getCommunityMediaStageSize(root, kind);
  const rotatedSize = getRotatedCommunityMediaDimensions(kind);
  editor.minScale = Math.max(
    stageSize.width / rotatedSize.width,
    stageSize.height / rotatedSize.height,
  );
  editor.scale = Math.max(editor.scale, editor.minScale);
  clampCommunityMediaOffsets(root, kind);
  syncCommunityMediaEditorsUi(root);
}

export async function buildCommunityMediaFile(
  kind: CommunityMediaEditorKind,
  root: ParentNode,
): Promise<File> {
  const editor = getCommunityMediaEditor(kind);

  if (!editor.objectUrl || !editor.naturalWidth || !editor.naturalHeight) {
    throw new Error("Сначала выберите изображение.");
  }

  const stageSize = getCommunityMediaStageSize(root, kind);
  const rotatedSize = getRotatedCommunityMediaDimensions(kind);
  const displayWidth = rotatedSize.width * editor.scale;
  const displayHeight = rotatedSize.height * editor.scale;
  const imageLeft = stageSize.width / 2 - displayWidth / 2 + editor.offsetX;
  const imageTop = stageSize.height / 2 - displayHeight / 2 + editor.offsetY;
  const sourceX = Math.max(0, -imageLeft / editor.scale);
  const sourceY = Math.max(0, -imageTop / editor.scale);
  const sourceWidth = stageSize.width / editor.scale;
  const sourceHeight = stageSize.height / editor.scale;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const previewImage = new Image();
    previewImage.crossOrigin = "anonymous";
    previewImage.onload = () => resolve(previewImage);
    previewImage.onerror = () => reject(new Error("Не получилось подготовить изображение."));
    previewImage.src = editor.objectUrl!;
  });

  const rotatedCanvas = document.createElement("canvas");
  const rotatedContext = rotatedCanvas.getContext("2d");
  if (!rotatedContext) {
    throw new Error("Не получилось подготовить изображение.");
  }

  rotatedCanvas.width = rotatedSize.width;
  rotatedCanvas.height = rotatedSize.height;
  rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  rotatedContext.rotate((editor.rotation * Math.PI) / 180);
  rotatedContext.drawImage(image, -editor.naturalWidth / 2, -editor.naturalHeight / 2);

  const canvas = document.createElement("canvas");
  canvas.width = kind === "avatar" ? COMMUNITY_AVATAR_OUTPUT_SIZE : COMMUNITY_COVER_OUTPUT_WIDTH;
  canvas.height = kind === "avatar" ? COMMUNITY_AVATAR_OUTPUT_SIZE : COMMUNITY_COVER_OUTPUT_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Не получилось подготовить изображение.");
  }

  context.drawImage(
    rotatedCanvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
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

  return new File([blob], editor.fileName || `community-${kind}.jpg`, { type: "image/jpeg" });
}

function syncSingleCommunityMediaEditor(root: ParentNode, kind: CommunityMediaEditorKind): void {
  const wrapper = root.querySelector<HTMLElement>(`[data-community-media-editor="${kind}"]`);
  if (!(wrapper instanceof HTMLElement)) {
    return;
  }

  const editor = getCommunityMediaEditor(kind);
  const cropImage = wrapper.querySelector<HTMLElement>(
    `[data-community-media-crop-image="${kind}"]`,
  );
  const currentImage = wrapper.querySelector<HTMLElement>(
    `[data-community-media-current-image="${kind}"]`,
  );
  const zoomWrap = wrapper.querySelector<HTMLElement>(`[data-community-media-zoom-wrap="${kind}"]`);
  const zoomInput = wrapper.querySelector<HTMLInputElement>(
    `[data-community-media-zoom="${kind}"]`,
  );
  const pickButton = wrapper.querySelector<HTMLButtonElement>(
    `[data-community-media-pick="${kind}"]`,
  );
  const deleteButton = wrapper.querySelector<HTMLButtonElement>(
    `[data-community-media-delete="${kind}"]`,
  );
  const rotateButtons = wrapper.querySelectorAll<HTMLButtonElement>(
    `[data-community-media-rotate-left="${kind}"], [data-community-media-rotate-right="${kind}"]`,
  );
  const errorNode = wrapper.querySelector<HTMLElement>(`[data-community-media-error="${kind}"]`);

  const hasEditorImage = Boolean(editor.objectUrl);
  const hasCurrentImage = Boolean(
    !editor.removed &&
    (kind === "avatar"
      ? communitiesState.form.currentAvatarUrl
      : communitiesState.form.currentCoverUrl),
  );
  const canResetChanges = editor.dirty && !editor.removed;
  const canDeleteSavedImage = hasCurrentImage;

  wrapper.classList.toggle("is-previewing", hasEditorImage);

  if (cropImage instanceof HTMLElement) {
    cropImage.hidden = !hasEditorImage;
    if (hasEditorImage && editor.objectUrl) {
      cropImage.style.backgroundImage = `url("${editor.objectUrl}")`;
      cropImage.style.width = `${editor.naturalWidth * editor.scale}px`;
      cropImage.style.height = `${editor.naturalHeight * editor.scale}px`;
      cropImage.style.transform = `translate(-50%, -50%) translate(${editor.offsetX}px, ${editor.offsetY}px) rotate(${editor.rotation}deg)`;
    } else {
      cropImage.style.backgroundImage = "";
      cropImage.style.width = "";
      cropImage.style.height = "";
      cropImage.style.transform = "";
    }
  }

  if (currentImage instanceof HTMLElement) {
    currentImage.hidden = hasEditorImage || editor.removed;
  }

  if (zoomWrap instanceof HTMLElement) {
    zoomWrap.hidden = !hasEditorImage;
  }

  if (zoomInput instanceof HTMLInputElement) {
    zoomInput.value = String(getCommunityMediaZoomPercent(kind));
    zoomInput.disabled = !hasEditorImage || editor.loading;
  }

  if (pickButton instanceof HTMLButtonElement) {
    pickButton.disabled = editor.loading;
    pickButton.textContent =
      hasEditorImage || hasCurrentImage ? "Заменить изображение" : "Выбрать изображение";
  }

  if (deleteButton instanceof HTMLButtonElement) {
    deleteButton.hidden = !canResetChanges && !canDeleteSavedImage;
    deleteButton.disabled = editor.loading;
    deleteButton.textContent =
      canResetChanges && !canDeleteSavedImage ? "Сбросить изменения" : "Удалить изображение";
  }

  rotateButtons.forEach((button) => {
    button.disabled = !hasEditorImage || editor.loading;
  });

  if (errorNode instanceof HTMLElement) {
    errorNode.hidden = !editor.errorMessage;
    errorNode.textContent = editor.errorMessage;
  }

  if (!hasEditorImage && !editor.loading) {
    ensureCommunityMediaEditorSource(kind, root);
  }
}

export function syncCommunityMediaEditorsUi(root: ParentNode): void {
  syncSingleCommunityMediaEditor(root, "avatar");
  syncSingleCommunityMediaEditor(root, "cover");
}

export function startCommunityMediaDrag(
  kind: CommunityMediaEditorKind,
  event: PointerEvent,
  root: ParentNode,
): void {
  const editor = getCommunityMediaEditor(kind);
  const stage = getCommunityMediaStage(root, kind);
  if (!(stage instanceof HTMLElement) || !editor.objectUrl) {
    return;
  }

  editor.dragPointerId = event.pointerId;
  editor.dragStartX = event.clientX;
  editor.dragStartY = event.clientY;
  editor.dragStartOffsetX = editor.offsetX;
  editor.dragStartOffsetY = editor.offsetY;
  stage.setPointerCapture(event.pointerId);
  stage.classList.add("is-dragging");
}

export function moveCommunityMediaDrag(
  kind: CommunityMediaEditorKind,
  event: PointerEvent,
  root: ParentNode,
): void {
  const editor = getCommunityMediaEditor(kind);
  if (editor.dragPointerId !== event.pointerId) {
    return;
  }

  editor.offsetX = editor.dragStartOffsetX + (event.clientX - editor.dragStartX);
  editor.offsetY = editor.dragStartOffsetY + (event.clientY - editor.dragStartY);
  editor.dirty = true;
  clampCommunityMediaOffsets(root, kind);
  syncCommunityMediaEditorsUi(root);
}

export function endCommunityMediaDrag(
  kind: CommunityMediaEditorKind,
  event: PointerEvent,
  root: ParentNode,
): void {
  const editor = getCommunityMediaEditor(kind);
  const stage = getCommunityMediaStage(root, kind);

  if (editor.dragPointerId === event.pointerId) {
    editor.dragPointerId = null;
  }

  if (stage instanceof HTMLElement) {
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
  }
}

export function cancelCommunityMediaDrag(kind: CommunityMediaEditorKind, root: ParentNode): void {
  const editor = getCommunityMediaEditor(kind);
  editor.dragPointerId = null;
  getCommunityMediaStage(root, kind)?.classList.remove("is-dragging");
}

export function getCommunityMediaAvatarInitials(): string {
  return getAvatarInitials(communitiesState.form.title || "Сообщество");
}
