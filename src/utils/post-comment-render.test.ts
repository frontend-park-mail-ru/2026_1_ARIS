// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { PostComment } from "../api/posts";
import { renderCommentsListHtml, renderSingleCommentHtml } from "./post-comment-render";

function makeComment(id: string, likes = 0): PostComment {
  return {
    id,
    uid: id,
    text: `Комментарий ${id}`,
    postId: "10",
    author: {
      profileID: 2,
      firstName: "Мария",
      lastName: "Соколова",
      username: "maria",
    },
    createdAt: "2026-05-26T10:00:00.000Z",
    updatedAt: "2026-05-26T10:00:00.000Z",
    repliesCount: 0,
    likes,
    isLiked: likes > 0,
  };
}

describe("post-comment-render", () => {
  it("показывает нулевые счётчики лайков и ответов", () => {
    const html = renderSingleCommentHtml(makeComment("1"));

    expect(html).toContain("profile-comment__like-count");
    expect(html).toContain(
      '<span class="profile-comment__action-count profile-comment__like-count">0</span>',
    );
    expect(html).toContain('<span class="profile-comment__action-count">0</span>');
  });

  it("рендерит кнопку дозагрузки, если комментариев больше первой страницы", () => {
    const html = renderCommentsListHtml(
      "10",
      [makeComment("1"), makeComment("2"), makeComment("3")],
      {},
      { totalCount: 7 },
    );

    expect(html).toContain('data-show-more-comments-post="10"');
    expect(html).toContain("Показать ещё 3");
  });
});
