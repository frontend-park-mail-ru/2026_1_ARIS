import { escapeHtml } from "./avatar";

type CommentBlockSkeletonOptions = {
  commentsEl: HTMLElement;
  postId: string;
  listAttribute: string;
};

export type CommentBlockSkeletonState = {
  commentsEl: HTMLElement;
  previousHtml: string;
  trailingHtml: string;
  height: string;
  minHeight: string;
  overflow: string;
};

function renderCommentSkeletonRow(index: number): string {
  const textWidth = [68, 82, 54][index % 3] ?? 68;
  const metaWidth = [116, 86, 134][index % 3] ?? 116;

  return `
    <div style="display:grid;grid-template-columns:32px 1fr;gap:10px;align-items:start">
      <span class="avatar-skeleton" style="width:32px;height:32px"></span>
      <div style="display:flex;min-width:0;flex-direction:column;gap:7px">
        <span class="skeleton" style="display:block;width:${metaWidth}px;max-width:48%;height:14px"></span>
        <span class="skeleton" style="display:block;width:${textWidth}%;height:14px"></span>
        <div style="display:flex;align-items:center;gap:20px;margin-top:1px">
          <span class="skeleton" style="display:block;width:42px;height:18px"></span>
          <span class="skeleton" style="display:block;width:42px;height:18px"></span>
          <span class="skeleton" style="display:block;width:72px;height:12px;margin-left:auto"></span>
        </div>
      </div>
    </div>
  `;
}

function renderCommentListSkeletonHtml(): string {
  return `
    <span class="skeleton" style="display:block;width:148px;height:16px"></span>
    ${Array.from({ length: 3 }, (_, index) => renderCommentSkeletonRow(index)).join("")}
  `;
}

function renderCommentComposeSkeletonHtml(): string {
  return `
    <div data-comment-compose-skeleton style="display:grid;grid-template-columns:32px 1fr;gap:10px;align-items:center">
      <span class="avatar-skeleton" style="width:32px;height:32px"></span>
      <div style="display:grid;grid-template-columns:1fr 106px;gap:10px;min-width:0">
        <span class="skeleton" style="display:block;height:46px;border-radius:var(--radius-small)"></span>
        <span class="skeleton" style="display:block;height:46px;border-radius:var(--radius-small)"></span>
      </div>
    </div>
  `;
}

function collectTrailingHtml(listEl: HTMLElement): string {
  const parts: string[] = [];
  let node = listEl.nextSibling;

  while (node) {
    parts.push(node instanceof HTMLElement ? node.outerHTML : (node.textContent ?? ""));
    node = node.nextSibling;
  }

  return parts.join("");
}

function restoreCommentBlockStyles(state: CommentBlockSkeletonState): void {
  state.commentsEl.style.height = state.height;
  state.commentsEl.style.minHeight = state.minHeight;
  state.commentsEl.style.overflow = state.overflow;
}

export function showFixedCommentBlockSkeleton({
  commentsEl,
  postId,
  listAttribute,
}: CommentBlockSkeletonOptions): CommentBlockSkeletonState | null {
  const listEl = commentsEl.querySelector<HTMLElement>(
    `[${listAttribute}="${CSS.escape(postId)}"]`,
  );
  if (!listEl) return null;

  const measuredHeight = commentsEl.getBoundingClientRect().height;
  const state: CommentBlockSkeletonState = {
    commentsEl,
    previousHtml: commentsEl.innerHTML,
    trailingHtml: collectTrailingHtml(listEl),
    height: commentsEl.style.height,
    minHeight: commentsEl.style.minHeight,
    overflow: commentsEl.style.overflow,
  };

  commentsEl.style.height = `${measuredHeight}px`;
  commentsEl.style.minHeight = `${measuredHeight}px`;
  commentsEl.style.overflow = "hidden";
  commentsEl.innerHTML = `
    <div class="profile-post__comment-list" ${listAttribute}="${escapeHtml(postId)}">
      ${renderCommentListSkeletonHtml()}
    </div>
    ${state.trailingHtml.trim() ? renderCommentComposeSkeletonHtml() : ""}
  `;

  return state;
}

export function completeFixedCommentBlockSkeleton(state: CommentBlockSkeletonState | null): void {
  if (!state) return;

  const composeSkeleton = state.commentsEl.querySelector("[data-comment-compose-skeleton]");
  if (composeSkeleton) {
    if (state.trailingHtml.trim()) {
      composeSkeleton.outerHTML = state.trailingHtml;
    } else {
      composeSkeleton.remove();
    }
  }

  restoreCommentBlockStyles(state);
}

export function restoreFixedCommentBlockSkeleton(state: CommentBlockSkeletonState | null): void {
  if (!state) return;

  state.commentsEl.innerHTML = state.previousHtml;
  restoreCommentBlockStyles(state);
}
