import { friends } from "../support/data";

describe("друзья", () => {
  it("отображает друзей и фильтрует их через поиск", () => {
    cy.mockAuthApi();

    cy.visitApp({ path: "/friends", authenticated: true });
    cy.wait("@friendsAccepted");

    cy.contains("[data-friend-id='2']", "Аня Орлова").should("be.visible");
    cy.contains("[data-friend-id='3']", "Илья Петров").should("be.visible");

    cy.get("[data-friends-search]").type("илья");
    cy.contains("[data-friend-id='3']", "Илья Петров").should("be.visible");
    cy.contains("[data-friend-id='2']", "Аня Орлова").should("not.exist");
  });

  it("переключается на входящие заявки и принимает друга", () => {
    let incoming = [...friends.incoming];
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/friends/requests/incoming/pending", (req) => {
      req.reply({ body: { friends: incoming } });
    }).as("incomingMutable");
    cy.intercept("POST", "**/api/friends/accept/4", (req) => {
      incoming = [];
      req.reply({ body: {} });
    }).as("acceptFriend");

    cy.visitApp({ path: "/friends", authenticated: true });
    cy.get('[data-friends-tab="incoming"]').click();
    cy.contains("[data-friend-id='4']", "Олег Заявкин").should("be.visible");
    cy.get('[data-friend-accept="4"]').click();

    cy.wait("@acceptFriend");
    cy.contains("[data-friend-id='4']", "Олег Заявкин").should("not.exist");
  });

  it("открывает подтверждение удаления для принятого друга", () => {
    cy.mockAuthApi();

    cy.visitApp({ path: "/friends", authenticated: true });
    cy.get('[data-friend-open-delete="2"]').click();

    cy.get("[data-friends-modal-backdrop]").should("be.visible");
    cy.contains(".friends-modal__name", "Аня Орлова").should("be.visible");
    cy.get("[data-friends-modal-close]").last().click();
    cy.get("[data-friends-modal-backdrop]").should("not.exist");
  });

  it("открывает личный чат из карточки друга", () => {
    cy.mockAuthApi();
    cy.mockChatsApi();

    cy.visitApp({ path: "/friends", authenticated: true });
    cy.get('[data-friend-open-chat="2"]').click();

    cy.wait("@createPrivateChat");
    cy.location("pathname").should("eq", "/chats");
    cy.location("search").should("include", "chatId=chat-2");
    cy.contains(".chat-header__title", "Аня Орлова").should("be.visible");
  });
});
