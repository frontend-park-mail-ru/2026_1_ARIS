import { profilePosts } from "../support/data";

describe("профиль", () => {
  it("отображает мой профиль с деталями и постами", () => {
    cy.mockAuthApi();
    cy.mockProfileApi();

    cy.visitApp({ path: "/profile", authenticated: true });

    cy.contains(".profile-card h1", "Мария Соколова").should("be.visible");
    cy.contains(".profile-card", "QA-инженер ARIS").should("be.visible");
    cy.contains("[data-profile-post-card]", "Первый пост профиля.").should("be.visible");
  });

  it("открывает редактор и сохраняет изменённые поля профиля", () => {
    cy.mockAuthApi();
    cy.mockProfileApi();
    cy.intercept("PATCH", "**/api/profile/me/edit", {
      body: {},
    }).as("saveProfile");

    cy.visitApp({ path: "/profile", authenticated: true });
    cy.get("[data-profile-edit-toggle]").click();
    cy.get('[data-profile-edit-form] [name="town"]').clear().type("Санкт-Петербург");
    cy.get("[data-profile-edit-form]").submit();

    cy.wait("@saveProfile").its("request.body").should("deep.include", {
      town: "Санкт-Петербург",
    });
  });

  it("создаёт пост в профиле", () => {
    cy.mockAuthApi();
    cy.mockProfileApi();

    cy.visitApp({ path: "/profile", authenticated: true });
    cy.get("[data-profile-post-open]").click();
    cy.get("[data-profile-post-text]").type("Новый пост из Cypress.");
    cy.get("[data-profile-post-save]").click();

    cy.wait("@createPost").its("request.body").should("deep.include", {
      text: "Новый пост из Cypress.",
    });
    cy.contains("[data-profile-post-card]", "Новый пост из Cypress.").should("be.visible");
  });

  it("фильтрует посты профиля через поиск", () => {
    cy.mockAuthApi();
    cy.mockProfileApi();

    cy.visitApp({ path: "/profile", authenticated: true });
    cy.get("[data-profile-post-search-open]").click();
    cy.get("[data-profile-post-search]").type("первый");
    cy.contains("[data-profile-post-card]", "Первый пост профиля.").should("be.visible");
    cy.get("[data-profile-post-search]").clear().type("такого текста нет");
    cy.get("[data-profile-post-card]").should("not.be.visible");
    cy.get("[data-profile-post-search-empty]").should("be.visible");
  });

  it("ставит лайк посту профиля", () => {
    cy.mockAuthApi();
    cy.mockProfileApi();

    cy.visitApp({ path: "/profile", authenticated: true });
    cy.get('[data-profile-post-like="301"]').click();

    cy.wait("@likeProfilePost");
    cy.get('[data-profile-post-like="301"]')
      .should("have.attr", "aria-pressed", "true")
      .contains("5");
  });

  it("подгружает комментарии поста по три", () => {
    const comments = Array.from({ length: 7 }, (_item, index) => {
      const id = index + 1;
      return {
        id,
        uid: `comment-${id}`,
        text: `Комментарий ${id}`,
        postId: 301,
        author: {
          profileID: 1,
          firstName: "Мария",
          lastName: "Соколова",
          username: "maria",
        },
        createdAt: "2026-05-26T10:00:00.000Z",
        updatedAt: "2026-05-26T10:00:00.000Z",
        repliesCount: 0,
        likes: 0,
        isLiked: false,
      };
    });

    cy.mockAuthApi();
    cy.mockProfileApi();
    cy.intercept("GET", "**/api/post/me*", {
      body: {
        posts: [{ ...profilePosts.posts[0], comments: comments.length }],
      },
    }).as("myPostsWithComments");
    cy.intercept("GET", "**/api/post/301/comments?*", (req) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? 3);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      req.reply({ body: comments.slice(offset, offset + limit) });
    }).as("postComments");

    cy.visitApp({ path: "/profile", authenticated: true });
    cy.wait("@myPostsWithComments");
    cy.get('[data-profile-post-toggle-comments="301"]').click();

    cy.wait("@postComments").its("request.url").should("include", "limit=3");
    cy.contains("[data-profile-post-comment-list='301']", "Комментарий 1").should("be.visible");
    cy.contains("[data-profile-post-comment-list='301']", "Комментарий 3").should("be.visible");
    cy.contains("[data-profile-post-comment-list='301']", "Комментарий 4").should("not.exist");

    cy.get("[data-show-more-comments]").click();
    cy.wait("@postComments").its("request.url").should("include", "offset=3");
    cy.contains("[data-profile-post-comment-list='301']", "Комментарий 6").should("be.visible");
    cy.contains("[data-profile-post-comment-list='301']", "Комментарий 7").should("not.exist");

    cy.get("[data-show-more-comments]").click();
    cy.wait("@postComments").its("request.url").should("include", "offset=6");
    cy.contains("[data-profile-post-comment-list='301']", "Комментарий 7").should("be.visible");
    cy.get("[data-show-more-comments]").should("not.exist");
  });
});
