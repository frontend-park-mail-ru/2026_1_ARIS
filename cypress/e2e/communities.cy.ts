import { communityPosts } from "../support/data";

describe("сообщества", () => {
  it("отображает сообщества пользователя и фильтрует список", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();

    cy.visitApp({ path: "/communities", authenticated: true });
    cy.wait("@communities");

    cy.contains("[data-community-card='10']", "Клуб настольных игр").should("be.visible");
    cy.get("[data-communities-search]").type("нет такого");
    cy.contains("Ничего не найдено").should("be.visible");
  });

  it("валидирует и создаёт сообщество через мастер", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();

    cy.visitApp({ path: "/communities", authenticated: true });
    cy.get("[data-community-create-open]").click();
    cy.get("[data-community-form-modal]").should("be.visible");

    cy.get("[data-community-form-next]").click();
    cy.contains(".community-modal__error", "Введите название сообщества.").should("be.visible");

    cy.get("[data-community-title]").type("Cypress клуб");
    cy.get("[data-community-form-next]").click();
    cy.get("[data-community-bio]").type("Сообщество создано из e2e.");
    cy.get("[data-community-form-next]").click();
    cy.get("[data-community-form-next]").click();
    cy.get("[data-community-form]").submit();

    cy.wait("@createCommunity").its("request.body").should("deep.include", {
      title: "Cypress клуб",
      bio: "Сообщество создано из e2e.",
      type: "public",
    });
    cy.location("pathname").should("eq", "/communities/77");
    cy.contains("h1", "Cypress клуб").should("be.visible");
  });

  it("отображает детали сообщества и фильтрует посты", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();

    cy.visitApp({ path: "/communities/10", authenticated: true });
    cy.wait("@communityDetail");

    cy.contains("h1", "Клуб настольных игр").should("be.visible");
    cy.contains("[data-community-post='401']", "Официальный анонс встречи.").should("be.visible");
    cy.get("[data-community-post-search-open]").click();
    cy.get("[data-community-post-search]").type("zzz");
    cy.contains(".profile-empty-copy", "Ничего не найдено").should("be.visible");
  });

  it("создаёт пост сообщества", () => {
    let posts = communityPosts;
    cy.mockAuthApi();
    cy.mockCommunitiesApi();
    cy.intercept("GET", "**/api/post/community/10?*", (req) => {
      req.reply({ body: posts });
    }).as("communityPostsMutable");
    cy.intercept("POST", "**/api/post/upload", (req) => {
      posts = {
        posts: [
          {
            id: 402,
            profileID: 100,
            communityId: 10,
            firstName: "Клуб",
            lastName: "Настольных игр",
            text: "Пост сообщества из Cypress.",
            createdAt: "2026-05-04T10:10:00.000Z",
            likes: 0,
            isLiked: false,
          },
          ...communityPosts.posts,
        ],
      };
      req.reply({ body: posts.posts[0] });
    }).as("createCommunityPostMutable");

    cy.visitApp({ path: "/communities/10", authenticated: true });
    cy.get("[data-community-post-open]").click();
    cy.get("[data-community-post-text]").type("Пост сообщества из Cypress.");
    cy.get("[data-community-post-save]").click();

    cy.wait("@createCommunityPostMutable").its("request.body").should("deep.include", {
      text: "Пост сообщества из Cypress.",
      communityId: 10,
      authorProfileId: 100,
    });
    cy.contains("[data-community-post='402']", "Пост сообщества из Cypress.").should("be.visible");
  });

  it("ставит лайк посту сообщества", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();

    cy.visitApp({ path: "/communities/10", authenticated: true });
    cy.get('[data-community-post-like="401"]').click();

    cy.wait("@likeCommunityPost");
    cy.get('[data-community-post-like="401"]')
      .should("have.attr", "aria-pressed", "true")
      .contains("6");
  });
});
