describe("чаты", () => {
  it("отображает список чатов и выбранный диалог", () => {
    cy.mockAuthApi();
    cy.mockChatsApi();

    cy.visitApp({ path: "/chats", authenticated: true });

    cy.wait("@chats");
    cy.contains("[data-chat-select='chat-2']", "Аня Орлова").should("be.visible");
    cy.contains(".chat-bubble__text", "Привет, как дела?").should("be.visible");
  });

  it("фильтрует чаты по названию", () => {
    cy.mockAuthApi();
    cy.mockChatsApi();

    cy.visitApp({ path: "/chats", authenticated: true });
    cy.get("[data-chat-search]").type("илья");

    cy.contains("[data-chat-select='chat-3']", "Илья Петров").should("be.visible");
    cy.contains("[data-chat-select='chat-2']", "Аня Орлова").should("not.exist");
  });

  it("выбирает другой чат и синхронизирует идентификатор чата в адресе страницы", () => {
    cy.mockAuthApi();
    cy.mockChatsApi();

    cy.visitApp({ path: "/chats", authenticated: true });
    cy.get("[data-chat-select='chat-3']").click();

    cy.location("search").should("include", "chatId=chat-3");
    cy.contains(".chat-header__title", "Илья Петров").should("be.visible");
  });

  it("отправляет сообщение с оптимистичным интерфейсом и подтверждением сервера", () => {
    cy.mockAuthApi();
    cy.mockChatsApi();

    cy.visitApp({ path: "/chats?chatId=chat-2", authenticated: true });
    cy.get(".chat-compose__field").type("Сообщение из Cypress");
    cy.get("[data-chat-compose-form]").submit();

    cy.contains(".chat-bubble__text", "Сообщение из Cypress").should("be.visible");
    cy.wait("@sendChatMessage").its("request.body").should("deep.equal", {
      text: "Сообщение из Cypress",
    });
  });
});
