const roomPlayers = [
  {
    profileId: "1",
    userAccountId: "1",
    name: "Мария Соколова",
    firstName: "Мария",
    lastName: "Соколова",
    username: "maria",
    avatarId: "",
    avatarUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%235b67e8'/%3E%3C/svg%3E",
    score: 0,
    isReady: true,
    hasAnswered: false,
    isMe: true,
  },
  {
    profileId: "2",
    userAccountId: "2",
    name: "Аня Орлова",
    firstName: "Аня",
    lastName: "Орлова",
    username: "anya",
    avatarId: "",
    avatarUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23358960'/%3E%3C/svg%3E",
    score: 0,
    isReady: true,
    hasAnswered: false,
    isMe: false,
  },
];

const oldCompletedAt = "2026-05-23T10:00:00.000Z";

function roomResponse(status: "waiting" | "active" | "finished", id = "42") {
  const players = roomPlayers.map((player) =>
    status === "finished" ? { ...player, isReady: false } : player,
  );

  return {
    id,
    title: "Комната Cypress",
    inviteCode: "AB12CD",
    gameType: "number_duel",
    status,
    createdByProfileId: "1",
    maxPlayers: 2,
    hasPassword: false,
    password: "",
    isRanked: false,
    inviteCodeEnabled: true,
    questionCount: 5,
    answerTimeoutSec: 30,
    creator: players[0],
    players,
    currentQuestion:
      status === "active"
        ? {
            id: "q-1",
            position: 1,
            text: "Сколько клеток на шахматной доске?",
            startedAt: new Date(Date.now() - 5_000).toISOString(),
            deadlineAt: new Date(Date.now() + 30_000).toISOString(),
            hasAnswered: false,
            answerUnit: "клеток",
          }
        : null,
    questions: [],
    nextQuestionAt: "",
    pausedByProfileId: "",
    pauseStartedAt: "",
    pauseUntilAt: "",
    pauseForceVotes: 0,
    pauseForceVotesRequired: 0,
    winnerProfileId: "",
    profileStats: null,
  };
}

function completedQuestion(position = 1, completedAt = new Date(Date.now() - 1_000).toISOString()) {
  const questions = [
    {
      text: "Сколько клеток на шахматной доске?",
      correctAnswer: 64,
      answerUnit: "клеток",
      answers: [
        {
          profileId: "1",
          answer: 60,
          distance: 4,
          answeredAt: "2026-05-23T10:00:04.200Z",
          responseTimeMs: 4200,
          isWinner: false,
        },
        {
          profileId: "2",
          answer: 65,
          distance: 1,
          answeredAt: "2026-05-23T10:00:03.100Z",
          responseTimeMs: 3100,
          isWinner: true,
        },
      ],
    },
    {
      text: "В каком году человек впервые высадился на Луне?",
      correctAnswer: 1969,
      answerUnit: "год",
      answers: [
        {
          profileId: "1",
          answer: 1966,
          distance: 3,
          answeredAt: "2026-05-23T10:01:03.750Z",
          responseTimeMs: 3750,
          isWinner: true,
        },
        {
          profileId: "2",
          answer: 1972,
          distance: 3,
          answeredAt: "2026-05-23T10:01:03.780Z",
          responseTimeMs: 3780,
          isWinner: false,
        },
      ],
    },
    {
      text: "В каком году Apple представила первый iPhone?",
      correctAnswer: 2007,
      answerUnit: "год",
      answers: [
        {
          profileId: "1",
          answer: 2006,
          distance: 1,
          answeredAt: "2026-05-23T10:02:03.500Z",
          responseTimeMs: 3500,
          isWinner: true,
        },
        {
          profileId: "2",
          answer: 2010,
          distance: 3,
          answeredAt: "2026-05-23T10:02:03.600Z",
          responseTimeMs: 3600,
          isWinner: false,
        },
      ],
    },
    {
      text: "Сколько колец на олимпийском флаге?",
      correctAnswer: 5,
      answerUnit: "колец",
      answers: [
        {
          profileId: "1",
          answer: 7,
          distance: 2,
          answeredAt: "2026-05-23T10:03:03.400Z",
          responseTimeMs: 3400,
          isWinner: false,
        },
        {
          profileId: "2",
          answer: 5,
          distance: 0,
          answeredAt: "2026-05-23T10:03:04.100Z",
          responseTimeMs: 4100,
          isWinner: true,
        },
      ],
    },
    {
      text: "Сколько костей у взрослого человека?",
      correctAnswer: 206,
      answerUnit: "костей",
      answers: [
        {
          profileId: "1",
          answer: 205,
          distance: 1,
          answeredAt: "2026-05-23T10:04:03.250Z",
          responseTimeMs: 3250,
          isWinner: true,
        },
        {
          profileId: "2",
          answer: 208,
          distance: 2,
          answeredAt: "2026-05-23T10:04:03.900Z",
          responseTimeMs: 3900,
          isWinner: false,
        },
      ],
    },
  ];
  const question = questions[position - 1] ?? questions[0];

  return {
    id: `q-done-${position}`,
    position,
    status: "completed",
    text: question.text,
    correctAnswer: question.correctAnswer,
    answerUnit: question.answerUnit,
    winnerProfileId: question.answers.find((answer) => answer.isWinner)?.profileId ?? "",
    startedAt: "2026-05-23T10:00:00.000Z",
    deadlineAt: "2026-05-23T10:00:30.000Z",
    completedAt,
    answers: question.answers,
  };
}

function mockGameRoom(roomId: string, status: "waiting" | "active" = "waiting") {
  cy.intercept("GET", `**/api/games/rooms/${roomId}`, {
    body: roomResponse(status, roomId),
  }).as(`gameRoom${roomId}`);
  cy.intercept("GET", `**/api/games/rooms/${roomId}/messages*`, {
    body: [
      {
        id: "1",
        roomId,
        authorProfileId: "2",
        authorName: "Аня Орлова",
        authorFirstName: "Аня",
        authorLastName: "Орлова",
        text: "Привет до старта",
        createdAt: "2026-05-23T10:00:00.000Z",
      },
    ],
  }).as(`roomMessages${roomId}`);
  cy.intercept("POST", `**/api/games/rooms/${roomId}/messages`, (req) => {
    req.reply({
      statusCode: 201,
      body: {
        id: "2",
        roomId,
        authorProfileId: "1",
        authorName: "Мария Соколова",
        authorFirstName: "Мария",
        authorLastName: "Соколова",
        text: req.body.text,
        createdAt: "2026-05-23T10:01:00.000Z",
      },
    });
  }).as(`sendRoomMessage${roomId}`);
  cy.intercept("PATCH", `**/api/games/rooms/${roomId}/ranked`, {
    statusCode: 204,
    body: {},
  }).as(`setRoomRanked${roomId}`);
}

describe("игровая комната", () => {
  it("выравнивает настройку рейтинговой игры в форме создания", () => {
    cy.mockAuthApi();

    cy.visitApp({ path: "/games/quiz", authenticated: true });
    cy.contains(".games-lobby-option", "Создать комнату").click();

    cy.contains(".games-rating-toggle", "Рейтинговая игра").should("be.visible");
    cy.contains(".games-rating-toggle", "Обычная").should("be.visible");
    cy.contains(".games-rating-toggle", "Рейтинговая").should("be.visible");
    cy.contains(".games-rating-toggle", "На рейтинг").should("not.exist");
    cy.get('.games-rating-segmented input[value="true"]').should("not.be.checked");
    cy.contains(".games-rating-segmented .games-ready-segmented__text", "Рейтинговая").click();
    cy.get('.games-rating-segmented input[value="true"]').should("be.checked");
    cy.get('input[name="questionCount"]').should("have.value", "20").and("have.attr", "readonly");
    cy.get('input[name="answerTimeoutSec"]')
      .should("have.value", "10")
      .and("have.attr", "readonly");
    cy.get('input[name="questionCount"]').focus();
    cy.contains(".games-field__error", "Этот параметр нельзя изменить при игре на рейтинг").should(
      "be.visible",
    );
    cy.get('input[name="questionCount"]').type("1", { force: true });
    cy.get('input[name="questionCount"]').should("have.value", "20");
    cy.contains(".games-rating-segmented .games-ready-segmented__text", "Обычная").click();
    cy.get('input[name="questionCount"]').should("not.have.attr", "readonly");
    cy.get('input[name="answerTimeoutSec"]').should("not.have.attr", "readonly");
    cy.get(".games-rating-toggle__hint .games-catalog-card__hint-button").click();
    cy.get("#games-rating-toggle-hint.games-field-popover--portal")
      .should("be.visible")
      .and("contain", "Игра повлияет на сезонный рейтинг всех участников");
    cy.get('input[name="title"]').then(($titleInput) => {
      cy.get(".games-rating-toggle").then(($toggle) => {
        const titleLeft = $titleInput[0].getBoundingClientRect().left;
        const toggleLeft = $toggle[0].getBoundingClientRect().left;
        expect(Math.abs(titleLeft - toggleLeft)).to.be.lessThan(2);
      });
    });
  });

  it("предлагает вернуться в уже созданную свою комнату", () => {
    cy.mockAuthApi();
    const existingRoom = {
      ...roomResponse("waiting", "room-own"),
      title: "Моя комната",
      inviteCode: "OWN123",
      password: "",
      players: [roomPlayers[0]],
    };

    cy.intercept("POST", "**/api/games/rooms", {
      statusCode: 409,
      body: {
        error: "У вас уже есть своя созданная комната.",
        room: existingRoom,
      },
    }).as("createRoom");
    cy.intercept("POST", "**/api/games/rooms/join", {
      statusCode: 200,
      body: existingRoom,
    }).as("returnToRoom");
    cy.intercept("GET", "**/api/games/rooms/room-own", { body: existingRoom }).as("ownRoom");
    cy.intercept("GET", "**/api/games/rooms/room-own/messages*", { body: [] });

    cy.visitApp({ path: "/games/quiz", authenticated: true });
    cy.contains(".games-lobby-option", "Создать комнату").click();
    cy.get('input[name="title"]').type("Новая комната");
    cy.contains("button", "Создать комнату").click();
    cy.wait("@createRoom");

    cy.contains(".games-message", "Вы не можете создать больше одной комнаты.").should(
      "be.visible",
    );
    cy.contains(".games-message__link", "Войти в вашу комнату?").click();
    cy.wait("@returnToRoom").its("request.body").should("deep.include", { inviteCode: "OWN123" });
    cy.wait("@ownRoom");
    cy.location("pathname").should("eq", "/games/quiz/room-own");
  });

  it("показывает таблицу рейтинга текущего сезона", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/games/ratings/number_duel/leaderboard*", {
      body: {
        gameType: "number_duel",
        season: {
          seasonNumber: 1,
          title: "Сезон 1: Май 2026",
          startsAt: "2026-05-01T00:00:00Z",
          endsAt: "2026-06-01T00:00:00Z",
        },
        entries: [
          {
            rank: 1,
            profileId: "2",
            player: roomPlayers[1],
            rating: 1042,
            gamesPlayed: 3,
            wins: 2,
            draws: 0,
          },
        ],
      },
    }).as("leaderboard");

    cy.visitApp({ path: "/games/quiz", authenticated: true });
    cy.contains(".games-lobby-option", "Рейтинг игроков").click();
    cy.wait("@leaderboard");

    cy.contains(".games-panel__title", "Числовая викторина - рейтинг").should("be.visible");
    cy.get(".games-panel__header > div > .games-panel__subtitle").should("not.exist");
    cy.get(".games-panel__title-hint .games-catalog-card__hint-button").click();
    cy.get("#games-panel-description-hint.games-field-popover--portal")
      .should("be.visible")
      .and("contain", "Викторина, где на каждый вопрос нужно дать ответ");
    cy.get(".games-panel__title-hint .games-catalog-card__hint-button").click();
    cy.get(".games-section-title-hint .games-catalog-card__hint-button").click();
    cy.get("#games-leaderboard-rules-hint.games-field-popover--portal")
      .should("be.visible")
      .and(
        "contain",
        "Игры с одними и теми же людьми в течение короткого промежутка времени влияют на рейтинг значительно слабее.",
      );
    cy.contains(".games-panel__subtitle", "Сезон 1 (Май 2026)").should("be.visible");
    cy.contains(".games-leaderboard-row", "Аня Орлова").should("be.visible");
    cy.contains(".games-leaderboard-row__name", "Аня Орлова")
      .should("have.attr", "href")
      .and("include", "/id2");
    cy.get(".games-leaderboard-row__avatar-link")
      .should("have.attr", "href")
      .and("include", "/id2");
    cy.contains(".games-leaderboard-row__player small", "Игр: 3, побед: 2").should("be.visible");
    cy.contains(".games-leaderboard-row__rating", "1042").should("be.visible");
  });

  it("показывает пустое состояние рейтинга", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/games/ratings/number_duel/leaderboard*", {
      body: {
        gameType: "number_duel",
        season: {
          seasonNumber: 1,
          title: "Сезон 1: Май 2026",
          startsAt: "2026-05-01T00:00:00Z",
          endsAt: "2026-06-01T00:00:00Z",
        },
        entries: [],
      },
    }).as("emptyLeaderboard");

    cy.visitApp({ path: "/games/quiz", authenticated: true });
    cy.contains(".games-lobby-option", "Рейтинг игроков").click();
    cy.wait("@emptyLeaderboard");

    cy.contains(
      ".games-leaderboard__empty",
      "В рейтинге отображаются пользователи, сыгравшие хотя бы одну игру.",
    ).should("be.visible");
    cy.contains(".games-leaderboard__empty", "Список пуст.").should("be.visible");
  });

  it("показывает в списке комнат, рейтинговая она или нет", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/games/rooms", {
      body: [
        {
          ...roomResponse("waiting", "room-ranked"),
          title: "Рейтинговая комната",
          maxPlayers: 4,
          hasPassword: true,
          isRanked: true,
          players: [roomPlayers[1]],
        },
        {
          ...roomResponse("waiting", "room-casual"),
          title: "Обычная комната",
          maxPlayers: 3,
          hasPassword: false,
          isRanked: false,
          players: [roomPlayers[1]],
        },
        {
          ...roomResponse("waiting", "room-full"),
          title: "Полная комната",
          createdByProfileId: "2",
          creator: { ...roomPlayers[1], profileId: "2", isMe: false },
          maxPlayers: 2,
          hasPassword: false,
          isRanked: false,
          players: [
            {
              ...roomPlayers[1],
              profileId: "3",
              userAccountId: "3",
              name: "Игорь Петров",
              firstName: "Игорь",
              lastName: "Петров",
              username: "igor",
              isMe: false,
            },
          ],
        },
      ],
    }).as("roomsList");
    cy.intercept("POST", "**/api/games/rooms/join", cy.spy().as("joinFullRoom"));

    cy.visitApp({ path: "/games/quiz", authenticated: true });
    cy.contains(".games-lobby-option", "Посмотреть список комнат").click();
    cy.wait("@roomsList");

    cy.contains(".games-room-card", "Рейтинговая комната")
      .should("contain", "Участников: 2/4")
      .and("contain", "Есть пароль")
      .and("contain", "Рейтинговая");
    cy.contains(".games-room-card", "Обычная комната")
      .should("contain", "Участников: 2/3")
      .and("contain", "Без пароля")
      .and("contain", "Обычная");
    cy.contains(".games-room-card", "Полная комната")
      .should("contain", "Участников: 2/2")
      .contains("button", "Войти")
      .click();
    cy.contains(".games-message", "В этой комнате уже максимальное число участников.").should(
      "be.visible",
    );
    cy.get("@joinFullRoom").should("not.have.been.called");
  });

  it("показывает динамическую ошибку для неверного кода приглашения", () => {
    cy.mockAuthApi();
    cy.intercept("POST", "**/api/games/rooms/join", cy.spy().as("joinRequest"));

    cy.visitApp({ path: "/games/quiz", authenticated: true });
    cy.contains(".games-lobby-option", "Войти по приглашению").click();

    cy.get('input[name="inviteCode"]').then(($input) => {
      const heightBefore = $input.closest(".games-field")[0].getBoundingClientRect().height;
      cy.wrap($input).type("a");
      cy.contains(".games-field__error", "Код должен состоять из 6 букв или цифр").should(
        "be.visible",
      );
      cy.wrap($input)
        .closest(".games-field")
        .should(($field) => {
          expect(Math.abs($field[0].getBoundingClientRect().height - heightBefore)).to.be.lessThan(
            2,
          );
        });
    });
    cy.get("#games-join-room-form").submit();
    cy.contains(".games-field__error", "Код должен состоять из 6 букв или цифр").should(
      "be.visible",
    );
    cy.get("@joinRequest").should("not.have.been.called");
  });

  it("показывает ошибку ненайденной игры под кодом приглашения", () => {
    cy.mockAuthApi();
    cy.intercept("POST", "**/api/games/rooms/join", {
      statusCode: 404,
      body: { error: "не найдено" },
    }).as("joinNotFound");

    cy.visitApp({ path: "/games/quiz", authenticated: true });
    cy.contains(".games-lobby-option", "Войти по приглашению").click();
    cy.get('input[name="inviteCode"]').type("AB12CD");
    cy.get("#games-join-room-form").submit();
    cy.wait("@joinNotFound");

    cy.contains("[data-games-invite-code-error]", "Игра не найдена").should("be.visible");
    cy.get("[data-games-join-password-error]").should("have.text", "");
    cy.contains(".games-inline-error", "не найдено").should("not.exist");
  });

  it("показывает ошибку неверного пароля под паролем", () => {
    cy.mockAuthApi();
    cy.intercept("POST", "**/api/games/rooms/join", {
      statusCode: 403,
      body: { error: "Неверный пароль" },
    }).as("joinWrongPassword");

    cy.visitApp({ path: "/games/quiz", authenticated: true });
    cy.contains(".games-lobby-option", "Войти по приглашению").click();
    cy.get('input[name="inviteCode"]').type("AB12CD");
    cy.get('input[name="password"]').type("wrong-password");
    cy.get("#games-join-room-form").submit();
    cy.wait("@joinWrongPassword");

    cy.get('input[name="inviteCode"]').should("have.value", "AB12CD");
    cy.get('input[name="password"]').should("have.value", "wrong-password");
    cy.get("[data-games-invite-code-error]").should("have.text", "");
    cy.contains("[data-games-join-password-error]", "Неверный пароль").should("be.visible");
    cy.contains(".games-inline-error", "Неверный пароль").should("not.exist");
  });

  it("возвращает в меню, если посторонний открывает уже начавшуюся игру", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/games/rooms/92", {
      statusCode: 403,
      body: { error: "доступ запрещён" },
    }).as("forbiddenStartedRoom");
    cy.intercept("POST", "**/api/games/rooms/join", {
      statusCode: 400,
      body: { error: "игра уже началась" },
    }).as("joinStartedRoom");

    cy.visitApp({ path: "/games/quiz/92", authenticated: true });
    cy.wait("@forbiddenStartedRoom");
    cy.wait("@joinStartedRoom");

    cy.location("pathname").should("eq", "/games/quiz");
    cy.contains(".games-lobby-option", "Создать комнату").should("be.visible");
    cy.get("[data-games-join-password-modal]").should("not.exist");
  });

  it("показывает историю чата комнаты и отправляет новое сообщение", () => {
    cy.mockAuthApi();
    mockGameRoom("42");

    cy.visitApp({ path: "/games/quiz/42", authenticated: true });
    cy.wait("@gameRoom42");
    cy.wait("@roomMessages42");

    cy.contains(".games-room-heading", "Числовая викторина - лобби").should("be.visible");
    cy.get(".app-layout--content-wide .sidebar").should("be.visible");
    cy.get("[data-games-room-players-rail]").should("not.exist");
    cy.get(".games-panel .games-scoreboard .games-player").should("have.length", 2);
    cy.contains(".games-panel .games-scoreboard", "Мария Соколова").should("be.visible");
    cy.contains(".games-panel .games-scoreboard", "Аня Орлова").should("be.visible");
    cy.get('.games-room-detail-card[aria-label="Название комнаты"]').then(($titleCard) => {
      cy.get('.games-room-detail-card[aria-label="Тип игры"]').then(($rankedCard) => {
        const titleRect = $titleCard[0].getBoundingClientRect();
        const rankedRect = $rankedCard[0].getBoundingClientRect();
        expect(Math.abs(titleRect.top - rankedRect.top)).to.be.lessThan(2);
        expect(Math.abs(titleRect.width - rankedRect.width)).to.be.lessThan(2);
        expect(rankedRect.left).to.be.greaterThan(titleRect.left);
      });
    });
    cy.contains('[data-games-room-ranked-toggle="false"]', "Обычная")
      .find("input")
      .should("be.checked");
    cy.contains('[data-games-room-ranked-toggle="true"]', "Рейтинговая")
      .find("input")
      .check({ force: true });
    cy.wait("@setRoomRanked42").its("request.body").should("deep.equal", { isRanked: true });
    cy.contains("[data-app-toast]", 'Администратор поставил тип игры "Рейтинговая"').should(
      "exist",
    );
    cy.contains(".games-ready-segmented__option", "Не готов").find("input").should("be.checked");
    cy.contains(".games-panel__subtitle", "Готовы: 0/2").should("be.visible");
    cy.get(".games-layout").should("have.class", "games-layout--with-chat");
    cy.get(".games-layout").should("not.have.class", "games-layout--room");
    cy.get(".games-panel").then(($panel) => {
      cy.get("[data-games-external-chat] .games-room-chat").then(($chat) => {
        const panelRect = $panel[0].getBoundingClientRect();
        const chatRect = $chat[0].getBoundingClientRect();
        expect(chatRect.left).to.be.greaterThan(panelRect.right);
        expect(Math.abs(chatRect.top - panelRect.top)).to.be.lessThan(2);
        expect(chatRect.height).to.be.greaterThan(panelRect.height);
      });
    });
    cy.contains(".games-room-chat__title", "Чат комнаты").should("be.visible");
    cy.get(".games-room-chat__room-title").should("not.exist");
    cy.get(".games-room-chat-message__avatar")
      .first()
      .should("have.prop", "tagName", "IMG")
      .and("be.visible")
      .and(($avatar) => {
        expect(getComputedStyle($avatar[0]).boxShadow).to.equal("none");
      });
    cy.contains(".games-room-chat-message__name", "Аня").should("be.visible");
    cy.contains(".games-room-chat-message__name", "Орлова").should("not.exist");
    cy.contains(".games-room-chat-message__text", "Привет до старта").should("be.visible");

    cy.get('[aria-controls="games-room-invite-code-hint"]').should("be.visible").click({
      force: true,
    });
    cy.get('[aria-controls="games-room-invite-code-hint"]').then(($button) => {
      cy.get("#games-room-invite-code-hint.games-field-popover--portal").should(($hint) => {
        const buttonRect = $button[0].getBoundingClientRect();
        const hintRect = $hint[0].getBoundingClientRect();
        expect(hintRect.left).to.be.greaterThan(buttonRect.left - 160);
        expect(hintRect.top).to.be.greaterThan(buttonRect.top - 120);
        expect(hintRect.top).to.be.lessThan(buttonRect.bottom + 40);
      });
    });
    cy.get('[aria-controls="games-room-password-hint"]').should("be.visible").click({
      force: true,
    });
    cy.get('[aria-controls="games-room-password-hint"]').then(($button) => {
      cy.get("#games-room-password-hint.games-field-popover--portal").should(($hint) => {
        const buttonRect = $button[0].getBoundingClientRect();
        const hintRect = $hint[0].getBoundingClientRect();
        expect(hintRect.left).to.be.greaterThan(buttonRect.left - 160);
        expect(hintRect.top).to.be.greaterThan(buttonRect.top - 120);
        expect(hintRect.top).to.be.lessThan(buttonRect.bottom + 40);
      });
    });

    cy.get(".games-panel").then(($panel) => {
      const panelBeforeSend = $panel[0];
      cy.get("[data-games-external-chat] [data-games-room-chat-input]")
        .should("be.visible")
        .and("not.be.disabled")
        .type("Готовы начинать");
      cy.get("[data-games-external-chat] [data-games-room-chat-form]").submit();
      cy.wait("@sendRoomMessage42").its("request.body").should("deep.equal", {
        text: "Готовы начинать",
      });
      cy.get(".games-panel").should(($nextPanel) => {
        expect($nextPanel[0]).to.equal(panelBeforeSend);
      });
    });
    cy.contains(".games-room-chat-message__text", "Готовы начинать").should("be.visible");
  });

  it("растягивает чат лобби на высоту страницы и прокручивает длинную историю", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/games/rooms/52", {
      body: roomResponse("waiting", "52"),
    }).as("gameRoom52");
    cy.intercept("GET", "**/api/games/rooms/52/messages*", {
      body: Array.from({ length: 36 }, (_, index) => ({
        id: String(index + 1),
        roomId: "52",
        authorProfileId: index % 2 === 0 ? "1" : "2",
        authorName: index % 2 === 0 ? "Мария Соколова" : "Аня Орлова",
        authorFirstName: index % 2 === 0 ? "Мария" : "Аня",
        authorLastName: index % 2 === 0 ? "Соколова" : "Орлова",
        text: `Сообщение ${index + 1}`,
        createdAt: "2026-05-23T10:00:00.000Z",
      })),
    }).as("roomMessages52");

    cy.visitApp({ path: "/games/quiz/52", authenticated: true });
    cy.wait("@gameRoom52");
    cy.wait("@roomMessages52");

    cy.get(".games-layout").then(($layout) => {
      cy.get("[data-games-external-chat] .games-room-chat").then(($chat) => {
        const layoutRect = $layout[0].getBoundingClientRect();
        const chatRect = $chat[0].getBoundingClientRect();
        expect(Math.abs(chatRect.height - layoutRect.height)).to.be.lessThan(2);
      });
    });
    cy.get("[data-games-room-chat-messages]").should(($messages) => {
      expect($messages[0].scrollHeight).to.be.greaterThan($messages[0].clientHeight);
    });
  });

  it("оставляет чат справа после старта игры", () => {
    cy.mockAuthApi();
    mockGameRoom("43", "active");
    const answeredRoom = roomResponse("active", "43");
    cy.intercept("POST", "**/api/games/rooms/43/answers", {
      body: {
        room: {
          ...answeredRoom,
          currentQuestion: answeredRoom.currentQuestion
            ? {
                ...answeredRoom.currentQuestion,
                hasAnswered: true,
              }
            : null,
          players: roomPlayers.map((player) =>
            player.isMe ? { ...player, hasAnswered: true } : player,
          ),
        },
      },
    }).as("submitAnswer43");

    cy.visitApp({ path: "/games/quiz/43", authenticated: true });
    cy.wait("@gameRoom43");
    cy.wait("@roomMessages43");

    cy.contains(".games-stage-card__question", "Сколько клеток на шахматной доске?").should(
      "be.visible",
    );
    cy.get(".games-panel--play")
      .should("not.contain", "Числовая викторина")
      .and("not.contain", "Обычная");
    cy.get(".app-layout--game-room .sidebar").should("not.exist");
    cy.contains(".games-field--answer span", "Ваш ответ:")
      .should("be.visible")
      .and("not.contain", "клеток");
    cy.contains("[data-games-room-players-rail] .games-game-scoreboard__header", "Игроки").should(
      "be.visible",
    );
    cy.get("[data-games-room-players-rail]")
      .should("contain", "Аня")
      .and("contain", "Орлова")
      .find("[data-games-profile-link]")
      .should("have.length", 4);
    cy.get(".games-game-stage").should("not.contain", "Орлова").find("a").should("not.exist");
    cy.get("[data-games-question-timer-strip]").within(() => {
      cy.contains(".games-question-countdown__line", "Вопрос 1 из 5.").should("be.visible");
      cy.contains(".games-question-countdown__line", "Осталось:").should("be.visible");
      cy.get("[data-games-timer-value]")
        .should("be.visible")
        .invoke("text")
        .should("not.match", /\d+\.\d{2}/);
      cy.get("[data-games-timer-progress]").should("be.visible");
      cy.get(".games-question-report").should("not.exist");
    });
    cy.get("[data-games-question-hero]").within(() => {
      cy.contains(".games-stage-card__question", "Сколько клеток на шахматной доске?").should(
        "be.visible",
      );
      cy.get("[data-games-answer-form]").should("be.visible");
      cy.get('input[name="answer"]').should("be.visible");
    });
    cy.focused().should("have.attr", "name", "answer");
    cy.contains("[data-games-external-chat] .games-room-chat__title", "Чат комнаты").should(
      "be.visible",
    );
    cy.get("[data-games-external-chat] .games-room-chat-message")
      .find("[data-games-profile-link]")
      .should("have.length", 2);
    cy.contains(".games-room-chat-message__text", "Привет до старта").should("be.visible");
    cy.window().then((win) => {
      const stage = win.document.querySelector(".games-stage-card");
      expect(stage).to.exist;
      (win as typeof win & { __gamesSubmitStage?: Element }).__gamesSubmitStage = stage!;
    });
    cy.get('input[name="answer"]').type("64");
    cy.get("[data-games-answer-form]").submit();
    cy.wait("@submitAnswer43");
    cy.window().then((win) => {
      const stage = (win as typeof win & { __gamesSubmitStage?: Element }).__gamesSubmitStage;
      expect(
        win.document.querySelector(".games-stage-card"),
        "сцена не заменяется после ответа",
      ).to.eq(stage);
    });
    cy.get('[data-games-player-card="1"]')
      .should("have.class", "games-game-player--answered")
      .and("have.attr", "data-games-player-answered", "true");
    cy.contains(".games-answer-accepted", "Ваш ответ принят: 64").should("be.visible");
    cy.get("[data-games-answer-form]").then(($form) => {
      const formWidth = $form[0].getBoundingClientRect().width;
      cy.get(".games-answer-accepted").should(($accepted) => {
        expect(Math.abs($accepted[0].getBoundingClientRect().width - formWidth)).to.be.lessThan(2);
      });
    });
    cy.get("[data-games-answer-form] button").should("not.exist");
    cy.contains(".games-message", "Ответ отправлен.").should("not.exist");
  });

  it("показывает результат последнего вопроса перед финальными итогами", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/games/rooms/53", {
      body: {
        ...roomResponse("finished", "53"),
        players: [
          { ...roomPlayers[0], score: 2, isReady: false },
          { ...roomPlayers[1], score: 3, isReady: false },
        ],
        questions: Array.from({ length: 5 }, (_, index) => completedQuestion(index + 1)),
        winnerProfileId: "2",
      },
    }).as("gameRoom53");
    cy.intercept("GET", "**/api/games/rooms/53/messages*", { body: [] }).as("roomMessages53");

    cy.visitApp({ path: "/games/quiz/53", authenticated: true });
    cy.wait("@gameRoom53");
    cy.wait("@roomMessages53");

    cy.get(".games-room-heading").should("not.exist");
    cy.get(".games-stage-card--result").should("be.visible");
    cy.get("[data-games-final-results-until]").should("exist");
    cy.contains(".games-stage-card__question", "Сколько костей у взрослого человека?").should(
      "be.visible",
    );
    cy.get("[data-games-correct-answer]").should("contain", "206");
    cy.get(".games-final-standings").should("not.exist");
    cy.get("[data-games-final-round-reveal]").should("not.exist");
  });

  it("показывает полные кликабельные имена в финале игры", () => {
    cy.viewport(1280, 720);
    cy.mockAuthApi();
    cy.mockProfileApi();
    cy.intercept("GET", "**/api/games/rooms/48", {
      body: {
        ...roomResponse("finished", "48"),
        players: [
          { ...roomPlayers[0], score: 1, isReady: false },
          { ...roomPlayers[1], score: 2, isReady: false },
        ],
        questions: Array.from({ length: 5 }, (_, index) =>
          completedQuestion(index + 1, oldCompletedAt),
        ),
        winnerProfileId: "2",
        isRanked: true,
        ratingChanges: [
          {
            profileId: "1",
            score: 1,
            place: 2,
            beforeRating: 1000,
            afterRating: 984,
            ratingDelta: -16,
            ratingWeight: 1,
            seasonNumber: 1,
            seasonTitle: "Сезон 1: Май 2026",
          },
          {
            profileId: "2",
            score: 2,
            place: 1,
            beforeRating: 1000,
            afterRating: 1016,
            ratingDelta: 16,
            ratingWeight: 1,
            seasonNumber: 1,
            seasonTitle: "Сезон 1: Май 2026",
          },
        ],
      },
    }).as("gameRoom48");
    cy.intercept("GET", "**/api/games/rooms/48/messages*", {
      body: [
        {
          id: "48-1",
          roomId: "48",
          authorProfileId: "2",
          authorName: "Аня Орлова",
          authorFirstName: "Аня",
          authorLastName: "Орлова",
          text: "Хорошая игра",
          createdAt: "2026-05-23T10:02:00.000Z",
        },
      ],
    }).as("roomMessages48");

    cy.visitApp({ path: "/games/quiz/48", authenticated: true });
    cy.wait("@gameRoom48");
    cy.wait("@roomMessages48");
    cy.wait("@gameRoom48");

    cy.get("[data-games-room-players-rail]")
      .should("contain", "Аня")
      .and("contain", "Мария")
      .and("contain", "Орлова")
      .and("contain", "Соколова")
      .and("not.contain", "место");
    cy.contains("[data-games-room-players-rail] .games-game-player", "Мария").should(
      "contain",
      "3",
    );
    cy.contains("[data-games-room-players-rail] .games-game-player", "Аня").should("contain", "2");
    cy.get("[data-games-room-players-rail] .games-game-player__avatar-link").should(
      "have.length",
      2,
    );
    cy.contains("[data-games-room-players-rail] .games-game-player__name", "Аня")
      .should("be.visible")
      .and("have.attr", "href")
      .and("include", "/id2");
    cy.get(".games-panel__subtitle .games-player-name-link").should("not.exist");
    cy.contains(".games-stage-card__title", "Победитель:").should("be.visible");
    cy.contains(".games-final-winner-card", "Мария Соколова")
      .should("have.attr", "href")
      .and("include", "/id1");
    cy.contains(".games-final-winner-card[data-games-profile-link]", "Мария Соколова")
      .first()
      .click();
    cy.contains("[data-games-profile-nav-modal]", "Перейти на страницу пользователя?").should(
      "be.visible",
    );
    cy.contains(".games-profile-nav-modal__user", "Мария Соколова").should("be.visible");
    cy.get("[data-games-profile-nav-close]").first().click();
    cy.get("[data-games-profile-nav-modal]").should("not.exist");
    cy.get(".games-final-standings")
      .should("contain", "Аня Орлова")
      .and("contain", "Мария Соколова");
    cy.contains(".games-final-place__name", "Аня Орлова")
      .should(($link) => {
        expect($link[0].classList.contains("games-player-name-link")).to.equal(true);
      })
      .should("have.attr", "href")
      .and("include", "/id2");
    cy.contains(".games-rating-change__name", "Мария Соколова")
      .should("have.attr", "href")
      .and("include", "/id1");
    cy.get(".games-rating-change__avatar-link")
      .first()
      .should("have.attr", "href")
      .and("match", /\/id[12]/);
    cy.get(".games-rating-summary").should("not.contain", "Вес матча");
    cy.contains(".games-final-place em", "3 балла").should("exist");
    cy.contains(".games-final-place em", "2 балла").should("exist");
    cy.contains(".games-rating-delta", "+16 рейтинга").should("exist");
    cy.contains(".games-rating-delta", "-16 рейтинга").should("exist");
    cy.contains(".games-rating-change__name", "Аня Орлова")
      .should("have.attr", "href")
      .and("include", "/id2");
    cy.get("[data-games-final-round-reveal]").should("not.exist");
    cy.contains(".games-final-archive__header", "Вопросы и ответы").should("exist");
    cy.get(".games-room-rules-button").click();
    cy.get("#games-room-rules-hint.games-field-popover--portal").should(($hint) => {
      const hint = $hint[0];
      expect(hint.parentElement).to.equal(hint.ownerDocument.body);
      expect(hint.classList.contains("games-field-popover--portal")).to.equal(true);
      expect(getComputedStyle(hint).zIndex).to.equal("7000");
      const rect = hint.getBoundingClientRect();
      const topElement = hint.ownerDocument.elementFromPoint(rect.left + 12, rect.top + 12);
      expect(topElement === hint || hint.contains(topElement)).to.equal(true);
    });
    cy.get("body").should(($body) => {
      const text = $body.text();
      expect(text).to.contain("Правильный ответ: 1969");
      expect(text).to.contain("Игрок");
      expect(text).to.contain("Мария Соколова");
      expect(text).to.contain("1966");
      expect(text).to.contain("3.75 сек");
      expect(text).to.contain("Аня Орлова");
      expect(text).to.contain("1972");
      expect(text).to.contain("3.78 сек");
    });
    cy.get(".games-results-table__player-link").then(($links) => {
      const anyaLink = [...$links].find((link) => link.textContent?.includes("Аня Орлова"));
      expect(anyaLink).to.not.equal(undefined);
      expect(anyaLink?.getAttribute("href")).to.include("/id2");
    });
    cy.get(".games-final-standings").find("a").should("have.length", 4);
    cy.get("[data-games-external-chat] .games-room-chat-message__avatar-link")
      .first()
      .should("have.attr", "href")
      .and("include", "/id2");
    cy.contains("[data-games-external-chat] .games-room-chat-message__name", "Аня")
      .should("have.attr", "href")
      .and("include", "/id2");
    cy.get(".games-stage-card--final").should("be.visible");
    cy.get(".games-layout--room .games-panel").then(($panel) => {
      cy.get("[data-games-external-chat] .games-room-chat").then(($chat) => {
        const panelBottom = $panel[0].getBoundingClientRect().bottom;
        const chatBottom = $chat[0].getBoundingClientRect().bottom;
        expect(Math.abs(panelBottom - chatBottom)).to.be.lessThan(2);
      });
    });
    cy.get(".header__search-box").then(($search) => {
      cy.get(".games-layout--room .games-panel").then(($panel) => {
        const searchRect = $search[0].getBoundingClientRect();
        const panelRect = $panel[0].getBoundingClientRect();
        expect(Math.abs(panelRect.left - searchRect.left)).to.be.lessThan(2);
        expect(Math.abs(panelRect.width - searchRect.width)).to.be.lessThan(2);
      });
    });
    cy.document().then((doc) => {
      const styles = getComputedStyle(doc.documentElement);
      const sidebarWidth = parseFloat(styles.getPropertyValue("--layout-sidebar-width"));
      const widgetsWidth = parseFloat(styles.getPropertyValue("--layout-widgets-width"));
      cy.get("[data-games-room-players-rail]").should(($rail) => {
        expect(Math.abs($rail[0].getBoundingClientRect().width - sidebarWidth)).to.be.lessThan(2);
      });
      cy.get("[data-games-external-chat] .games-room-chat").should(($chat) => {
        expect(Math.abs($chat[0].getBoundingClientRect().width - widgetsWidth)).to.be.lessThan(2);
      });
    });
    cy.contains(".games-final-winner-card[data-games-profile-link]", "Мария Соколова")
      .first()
      .click();
    cy.get("[data-games-profile-nav-confirm]").click();
    cy.location("pathname").should("eq", "/id1");
  });

  it("скрывает блок повторной игры на финальном экране", () => {
    cy.mockAuthApi();
    const finalRoom = {
      ...roomResponse("finished", "50"),
      players: [
        { ...roomPlayers[0], score: 1, isReady: false },
        { ...roomPlayers[1], score: 2, isReady: false },
      ],
      questions: Array.from({ length: 5 }, (_, index) =>
        completedQuestion(index + 1, oldCompletedAt),
      ),
      winnerProfileId: "2",
    };

    cy.intercept("GET", "**/api/games/rooms/50", { body: finalRoom }).as("gameRoom50");
    cy.intercept("GET", "**/api/games/rooms/50/messages*", { body: [] }).as("roomMessages50");

    cy.visitApp({ path: "/games/quiz/50", authenticated: true });
    cy.wait("@gameRoom50");
    cy.wait("@roomMessages50");

    cy.get(".games-replay-action").should("not.exist");
    cy.get("[data-games-replay-toggle]").should("not.exist");
  });

  it("красиво показывает итоги раунда перед следующим вопросом", () => {
    cy.mockAuthApi();
    const unansweredPlayer = {
      ...roomPlayers[0],
      profileId: "3",
      userAccountId: "3",
      name: "Игорь Петров",
      firstName: "Игорь",
      lastName: "Петров",
      username: "igor",
      isMe: false,
    };
    const question = completedQuestion();
    const resultAnswers = question.answers.map((answer) =>
      answer.profileId === "2" ? { ...answer, answer: 64, distance: 0 } : answer,
    );
    const completedAt = new Date(Date.now() - 2_500).toISOString();
    cy.intercept("GET", "**/api/games/rooms/49", {
      body: {
        ...roomResponse("active", "49"),
        players: [...roomPlayers, unansweredPlayer],
        currentQuestion: null,
        nextQuestionAt: new Date(new Date(completedAt).getTime() + 5_000).toISOString(),
        questions: [
          {
            ...question,
            completedAt,
            answers: [
              ...resultAnswers,
              {
                profileId: "3",
                answer: null,
                distance: null,
                answeredAt: "",
                responseTimeMs: null,
                isWinner: false,
              },
            ],
          },
        ],
      },
    }).as("gameRoom49");
    cy.intercept("GET", "**/api/games/rooms/49/messages*", { body: [] }).as("roomMessages49");

    cy.visitApp({ path: "/games/quiz/49", authenticated: true });
    cy.wait("@gameRoom49");
    cy.wait("@roomMessages49");

    cy.contains(".games-stage-card__question", "Сколько клеток на шахматной доске?").should(
      "be.visible",
    );
    cy.contains("[data-games-round-question-position]", "Вопрос 1 из 5").should("be.visible");
    cy.contains("[data-games-round-next-timer]", "Следующий вопрос через").should("be.visible");
    cy.get(".games-game-stage").should("not.contain", "фильмов");
    cy.get("[data-games-correct-answer]")
      .should("have.class", "games-round-result-correct-answer")
      .and("contain", "Правильный ответ: 64")
      .and("not.contain", "клеток");
    cy.get("[data-games-round-next-timer].games-question-countdown")
      .should("be.visible")
      .and("have.attr", "data-games-timer-total-ms", "5000");
    cy.get("[data-games-round-next-timer].games-question-countdown").should(($timer) => {
      const start = new Date($timer.attr("data-games-timer-start") ?? "").getTime();
      const deadline = new Date($timer.attr("data-games-timer-deadline") ?? "").getTime();
      expect(deadline - start).to.equal(5000);
      expect($timer.attr("data-games-timer-delay-until")).to.be.undefined;
    });
    cy.get(".games-question-countdown__value").each(($value) => {
      expect($value.text()).not.to.match(/\d+\.\d{2}/);
    });
    cy.get("[data-games-answer-axis]").should("be.visible");
    cy.get("[data-games-round-answer-card]").should("have.length", 3);
    cy.get("[data-games-correct-answer]").should(($card) => {
      expect($card.text()).to.contain("64");
      expect($card.text()).not.to.contain("Мария");
      expect($card.text()).not.to.contain("Аня");
    });
    cy.contains("[data-games-round-result-card]", "Аня")
      .should("contain", "Аня")
      .and("contain", "#1")
      .and("contain", "64")
      .and("contain", "✓")
      .and("contain", "3.10 сек")
      .and("not.contain", "+2 балла")
      .and("not.contain", "Ответ")
      .and("not.contain", "Ошибка")
      .and("not.contain", "клеток");
    cy.contains("[data-games-round-result-card]", "Мария")
      .should("contain", "Мария")
      .and("contain", "#2")
      .and("contain", "60")
      .and("contain", "-4")
      .and("contain", "4.20 сек")
      .and("not.contain", "+1 балл")
      .and("not.contain", "Ответ")
      .and("not.contain", "Ошибка")
      .and("not.contain", "клеток");
    cy.contains("[data-games-round-result-card]", "Игорь")
      .should("contain", "Игорь")
      .and("contain", "#3")
      .and("contain", "×")
      .and("contain", "Нет ответа")
      .and("not.contain", "0 очков")
      .and("not.contain", "Нет времени")
      .and("not.have.class", "games-answer-axis-card--has-time")
      .should("have.class", "games-answer-axis-card--missing");
    cy.get("[data-games-round-result-card]").should("have.length", 3);
    cy.get("[data-games-round-result-card]")
      .eq(0)
      .find(".games-results-table__avatar-link")
      .should("have.attr", "href")
      .and("include", "/id2");
    cy.get("[data-games-round-result-card]")
      .eq(0)
      .find(".games-results-table__player-link")
      .should("have.text", "Аня Орлова")
      .and("have.attr", "href")
      .and("include", "/id2");
    cy.get("[data-games-round-result-card]")
      .eq(0)
      .should("contain", "Аня")
      .and("contain", "64")
      .and("contain", "✓")
      .and("contain", "3.10 сек")
      .and("not.contain", "+2 балла")
      .should("have.attr", "style")
      .and("include", "--games-answer-side: 0")
      .and("include", "--games-result-delay: 500ms");
    cy.get("[data-games-round-result-card]")
      .eq(1)
      .should("contain", "Мария")
      .and("contain", "60")
      .and("contain", "-4")
      .and("contain", "4.20 сек")
      .and("not.contain", "+1 балл")
      .should("have.attr", "style")
      .and("include", "--games-answer-side: -1")
      .and("include", "--games-result-delay: 1100ms");
    cy.get("[data-games-round-result-card]")
      .eq(2)
      .should("contain", "Игорь")
      .and("contain", "×")
      .and("contain", "Нет ответа")
      .and("not.contain", "0 очков")
      .and("not.contain", "Нет времени")
      .and("not.have.class", "games-answer-axis-card--has-time")
      .should("have.class", "games-answer-axis-card--missing")
      .should("have.attr", "style")
      .and("include", "--games-result-delay: 1700ms");
    cy.get("[data-games-round-result-card]").eq(0).should("not.contain", "Вы");
    cy.contains("[data-games-room-players-rail] .games-game-player", "Аня")
      .find("[data-games-round-points-badge]")
      .should("contain", "+2")
      .and("have.class", "games-game-player__round-points--visible");
    cy.contains("[data-games-room-players-rail] .games-game-player", "Мария")
      .find("[data-games-round-points-badge]")
      .should("contain", "+1")
      .and("have.class", "games-game-player__round-points--visible");
    cy.contains("[data-games-room-players-rail] .games-game-player", "Игорь").should(
      "not.contain",
      "0 очков",
    );
    cy.get("[data-games-round-points-table]").should("not.exist");
  });

  it("показывает паузу, таймер и голоса принудительного продолжения", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/games/rooms/50", {
      body: {
        ...roomResponse("active", "50"),
        pausedByProfileId: "2",
        pauseStartedAt: new Date(Date.now() - 10_000).toISOString(),
        pauseUntilAt: new Date(Date.now() + 110_000).toISOString(),
        pauseForceVotes: 0,
        pauseForceVotesRequired: 1,
      },
    }).as("gameRoom50");
    cy.intercept("GET", "**/api/games/rooms/50/messages*", { body: [] }).as("roomMessages50");

    cy.visitApp({ path: "/games/quiz/50", authenticated: true });
    cy.wait("@gameRoom50");
    cy.wait("@roomMessages50");

    cy.contains(".games-stage-card__title", "Игра остановлена на 2 минуты").should("be.visible");
    cy.contains(".games-force-resume__count", "0 из 1").should("be.visible");
    cy.get(".games-force-resume__meter").should("be.visible");
    cy.contains("[data-games-force-resume]", "Продолжить игру принудительно").should("be.visible");
  });

  it("возвращает обычный сайдбар после выхода из игры", () => {
    cy.mockAuthApi();
    mockGameRoom("47", "active");

    cy.visitApp({ path: "/games/quiz/47", authenticated: true });
    cy.wait("@gameRoom47");
    cy.wait("@roomMessages47");

    cy.contains("[data-games-room-players-rail] [data-games-leave-open]", "Выйти из игры").click();
    cy.contains("[data-games-leave-confirm]", "Покинуть").click();

    cy.location("pathname").should("eq", "/games/quiz");
    cy.get(".sidebar").should("be.visible");
    cy.get("[data-games-room-players-rail]").should("not.exist");
  });

  it("показывает большой обратный отсчёт перед первым вопросом", () => {
    cy.mockAuthApi();
    mockGameRoom("46", "waiting");
    cy.intercept("POST", "**/api/games/rooms/46/start", {
      body: {
        ...roomResponse("active", "46"),
        currentQuestion: null,
        nextQuestionAt: new Date(Date.now() + 10_000).toISOString(),
        questions: [],
      },
    }).as("startRoom");

    cy.visitApp({ path: "/games", authenticated: true });
    cy.window().then((win) => {
      win.localStorage.setItem(
        "aris.games.roomSystemMessages",
        JSON.stringify({
          "46": [
            {
              id: "system:46:stored-start",
              roomId: "46",
              authorProfileId: "",
              authorUserAccountId: "",
              authorName: "Сервер",
              authorFirstName: "Сервер",
              authorLastName: "",
              authorUsername: "server",
              authorAvatarId: "",
              authorAvatarUrl: "",
              text: "Игра начинается.",
              createdAt: "2026-05-23T10:00:00.000Z",
            },
          ],
        }),
      );
    });
    cy.visitApp({ path: "/games/quiz/46", authenticated: true });
    cy.wait("@gameRoom46");
    cy.wait("@roomMessages46");

    cy.contains("[data-games-start-open]", "Начать игру").click();
    cy.contains("[data-games-start-confirm]", "Начать").click();
    cy.wait("@startRoom");

    cy.contains(".games-stage-card__title", "Первый вопрос через").should("be.visible");
    cy.get(".games-start-countdown__value").should("be.visible");
    cy.contains(".games-message", "Игра началась.").should("not.exist");
    cy.get("[data-games-external-chat] .games-room-chat-message__text")
      .filter((_, element) => element.textContent?.trim() === "Игра начинается.")
      .should("have.length", 1);
  });

  it("отправляет жалобу на вопрос в поддержку", () => {
    cy.mockAuthApi();
    cy.intercept("GET", "**/api/games/rooms/45", {
      body: {
        ...roomResponse("finished", "45"),
        questions: [completedQuestion(1, oldCompletedAt)],
        winnerProfileId: "2",
      },
    }).as("gameRoom45");
    cy.intercept("GET", "**/api/games/rooms/45/messages*", { body: [] }).as("roomMessages45");
    cy.intercept("POST", "**/api/support/tickets", {
      statusCode: 201,
      body: {
        id: "900",
        uid: "report-question-900",
        category: "complaint",
        title: "Жалоба на вопрос",
        description: "Жалоба принята",
        status: "open",
        line: 1,
        createdAt: "2026-05-23T10:10:00.000Z",
      },
    }).as("reportQuestion");

    cy.visitApp({ path: "/games/quiz/45", authenticated: true });
    cy.wait("@gameRoom45");
    cy.wait("@roomMessages45");

    cy.window().then((win) => {
      if (!win.navigator.clipboard) {
        Object.defineProperty(win.navigator, "clipboard", {
          configurable: true,
          value: { writeText: () => Promise.resolve() },
        });
      }
      cy.stub(win.navigator.clipboard, "writeText").resolves().as("writeClipboard");
    });

    cy.get(".games-final-archive [data-games-question-menu-toggle]").first().click();
    cy.contains("[data-floating-menu-action]", "Скопировать").click();
    cy.get("@writeClipboard").should(
      "have.been.calledWithMatch",
      /Сколько клеток на шахматной доске\?\nПравильный ответ: 64/,
    );
    cy.contains(".profile-toast", "Вопрос и ответ скопированы в буфер обмена").should(
      "have.class",
      "profile-toast--visible",
    );

    cy.get(".games-final-archive [data-games-question-menu-toggle]").first().click();
    cy.contains("[data-floating-menu-action]", "Пожаловаться").click();
    cy.contains(".games-confirm-modal__title", "Пожаловаться на вопрос").should("be.visible");
    cy.contains(
      ".games-confirm-modal__text",
      "Вы можете отправить жалобу на вопрос, если считаете, что он некорректный. Администраторы рассмотрят ее в ближайшее время.",
    ).should("be.visible");
    cy.get("[data-games-report-close]").should("be.visible");
    cy.contains("[data-games-report-confirm]", "Пожаловаться").click();
    cy.wait("@reportQuestion").then(({ request }) => {
      expect(request.body).to.include({
        category: 2,
        login: "maria",
        email: "maria@example.com",
      });
      expect(request.body.title).to.contain("Жалоба на вопрос");
      expect(request.body.description).to.contain("Комната: Комната Cypress (ID 45)");
      expect(request.body.description).to.contain("ID вопроса: q-done-1");
      expect(request.body.description).to.contain("Сколько клеток на шахматной доске?");
      expect(request.body.description).to.contain("Ответ пользователя: 60");
    });
    cy.get(".games-final-archive [data-games-question-menu-toggle]").first().click();
    cy.contains("[data-floating-menu-action]", "Жалоба отправлена").should("be.visible");
  });

  it("адаптирует игровой экран с чатом под мобильный viewport", () => {
    cy.viewport(390, 844);
    cy.mockAuthApi();
    mockGameRoom("44", "active");

    cy.visitApp({ path: "/games/quiz/44", authenticated: true });
    cy.wait("@gameRoom44");
    cy.wait("@roomMessages44");

    cy.contains(".games-game-scoreboard__header", "Игроки").should("be.visible");
    cy.contains(".games-stage-card__question", "Сколько клеток на шахматной доске?").should(
      "be.visible",
    );
    cy.contains(".games-room-chat__title", "Чат комнаты").scrollIntoView().should("be.visible");
  });
});
