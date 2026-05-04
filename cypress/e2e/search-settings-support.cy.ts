describe("поиск, настройки и поддержка", () => {
  it("ищет из шапки авторизованного пользователя", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/search?*", {
      body: {
        users: [
          {
            profileId: 2,
            userAccountId: 2,
            username: "anya",
            firstName: "Аня",
            lastName: "Орлова",
          },
        ],
        communities: [
          {
            id: 10,
            profileId: 100,
            username: "boardgames",
            title: "Клуб настольных игр",
            bio: "Играем и обсуждаем новинки.",
            type: "public",
          },
        ],
      },
    }).as("search");

    cy.visitApp({ path: "/feed", authenticated: true });
    cy.get("[data-header-search]").type("клуб{enter}");

    cy.wait("@search").its("request.url").should("include", "q=%D0%BA%D0%BB%D1%83%D0%B1");
    cy.location("pathname").should("eq", "/search");
    cy.contains(".search-section__heading", "Люди").should("be.visible");
    cy.contains(".search-result-card__name", "Аня Орлова").should("be.visible");
    cy.contains(".search-result-card__name", "Клуб настольных игр").should("be.visible");
  });

  it("показывает подсказку пустого поиска без запроса", () => {
    cy.mockAuthApi();

    cy.visitApp({ path: "/search", authenticated: true });

    cy.contains(".search-panel__title", "Поиск").should("be.visible");
    cy.contains("Введите запрос, чтобы найти людей и сообщества.").should("be.visible");
  });

  it("сохраняет тёмную тему в настройках", () => {
    cy.mockAuthApi();

    cy.visitApp({ path: "/settings", authenticated: true });
    cy.wait("@settings");
    cy.wait([
      "@suggestedUsers",
      "@popularUsers",
      "@latestEvents",
      "@friendsAccepted",
      "@friendsIncoming",
      "@friendsOutgoing",
    ]);
    cy.get("[data-theme-toggle]").check({ force: true });

    cy.wait("@saveSettings").its("request.body").should("deep.equal", {
      theme: "dark",
    });
    cy.document().its("documentElement").should("have.attr", "data-theme", "dark");
  });

  it("создаёт обращение в поддержку", () => {
    cy.mockAuthApi();
    cy.mockSupportApi();

    cy.visitApp({ path: "/support", authenticated: true });
    cy.get("[data-sw-form]").within(() => {
      cy.get('[name="login"]').type("maria");
      cy.get('[name="email"]').clear().type("maria@example.com");
      cy.get('[name="title"]').type("Ошибка в профиле");
      cy.get('[name="description"]').type("Не сохраняется поле города в профиле.");
    });
    cy.get("[data-sw-form]").submit();

    cy.wait("@createTicket").its("request.body").should("deep.include", {
      category: 0,
      login: "maria",
      email: "maria@example.com",
      title: "Ошибка в профиле",
      description: "Не сохраняется поле города в профиле.",
    });
    cy.contains("[data-sw-success]", "Обращение отправлено").should("be.visible");
  });

  it("открывает детали обращения и отправляет сообщение в чат", () => {
    cy.mockAuthApi();
    cy.mockSupportApi();

    cy.visitApp({ path: "/support", authenticated: true });
    cy.get('[data-sw-tab="my"]').click();
    cy.wait("@myTickets");
    cy.contains("[data-ticket-id='501']", "Ошибка в профиле").click();
    cy.wait("@ticketMessages");

    cy.get("[data-sw-ticket-modal]").should("not.have.attr", "hidden");
    cy.contains("[data-sw-ticket-modal-body]", "Ошибка в профиле").should("exist");
    cy.contains("[data-sw-ticket-modal-body]", "Мы уже смотрим проблему.").should("exist");

    cy.get("[data-sw-chat-input]").type("Спасибо за ответ.", { force: true });
    cy.get("[data-sw-chat-form]").submit();

    cy.wait("@sendTicketMessage").its("request.body").should("deep.equal", {
      text: "Спасибо за ответ.",
    });
    cy.contains("[data-sw-ticket-modal-body]", "Спасибо за ответ.").should("exist");
  });
});
