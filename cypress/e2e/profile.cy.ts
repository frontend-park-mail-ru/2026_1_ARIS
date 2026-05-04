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
});
