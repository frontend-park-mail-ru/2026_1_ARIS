import type { PostComment } from "../api/posts";
import { renderAvatarMarkup, escapeHtml } from "./avatar";
import { formatPersonName } from "./display-name";
import { t } from "../state/i18n";
import { getLanguageMode } from "../state/language";
import { getSessionUser } from "../state/session";

export const COMMENT_PAGE_SIZE = 3;
const COMMENT_EDIT_WINDOW_MS = 10 * 60 * 1000;

function buildCommentAuthorName(author: PostComment["author"]): string {
  return (
    formatPersonName(author.firstName ?? "", author.lastName ?? "") ||
    author.username ||
    t("widgetbar.userFallback")
  );
}

function commentAuthorPath(author: PostComment["author"]): string {
  return author.profileID ? `/profile/${encodeURIComponent(String(author.profileID))}` : "#";
}

function formatCommentTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return t("postcard.justNow");
  if (minutes < 60) return `${minutes} ${t("postcard.minutesAgo")}`;
  if (hours < 24) return `${hours} ${t("postcard.hoursAgo")}`;
  if (days < 30) return `${days} ${t("postcard.daysAgo")}`;
  return new Intl.DateTimeFormat(getLanguageMode() === "EN" ? "en-US" : "ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatCommentExactTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const locale = getLanguageMode() === "EN" ? "en-US" : "ru-RU";
  const datePart = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${datePart}\n${timePart}`;
}

type RenderCommentOptions = {
  showReply?: boolean;
};

type RenderCommentsListOptions = RenderCommentOptions & {
  totalCount?: number;
};

function isOwnComment(comment: PostComment): boolean {
  const sessionUser = getSessionUser();
  if (!sessionUser) return false;

  return String(comment.author.profileID) === String(sessionUser.id);
}

function canEditComment(comment: PostComment): boolean {
  const createdAt = new Date(comment.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return false;

  return Date.now() - createdAt <= COMMENT_EDIT_WINDOW_MS;
}

function renderCommentActions(comment: PostComment, isReply: boolean): string {
  if (!isOwnComment(comment)) return "";

  const canEdit = canEditComment(comment);
  const removedCount = 1 + (isReply ? 0 : Math.max(0, comment.repliesCount));

  return `
    <div class="profile-comment__actions">
      <button
        type="button"
        class="profile-post__menu-toggle profile-comment__menu-toggle"
        data-comment-menu-toggle="${escapeHtml(comment.id)}"
        data-comment-menu-post="${escapeHtml(comment.postId)}"
        aria-label="${t("profile.commentActionsAria")}"
        aria-expanded="false"
      >
        <span></span><span></span><span></span>
      </button>
      <div
        class="profile-post__menu profile-comment__menu"
        data-comment-menu="${escapeHtml(comment.id)}"
        data-comment-menu-post="${escapeHtml(comment.postId)}"
        hidden
      >
        ${
          canEdit
            ? `<button
                type="button"
                class="profile-post__menu-action"
                data-comment-edit="${escapeHtml(comment.id)}"
                data-comment-edit-post="${escapeHtml(comment.postId)}"
              >${t("profile.editComment")}</button>`
            : ""
        }
        <button
          type="button"
          class="profile-post__menu-action profile-post__menu-action--danger"
          data-comment-delete="${escapeHtml(comment.id)}"
          data-comment-delete-post="${escapeHtml(comment.postId)}"
          data-comment-delete-count="${removedCount}"
        >${t("profile.deleteComment")}</button>
      </div>
    </div>
  `;
}

export function renderCommentEditFormHtml(postId: string, commentId: string, text: string): string {
  return `
    <form
      class="profile-comment-edit"
      data-comment-edit-form="${escapeHtml(commentId)}"
      data-comment-edit-post="${escapeHtml(postId)}"
      data-comment-edit-original="${escapeHtml(text)}"
      novalidate
    >
      <textarea
        class="profile-comment-edit__field"
        data-comment-edit-input="${escapeHtml(commentId)}"
        maxlength="2000"
        rows="2"
        placeholder="${t("profile.commentEditPlaceholder")}"
      >${escapeHtml(text)}</textarea>
      <div class="profile-comment-edit__actions">
        <button type="submit" class="profile-comment-edit__save">
          ${t("profile.saveComment")}
        </button>
        <button
          type="button"
          class="profile-comment-edit__cancel"
          data-comment-edit-cancel="${escapeHtml(commentId)}"
        >
          ${t("profile.cancelCommentEdit")}
        </button>
      </div>
      <p class="profile-comment-edit__error" data-comment-edit-error="${escapeHtml(commentId)}" hidden></p>
    </form>
  `;
}

export function renderSingleCommentHtml(
  comment: PostComment,
  isReply = false,
  options: RenderCommentOptions = {},
): string {
  const authorName = buildCommentAuthorName(comment.author);
  const profilePath = commentAuthorPath(comment.author);
  const showReply = options.showReply !== false;
  const relativeTime = formatCommentTime(comment.createdAt);
  const exactTime = formatCommentExactTime(comment.createdAt);
  const avatarHtml = renderAvatarMarkup(
    "profile-comment__avatar",
    authorName,
    comment.author.avatarURL,
    { width: 32, height: 32 },
  );
  const likeClass = `profile-comment__like${comment.isLiked ? " profile-comment__like--liked" : ""}`;
  const likesText = String(Math.max(0, comment.likes));
  const repliesText = String(Math.max(0, comment.repliesCount));
  const actionsHtml = renderCommentActions(comment, isReply);
  const replyBtn =
    isReply || !showReply
      ? ""
      : `<button type="button" class="profile-comment__reply-btn"
        data-comment-reply="${escapeHtml(comment.id)}"
        data-reply-post="${escapeHtml(comment.postId)}"
        data-reply-author="${escapeHtml(authorName)}"
        aria-label="${t("profile.commentReply")}"
        title="${t("profile.commentReply")}"
      ><img src="/assets/img/icons/chat.svg" class="profile-comment__reply-icon" alt=""><span class="profile-comment__action-count">${escapeHtml(repliesText)}</span></button>`;

  return `<div class="profile-comment${isReply ? " profile-comment--reply" : ""}" data-comment-id="${escapeHtml(comment.id)}">
    <a href="${escapeHtml(profilePath)}" data-link class="profile-comment__avatar-link">${avatarHtml}</a>
    <div class="profile-comment__body">
      <div class="profile-comment__head">
        <a href="${escapeHtml(profilePath)}" data-link class="profile-comment__author">${escapeHtml(authorName)}</a>
        ${actionsHtml}
      </div>
      <div class="profile-comment__bubble">${escapeHtml(comment.text)}</div>
      <div class="profile-comment__footer">
        <button type="button" class="${likeClass}"
          data-comment-like="${escapeHtml(comment.id)}"
          data-comment-like-post="${escapeHtml(comment.postId)}"
          aria-pressed="${comment.isLiked ? "true" : "false"}"
        ><span class="profile-comment__like-icon" aria-hidden="true"></span><span class="profile-comment__action-count profile-comment__like-count">${escapeHtml(likesText)}</span></button>
        ${replyBtn}
        <time
          class="profile-comment__time"
          ${exactTime ? `data-tooltip="${escapeHtml(exactTime)}"` : ""}
          ${exactTime ? `title="${escapeHtml(exactTime.replace(/\n/g, " "))}"` : ""}
          ${comment.createdAt ? `datetime="${escapeHtml(comment.createdAt)}"` : ""}
          aria-label="${exactTime ? `${t("postcard.exactDateAria")} ${escapeHtml(exactTime.replace(/\n/g, ", "))}` : escapeHtml(relativeTime)}"
        >${escapeHtml(relativeTime)}</time>
      </div>
    </div>
  </div>`;
}

export function renderCommentItemHtml(
  comment: PostComment,
  firstReply?: PostComment,
  options: RenderCommentOptions = {},
): string {
  const remaining = comment.repliesCount - 1;
  const showMoreBtn =
    comment.repliesCount > 1
      ? `<button type="button" class="profile-comment-more-replies"
          data-show-replies="${escapeHtml(comment.id)}"
          data-show-replies-post="${escapeHtml(comment.postId)}"
          data-show-replies-count="${comment.repliesCount}"
        >${t("profile.commentShowReplies")
          .replace("{{remaining}}", String(remaining))
          .replace("{{total}}", String(comment.repliesCount))}</button>`
      : "";

  const repliesSection =
    comment.repliesCount > 0
      ? `<div class="profile-comment-replies" data-comment-replies="${escapeHtml(comment.id)}">
          ${firstReply ? renderSingleCommentHtml(firstReply, true, options) : ""}
          ${showMoreBtn}
        </div>`
      : "";

  return `<div class="profile-comment-item" data-comment-item="${escapeHtml(comment.id)}">
    ${renderSingleCommentHtml(comment, false, options)}
    ${repliesSection}
  </div>`;
}

export function renderCommentItemsHtml(
  comments: PostComment[],
  firstReplies: Record<string, PostComment[]> = {},
  options: RenderCommentOptions = {},
): string {
  return comments
    .map((comment) => renderCommentItemHtml(comment, firstReplies[comment.id]?.[0], options))
    .join("");
}

export function renderCommentsHeaderHtml(totalCount: number): string {
  return `<p class="profile-comment-header-label">${escapeHtml(
    t("profile.commentsHeader").replace("{{n}}", String(totalCount)),
  )}</p>`;
}

export function renderMoreCommentsButtonHtml(
  postId: string,
  loadedCount: number,
  totalCount: number,
): string {
  const remainingCount = Math.max(0, totalCount - loadedCount);
  if (remainingCount <= 0) return "";

  const nextCount = Math.min(COMMENT_PAGE_SIZE, remainingCount);

  return `<button type="button" class="profile-comment-more-comments"
    data-show-more-comments
    data-show-more-comments-post="${escapeHtml(postId)}"
  >${escapeHtml(t("profile.commentShowMore").replace("{{count}}", String(nextCount)))}</button>`;
}

export function renderCommentsListHtml(
  postId: string,
  comments: PostComment[],
  firstReplies: Record<string, PostComment[]> = {},
  options: RenderCommentsListOptions = {},
): string {
  const totalCount = Math.max(options.totalCount ?? comments.length, comments.length);

  return (
    renderCommentsHeaderHtml(totalCount) +
    renderCommentItemsHtml(comments, firstReplies, options) +
    renderMoreCommentsButtonHtml(postId, comments.length, totalCount)
  );
}
