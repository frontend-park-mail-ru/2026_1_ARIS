import { friends } from "../support/data";

describe("друзья", () => {
  it("отображает друзей и фильтрует их через поиск", () => {
    cy.mockAuthApi();

    cy.visitApp({ path: "/friends", authenticated: true });
    cy.wait("@friendsAccepted");

    cy.contains("[data-friend-id='2']", "Аня Орлова").should("be.visible");
    cy.contains("[data-friend-id='3']", "Илья Петров").should("be.visible");

    cy.get("[data-friends-search]").type("илья");
    cy.wait("@friendsSearch").its("request.url").should("include", "q=%D0%B8%D0%BB%D1%8C%D1%8F");
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
    cy.get('[data-friend-menu-toggle="4"]').click();
    cy.get('[data-friend-accept="4"]').click();

    cy.get("[data-app-toast]")
      .should("have.class", "profile-toast--visible")
      .and("contain", "Заявка в друзья принята.");
    cy.wait("@acceptFriend");
    cy.contains("[data-friend-id='4']", "Олег Заявкин").should("not.exist");
  });

  it("удаляет принятого друга с подтверждением и уведомлением", () => {
    let accepted = [...friends.accepted];
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/friends/accepted", (req) => {
      req.reply({ body: { friends: accepted } });
    }).as("acceptedMutable");
    cy.intercept("DELETE", "**/api/friends/2", (req) => {
      accepted = accepted.filter((friend) => friend.id !== 2);
      req.reply({ body: {} });
    }).as("deleteFriend");

    cy.visitApp({ path: "/friends", authenticated: true });
    cy.get('[data-friend-menu-toggle="2"]').click();
    cy.get('[data-friend-open-delete="2"]').click();

    cy.get("[data-friends-modal-backdrop]").should("be.visible");
    cy.contains(".friends-modal__name", "Аня Орлова").should("be.visible");
    cy.get('[data-friend-confirm-delete="2"]').click();

    cy.get("[data-app-toast]")
      .should("have.class", "profile-toast--visible")
      .and("contain", "Пользователь удалён из друзей.");
    cy.wait("@deleteFriend");
    cy.get("[data-friends-modal-backdrop]").should("not.exist");
    cy.contains("[data-friend-id='2']", "Аня Орлова").should("not.exist");
  });

  it("открывает личный чат из карточки друга", () => {
    cy.mockAuthApi();
    cy.mockChatsApi();

    cy.visitApp({ path: "/friends", authenticated: true });
    cy.get('[data-friend-menu-toggle="2"]').click();
    cy.get('[data-friend-open-chat="2"]').click();

    cy.wait("@createPrivateChat");
    cy.location("pathname").should("eq", "/chats");
    cy.location("search").should("include", "chatId=chat-2");
    cy.contains(".chat-header__title", "Аня Орлова").should("be.visible");
  });
});
