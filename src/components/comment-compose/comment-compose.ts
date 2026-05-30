import { t } from "../../state/i18n";
import { escapeHtml, renderAvatarMarkup } from "../../utils/avatar";

export type CommentComposeOptions = {
  postId: string;
  userName: string;
  avatarLink?: string | undefined;
  formAttribute: string;
  inputAttribute: string;
  errorAttribute: string;
};

export function renderCommentCompose({
  postId,
  userName,
  avatarLink,
  formAttribute,
  inputAttribute,
  errorAttribute,
}: CommentComposeOptions): string {
  const safePostId = escapeHtml(postId);

  return `
    <div class="comment-compose">
      ${renderAvatarMarkup("comment-compose__avatar", userName, avatarLink, {
        width: 32,
        height: 32,
      })}
      <form class="comment-compose__form" ${formAttribute}="${safePostId}" novalidate>
        <div class="comment-compose__input-group">
          <input
            type="text"
            class="comment-compose__field"
            placeholder="${t("profile.commentPlaceholder")}"
            ${inputAttribute}="${safePostId}"
            maxlength="2000"
            autocomplete="off"
          >
        </div>
        <button type="submit" class="comment-compose__send">
          ${t("profile.commentSubmit")}
        </button>
      </form>
    </div>
    <p class="comment-compose__error" ${errorAttribute}="${safePostId}" hidden></p>
  `;
}
