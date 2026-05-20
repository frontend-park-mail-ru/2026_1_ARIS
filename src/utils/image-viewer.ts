import { renderModalCloseButton } from "../components/modal-close/modal-close";

let viewer: HTMLElement | null = null;
let imageNode: HTMLImageElement | null = null;
let counterNode: HTMLElement | null = null;
let prevButton: HTMLButtonElement | null = null;
let nextButton: HTMLButtonElement | null = null;
let closeButton: HTMLButtonElement | null = null;
let images: string[] = [];
let currentIndex = 0;

function closeImageViewer(): void {
  if (!viewer) return;
  viewer.hidden = true;
  images = [];
  currentIndex = 0;
}

function updateImageViewer(): void {
  const src = images[currentIndex];
  if (!src || !imageNode || !counterNode || !prevButton || !nextButton) return;

  imageNode.src = src;
  imageNode.alt = `Изображение ${currentIndex + 1}`;
  counterNode.textContent = `${currentIndex + 1} / ${images.length}`;

  const hasSeveralImages = images.length > 1;
  prevButton.hidden = !hasSeveralImages;
  nextButton.hidden = !hasSeveralImages;
}

function showPreviousImage(): void {
  if (images.length <= 1) return;
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  updateImageViewer();
}

function showNextImage(): void {
  if (images.length <= 1) return;
  currentIndex = (currentIndex + 1) % images.length;
  updateImageViewer();
}

function ensureImageViewer(): HTMLElement {
  if (viewer) return viewer;

  viewer = document.createElement("div");
  viewer.className = "image-viewer";
  viewer.hidden = true;

  const dialog = document.createElement("div");
  dialog.className = "image-viewer__dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Просмотр изображения");

  imageNode = document.createElement("img");
  imageNode.className = "image-viewer__image";
  imageNode.decoding = "async";

  const closeButtonTemplate = document.createElement("template");
  closeButtonTemplate.innerHTML = renderModalCloseButton({
    className: "image-viewer__close",
    attributes: "data-image-viewer-close",
  }).trim();
  closeButton = closeButtonTemplate.content.firstElementChild as HTMLButtonElement | null;
  if (!closeButton) {
    throw new Error("Failed to render image viewer close button.");
  }

  prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "image-viewer__nav image-viewer__nav--prev";
  prevButton.setAttribute("aria-label", "Предыдущее изображение");
  prevButton.textContent = "‹";

  nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "image-viewer__nav image-viewer__nav--next";
  nextButton.setAttribute("aria-label", "Следующее изображение");
  nextButton.textContent = "›";

  counterNode = document.createElement("div");
  counterNode.className = "image-viewer__counter";

  dialog.append(imageNode, closeButton, prevButton, nextButton, counterNode);
  viewer.append(dialog);
  document.body.append(viewer);

  closeButton.addEventListener("click", closeImageViewer);
  prevButton.addEventListener("click", showPreviousImage);
  nextButton.addEventListener("click", showNextImage);
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) closeImageViewer();
  });
  document.addEventListener("keydown", (event) => {
    if (!viewer || viewer.hidden) return;

    if (event.key === "Escape") {
      closeImageViewer();
      return;
    }

    if (event.key === "ArrowLeft") {
      showPreviousImage();
      return;
    }

    if (event.key === "ArrowRight") {
      showNextImage();
    }
  });

  return viewer;
}

export function openImageViewer(nextImages: string[], index = 0): void {
  const cleanImages = nextImages.map((src) => src.trim()).filter(Boolean);
  if (!cleanImages.length) return;

  images = cleanImages;
  currentIndex = Math.min(Math.max(0, index), images.length - 1);

  const node = ensureImageViewer();
  updateImageViewer();
  node.hidden = false;
  closeButton?.focus();
}

export function openPostImageViewerFromTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  const image = target.closest<HTMLImageElement>("[data-post-image-open]");
  if (!image) return false;

  const container = image.closest<HTMLElement>(
    ".profile-post__images, .postcard__media, .chat-bubble__media",
  );
  const imageNodes = Array.from(
    container?.querySelectorAll<HTMLImageElement>("[data-post-image-open]") ?? [image],
  );
  const imageSources = imageNodes.map((item) => item.currentSrc || item.src);
  const index = Math.max(0, imageNodes.indexOf(image));

  openImageViewer(imageSources, index);
  return true;
}
