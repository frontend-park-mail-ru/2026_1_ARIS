describe("лента", () => {
  it("отображает публичную ленту и рекомендации для гостя", () => {
    cy.mockGuestApi();

    cy.visitApp("/feed");

    cy.wait("@publicFeed");
    cy.contains(".postcard__text", "Публичная лента ARISNET доступна без регистрации.").should(
      "be.visible",
    );
    cy.contains(".widgetbar-card__title", "Популярные пользователи").should("be.visible");
    cy.contains(".widgetbar-card__username", "Иван Кузнецов").should("be.visible");
  });

  it("открывает модальное окно входа при клике гостя по защищённой навигации", () => {
    cy.mockGuestApi();

    cy.visitApp("/feed");
    cy.wait("@publicFeed");
    cy.wait("@popularUsers");
    cy.get('.sidebar a[href="/friends"]').click();

    cy.get("[data-auth-modal]").should("be.visible");
    cy.contains(".auth-form__title", "Вход").should("be.visible");
    cy.location("pathname").should("eq", "/feed");
  });

  it("отображает только посты друзей в авторизованной ленте", () => {
    cy.mockAuthApi();

    cy.visitApp({ path: "/feed", authenticated: true });

    cy.wait("@feed");
    cy.contains(".postcard__text", "Пост друга в авторизованной ленте.").should("be.visible");
    cy.contains(".postcard__text", "Этот пост не должен попасть в ленту друзей.").should(
      "not.exist",
    );
  });

  it("переключает лайк у поста в авторизованной ленте", () => {
    cy.mockAuthApi();
    cy.intercept("POST", "**/api/post/201/likes", {
      body: {
        id: 201,
        profileID: 2,
        text: "Пост друга в авторизованной ленте.",
        likes: 3,
        isLiked: true,
      },
    }).as("likeFeedPost");

    cy.visitApp({ path: "/feed", authenticated: true });
    cy.get('[data-post-id="201"] [data-action="like"]').click();

    cy.wait("@likeFeedPost");
    cy.get('[data-post-id="201"] [data-action="like"]')
      .should("have.attr", "aria-pressed", "true")
      .find(".postcard__stat-count")
      .should("have.text", "3");
  });

  it("сохраняет выбранный режим ленты", () => {
    cy.mockAuthApi();

    cy.visitApp({ path: "/feed", authenticated: true });
    cy.wait([
      "@feed",
      "@suggestedUsers",
      "@popularUsers",
      "@latestEvents",
      "@friendsAccepted",
      "@friendsIncoming",
      "@friendsOutgoing",
    ]);
    cy.get('.sidebar [data-feed-mode="for-you"]').should("be.visible").click();

    cy.window().then((win) => {
      expect(win.localStorage.getItem("feedMode")).to.eq("for-you");
    });
    cy.get('.sidebar [data-feed-mode="for-you"]').should("have.class", "sidebar-item--active");
  });

  it("показывает офлайн-заглушку, когда публичная лента недоступна", () => {
    cy.intercept("GET", "**/api/public/feed*", {
      statusCode: 503,
      body: { error: "service unavailable" },
    }).as("publicFeedDown");
    cy.intercept("GET", "**/api/public/popular-users", {
      body: { items: [] },
    });

    cy.visitApp("/feed");

    cy.wait("@publicFeedDown");
    cy.contains("Лента временно недоступна").should("be.visible");
    cy.contains("Не удалось загрузить публичную ленту.").should("be.visible");
  });
});
