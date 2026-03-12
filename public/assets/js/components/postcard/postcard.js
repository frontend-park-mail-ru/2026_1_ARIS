import { mockSession } from "../../mock/session.js";

/**
 * Renders a postcard footer item.
 * @param {Object} options
 * @param {string} options.icon
 * @param {number} options.count
 * @returns {string}
 */
function renderPostcardStat({ icon, count, action }) {
  const isAuthorised = mockSession.user !== null;

  if (isAuthorised) {
    return `
        <button
            type="button"
            class="postcard__stat postcard__stat-button"
            data-action="${action}"
            aria-label="${action}"
        >
        <span class="postcard__stat-icon" aria-hidden="true">
            <img src="${icon}" alt="">
        </span>
        <span class="postcard__stat-count">${count}</span>
        </button>
    `;
  }
  return `
    <a href="/login" data-open-auth-modal="login" class="postcard__stat postcard__stat-link" aria-label="${action}">
        <span class="postcard__stat-icon" aria-hidden="true">
            <img src="${icon}" alt="">
        </span>
        <span class="postcard__stat-count">${count}</span>
    </a>
  `;
}

/**
 * Renders postcard media block.
 * @param {string[]} images
 * @returns {string}
 */
function renderPostcardMedia(images = []) {
  if (!images || images.length === 0) {
    return "";
  }

  if (images.length === 1) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--single">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[0]["mediaLink"])}" alt="">
        </div>
      </div>
    `;
  }

  if (images.length === 2) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--double">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[0]["mediaLink"])}" alt="">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[1]["mediaLink"])}" alt="">
        </div>
      </div>
    `;
  }

  if (images.length === 3) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--triple">
          <img class="postcard__media-item postcard__media-item--featured" src="/image-proxy?url=${encodeURIComponent(images[0]["mediaLink"])}" alt="">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[1]["mediaLink"])}" alt="">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[2]["mediaLink"])}" alt="">
        </div>
      </div>
    `;
  }

  if (images.length === 4) {
    return `
      <div class="postcard__media">
        <div class="postcard__media-grid postcard__media-grid--quad">
          ${images
            .slice(0, 4)
            .map(
              (image) =>
                `<img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(image["mediaLink"])}" alt="">`,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  if (images.length === 5) {
    return `
      <div class="postcard__media postcard__media--five">
        <div class="postcard__media-row postcard__media-row--top">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[0]["mediaLink"])}" alt="">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[1]["mediaLink"])}" alt="">
        </div>

        <div class="postcard__media-row postcard__media-row--bottom">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[2]["mediaLink"])}" alt="">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[3]["mediaLink"])}" alt="">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[4]["mediaLink"])}" alt="">
        </div>
      </div>
    `;
  }

  return `
    <div class="postcard__media postcard__media--five-plus">
      <div class="postcard__media-row postcard__media-row--top">
        <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[0]["mediaLink"])}" alt="">
        <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[1]["mediaLink"])}" alt="">
        <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[2]["mediaLink"])}" alt="">
      </div>

      <div class="postcard__media-row postcard__media-row--bottom">
        <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[3]["mediaLink"])}" alt="">
        <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[4]["mediaLink"])}" alt="">
        <div class="postcard__media-overlay">
          <img class="postcard__media-item" src="/image-proxy?url=${encodeURIComponent(images[5]["mediaLink"])}" alt="">
          <span class="postcard__media-overlay-count">+${images.length - 5}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders a postcard.
 * @param {Object} post
 * @param {string} post.author
 * @param {string} post.text
 * @param {string} post.time
 * @param {number} post.likes
 * @param {number} post.comments
 * @param {number} post.reposts
 * @param {string[]} [post.images]
 * @returns {string}
 */
export function renderPostcard(post) {
  return `
    <article class="postcard">
      <header class="postcard__header">
        <div class="postcard__avatar" aria-hidden="true"></div>
        <a href="/profile" class="postcard__author widgetbar-card__username">
  ${post.author.firstName} ${post.author.lastName}
</a>
      </header>

        <div class="postcard__text-container">
            <p class="postcard__text postcard__text--collapsed">${post.text}</p>
            <button type="button" class="postcard__expand">читать полностью</button>
        </div>

      ${renderPostcardMedia(post.medias)}

      <footer class="postcard__footer">
        <div class="postcard__stats">
          ${renderPostcardStat({
            icon: "assets/img/icons/heart.svg",
            count: post.likes,
          })}
          ${renderPostcardStat({
            icon: "assets/img/icons/repost.svg",
            count: post.reposts,
          })}
          ${renderPostcardStat({
            icon: "assets/img/icons/comment.svg",
            count: post.comments,
          })}
        </div>

        <p class="postcard__time">${post.createdAt.slice(0, 10)}</p>
      </footer>
    </article>
  `;
}

export function initPostcardExpand(root = document) {
  requestAnimationFrame(() => {
    const containers = root.querySelectorAll(".postcard__text-container");

    containers.forEach((container) => {
      const text = container.querySelector(".postcard__text");
      const button = container.querySelector(".postcard__expand");

      if (!text || !button) return;

      const isOverflowing = text.scrollHeight > text.clientHeight + 1;

      if (!isOverflowing) {
        button.classList.add("postcard__expand--hidden");
      }
    });
  });

  if (root.__postcardExpandBound) return;

  root.addEventListener("click", (event) => {
    const button = event.target.closest(".postcard__expand");
    if (!button) return;

    const container = button.closest(".postcard__text-container");
    const text = container.querySelector(".postcard__text");

    text.classList.remove("postcard__text--collapsed");
    button.remove();
  });

  root.__postcardExpandBound = true;
}
