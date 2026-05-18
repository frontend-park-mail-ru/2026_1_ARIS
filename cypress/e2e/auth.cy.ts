import { sessionUser } from "../support/data";

describe("авторизация и регистрация", () => {
  it("показывает ошибки валидации входа для пустых обязательных полей", () => {
    cy.visitApp("/login");

    cy.get(".auth-form__submit").click();

    cy.contains(".auth-form__field-error", "Обязательное поле").should("be.visible");
    cy.location("pathname").should("eq", "/login");
  });

  it("показывает ошибку входа с сервера и помечает данные как неверные", () => {
    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 401,
      body: { error: "invalid credentials" },
    }).as("loginFailed");

    cy.visitApp("/login");
    cy.get('[name="login"]').type("wronguser");
    cy.get('[name="password"]').type("bad-password");
    cy.get(".auth-form__form").submit();

    cy.wait("@loginFailed");
    cy.contains(".auth-form__error", "Неверный логин или пароль").should("be.visible");
    cy.get('[name="login"]').closest(".input").should("have.class", "input--error");
  });

  it("показывает ссылку входа через VK ID с backend returnTo", () => {
    cy.visitApp("/login");

    cy.contains("[data-auth-vkid-link]", "Войти через VK ID")
      .should("have.attr", "href")
      .and("include", "/api/auth/vkid/login?returnTo=%2Ffeed%3Foauth%3Dvkid");

    cy.visitApp("/register");

    cy.contains("[data-auth-vkid-link]", "Войти через VK ID")
      .should("have.attr", "href")
      .and("include", "/api/auth/vkid/login?returnTo=%2Ffeed%3Foauth%3Dvkid");
  });

  it("показывает ошибку VK ID callback на странице входа", () => {
    cy.visitApp("/login?oauth=vkid&error=access_denied");

    cy.contains(".auth-form__error", "Не удалось войти через VK ID").should("be.visible");
  });

  it("авторизует пользователя и открывает ленту", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/auth/me", {
      statusCode: 401,
      body: { error: "unauthorized" },
    }).as("authMeGuest");
    cy.intercept("POST", "**/api/auth/login", {
      body: sessionUser,
    }).as("login");

    cy.visitApp("/login");
    cy.get('[name="login"]').type("maria");
    cy.get('[name="password"]').type("strongpass");
    cy.get(".auth-form__form").submit();

    cy.wait("@login").its("request.body").should("deep.include", {
      login: "maria",
      password: "strongpass",
    });
    cy.location("pathname").should("eq", "/feed");
    cy.contains(".header__username", "Мария Соколова").should("be.visible");
    cy.contains(".postcard__text", "Пост друга в авторизованной ленте.").should("be.visible");
  });

  it("валидирует первый шаг регистрации перед переходом к полям профиля", () => {
    cy.intercept("POST", "**/api/auth/register/step-one", {
      body: { ok: true },
    }).as("validateStepOne");

    cy.visitApp("/register");
    cy.get('[name="login"]').type("short");
    cy.get("[data-register-next]").click();
    cy.contains(".auth-form__field-error", "Логин слишком короткий").should("be.visible");

    cy.get('[name="login"]').clear().type("newuser");
    cy.get('[name="password"]').type("strongpass");
    cy.get('[name="repeatPassword"]').type("strongpass");
    cy.get("[data-register-next]").click();

    cy.wait("@validateStepOne").its("request.body").should("deep.include", {
      login: "newuser",
      password1: "strongpass",
      password2: "strongpass",
    });
    cy.get('.auth-form[data-register-step="2"]').should("exist");
    cy.contains(".auth-form__title", "Завершение регистрации").should("be.visible");
  });

  it("регистрирует нового пользователя и запускает сессию", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/auth/me", {
      statusCode: 401,
      body: { error: "unauthorized" },
    }).as("authMeGuest");
    cy.intercept("POST", "**/api/auth/register/step-one", {
      body: { ok: true },
    }).as("validateStepOne");
    cy.intercept("POST", "**/api/auth/register", {
      body: {
        id: "8",
        firstName: "Новый",
        lastName: "Пользователь",
        login: "newuser",
      },
    }).as("register");

    cy.visitApp("/register");
    cy.get('[name="login"]').type("newuser");
    cy.get('[name="password"]').type("strongpass");
    cy.get('[name="repeatPassword"]').type("strongpass");
    cy.get("[data-register-next]").click();
    cy.wait("@validateStepOne");

    cy.get('[name="firstName"]').type("Новый");
    cy.get('[name="lastName"]').type("Пользователь");
    cy.get('[name="gender"]').select("1");
    cy.get('[name="birthDate"]').type("04052000");
    cy.get(".auth-form__form").submit();

    cy.wait("@register").its("request.body").should("deep.include", {
      firstName: "Новый",
      lastName: "Пользователь",
      birthday: "04/05/2000",
      gender: 1,
      login: "newuser",
    });
    cy.location("pathname").should("eq", "/feed");
  });
});
