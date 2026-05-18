import { communityMembers, communityPosts, publicCommunityBundle } from "../support/data";

describe("сообщества", () => {
  it("отображает сообщества пользователя и ищет через backend", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();
    cy.intercept("GET", "**/api/search?*", (req) => {
      const url = new URL(req.url);
      const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      const communities = [publicCommunityBundle]
        .filter((bundle) =>
          [bundle.community.title, bundle.community.username, bundle.community.bio]
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
        .map((bundle) => ({
          id: bundle.community.id,
          profileId: bundle.community.profileId,
          username: bundle.community.username,
          title: bundle.community.title,
          bio: bundle.community.bio,
          type: bundle.community.type,
        }));

      req.reply({ body: { users: [], communities } });
    }).as("communitiesSearch");

    cy.visitApp({ path: "/communities", authenticated: true });
    cy.wait("@communities");

    cy.contains("[data-community-card='10']", "Клуб настольных игр").should("be.visible");
    cy.contains("[data-community-card='11']", "Музыкальный клуб").should("not.exist");

    cy.get("[data-communities-search]").type("музык");
    cy.wait("@communitiesSearch")
      .its("request.url")
      .should("include", "q=%D0%BC%D1%83%D0%B7%D1%8B%D0%BA");
    cy.contains("[data-community-card='11']", "Музыкальный клуб").should("be.visible");
  });

  it("валидирует и создаёт сообщество через мастер", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();

    cy.visitApp({ path: "/communities", authenticated: true });
    cy.get("[data-community-create-open]").click();
    cy.get("[data-community-form-modal]").should("be.visible");
    cy.get("[data-community-form-hint]").first().as("titleHint").trigger("mouseover");
    cy.get("@titleHint").should(($button) => {
      expect(getComputedStyle($button[0], "::before").opacity).to.eq("0");
    });
    cy.get("@titleHint").click();
    cy.get("@titleHint").should(($button) => {
      expect(getComputedStyle($button[0], "::before").opacity).to.eq("1");
    });
    cy.get("[data-community-title]").click();
    cy.get("@titleHint").should(($button) => {
      expect(getComputedStyle($button[0], "::before").opacity).to.eq("0");
    });

    cy.get("[data-community-form-next]").click();
    cy.contains(".community-modal__error", "Введите название сообщества.").should("be.visible");

    cy.get("[data-community-title]").type("Cypress клуб");
    cy.get("[data-community-username]").type("cypress-club");
    cy.get("[data-community-form-next]").click();
    cy.wait("@checkCommunityExists").its("request.body").should("deep.include", {
      title: "Cypress клуб",
      username: "cypress-club",
    });
    cy.get("[data-community-bio]").type("Сообщество создано из e2e.");
    cy.get("[data-community-form-next]").click();
    cy.get('[data-community-media-rotate-left="avatar"]').should("not.be.visible");
    cy.get('[data-community-media-rotate-right="avatar"]').should("not.be.visible");
    cy.get("[data-community-form-next]").click();
    cy.get('[data-community-media-rotate-left="cover"]').should("not.be.visible");
    cy.get('[data-community-media-rotate-right="cover"]').should("not.be.visible");
    cy.get("[data-community-form]").submit();

    cy.wait("@createCommunity").its("request.body").should("deep.include", {
      title: "Cypress клуб",
      username: "cypress-club",
      bio: "Сообщество создано из e2e.",
      type: "public",
    });
    cy.location("pathname").should("eq", "/communities/77");
    cy.contains("h1", "Cypress клуб").should("be.visible");
  });

  it("обрабатывает Enter на первом шаге как Next, а не как создание", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();

    cy.visitApp({ path: "/communities", authenticated: true });
    cy.get("[data-community-create-open]").click();
    cy.get("[data-community-title]").type("Enter клуб");
    cy.get("[data-community-username]").type("enter-club{enter}");

    cy.wait("@checkCommunityExists").its("request.body").should("deep.include", {
      title: "Enter клуб",
      username: "enter-club",
    });
    cy.get("[data-community-bio]").should("be.visible");
    cy.get("@createCommunity.all").should("have.length", 0);
  });

  it("не сдвигает нижние кнопки при загрузке аватара и обложки", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();

    cy.visitApp({ path: "/communities", authenticated: true });
    cy.get("[data-community-create-open]").click();
    cy.get("[data-community-title]").type("Layout клуб");
    cy.get("[data-community-username]").type("layout-club");
    cy.get("[data-community-form-next]").click();
    cy.wait("@checkCommunityExists");
    cy.get("[data-community-bio]").type("Проверяем стабильность нижних кнопок.");
    cy.get("[data-community-form-next]").click();

    let avatarNextTop = 0;
    cy.get("[data-community-form-next]").then(($button) => {
      avatarNextTop = $button[0].getBoundingClientRect().top;
    });
    cy.get("[data-community-avatar-input]").selectFile("public/assets/img/pwa-192.png", {
      force: true,
    });
    cy.get('[data-community-media-rotate-left="avatar"]').should("be.visible");
    cy.get("[data-community-form-next]").should(($button) => {
      expect(Math.abs($button[0].getBoundingClientRect().top - avatarNextTop)).to.be.lessThan(1);
    });

    cy.get("[data-community-form-next]").click();
    cy.get('[data-community-media-rotate-left="cover"]').should("not.be.visible");

    let coverNextTop = 0;
    cy.get('[data-community-form] button[type="submit"]').then(($button) => {
      coverNextTop = $button[0].getBoundingClientRect().top;
    });
    cy.get("[data-community-cover-input]").selectFile("public/assets/img/pwa-192.png", {
      force: true,
    });
    cy.get('[data-community-media-rotate-left="cover"]').should("be.visible");
    cy.get('[data-community-form] button[type="submit"]').should(($button) => {
      expect(Math.abs($button[0].getBoundingClientRect().top - coverNextTop)).to.be.lessThan(1);
    });
  });

  it("отображает детали сообщества и фильтрует посты", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();

    cy.visitApp({ path: "/communities/10", authenticated: true });
    cy.wait("@communityDetail");

    cy.contains("h1", "Клуб настольных игр").should("be.visible");
    cy.contains("[data-community-post='401']", "Официальный анонс встречи.").should("be.visible");
    cy.get('[data-community-post-menu-toggle="401"]').click();
    cy.get('[data-community-post-delete="401"]')
      .should("be.visible")
      .and("contain", "Удалить пост")
      .and("not.contain", "Удалить сообщество");
    cy.get("[data-community-post-search-open]").click();
    cy.get("[data-community-post-search]").type("zzz");
    cy.contains(".profile-empty-copy", "Ничего не найдено").should("be.visible");
  });

  it("показывает в правом виджете максимум пять участников и управление", () => {
    const members = [
      ...communityMembers.items,
      {
        profileId: 3,
        userAccountId: 3,
        firstName: "Марина",
        lastName: "Модераторова",
        username: "moderator",
        role: "moderator",
        blocked: false,
        isSelf: false,
        joinedAt: "2026-04-03T10:00:00.000Z",
      },
      {
        profileId: 4,
        userAccountId: 4,
        firstName: "Иван",
        lastName: "Участников",
        username: "member1",
        role: "member",
        blocked: false,
        isSelf: false,
        joinedAt: "2026-04-04T10:00:00.000Z",
      },
      {
        profileId: 5,
        userAccountId: 5,
        firstName: "Антон",
        lastName: "Свежесозданный",
        username: "member2",
        role: "member",
        blocked: false,
        isSelf: false,
        joinedAt: "2026-04-05T10:00:00.000Z",
      },
      {
        profileId: 6,
        userAccountId: 6,
        firstName: "Вера",
        lastName: "Лентовая",
        username: "member3",
        role: "member",
        blocked: false,
        isSelf: false,
        joinedAt: "2026-04-06T10:00:00.000Z",
      },
    ];

    cy.mockAuthApi();
    cy.mockCommunitiesApi();
    cy.intercept("GET", "**/api/communities/10/members*", {
      body: { items: members },
    }).as("communityMembersMany");

    cy.visitApp({ path: "/communities/10", authenticated: true });
    cy.wait("@communityMembersMany");

    cy.contains(".community-right-rail .community-side-card__header h2", "Участники").should(
      "contain",
      "(6)",
    );
    cy.get(".community-right-rail .community-members-card__item").should("have.length", 5);
    cy.contains(".community-right-rail", "Вера Лентовая").should("not.exist");
    cy.get(".community-right-rail [data-community-members-open='10']")
      .should("be.visible")
      .and("contain", "показать всех");
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

  it("редактирует официальный пост от имени сообщества", () => {
    const updatedText = "Официальный анонс обновлён.";
    let posts = {
      posts: [{ ...communityPosts.posts[0], createdAt: new Date().toISOString() }],
    };
    cy.mockAuthApi();
    cy.mockCommunitiesApi();
    cy.intercept("GET", "**/api/post/community/10?*", (req) => {
      req.reply({ body: posts });
    }).as("communityPostsEditable");
    cy.intercept("PATCH", "**/api/post/401", (req) => {
      posts = {
        posts: [
          {
            ...posts.posts[0],
            text: req.body.text,
          },
        ],
      };
      req.reply({ body: posts.posts[0] });
    }).as("updateCommunityPost");

    cy.visitApp({ path: "/communities/10", authenticated: true });
    cy.contains("[data-community-post='401']", "Официальный анонс встречи.").should("be.visible");
    cy.get('[data-community-post-menu-toggle="401"]').click();
    cy.get('[data-community-post-edit="401"]').click();
    cy.contains(".profile-post-modal__scope", "Клуб настольных игр").should("be.visible");
    cy.get("[data-community-post-text]").clear().type(updatedText);
    cy.get("[data-community-post-save]").click();

    cy.wait("@updateCommunityPost").its("request.body").should("deep.include", {
      text: updatedText,
      communityId: 10,
      authorProfileId: 100,
    });
    cy.contains("[data-community-post='401']", updatedText).should("be.visible");
  });

  it("показывает правый список участников без прав управления", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();
    cy.intercept("GET", "**/api/post/community/11?*", {
      body: { posts: [] },
    }).as("publicCommunityPosts");

    cy.visitApp({ path: "/communities/11", authenticated: true });
    cy.contains(".community-right-rail .community-side-card h2", "Описание").should("be.visible");
    cy.get(".community-right-rail .community-members-card").should("be.visible");
    cy.contains(".community-right-rail .community-members-card", "Мария Соколова").should(
      "be.visible",
    );
    cy.get(".community-right-rail [data-community-members-open]").should("not.exist");
  });

  it("сохраняет рабочий portal у выбора роли после смены роли", () => {
    cy.mockAuthApi();
    cy.mockCommunitiesApi();
    cy.intercept("PATCH", "**/api/communities/10/members/2/role", (req) => {
      req.reply({
        body: {
          ...communityMembers.items[1],
          role: req.body.role,
        },
      });
    }).as("changeMemberRole");

    cy.visitApp({ path: "/communities/10", authenticated: true });
    cy.get("[data-community-menu-toggle='10']").click();
    cy.get("[data-community-menu='10']").should("be.visible");
    cy.get("[data-community-menu='10'] [data-community-members-open='10']").click();
    cy.get("[data-community-members-modal]").should("be.visible");
    cy.get('[data-community-member-role-toggle="2"]').click();
    cy.get('[data-community-member-role="2"][data-community-member-role-value="moderator"]')
      .should("be.visible")
      .click();
    cy.get("[data-member-confirm-ok]").click();

    cy.wait("@changeMemberRole").its("request.body").should("deep.include", {
      role: "moderator",
    });
    cy.get('[data-community-member-role-toggle="2"]').should("contain", "Модератор").click();
    cy.get('[data-community-member-role-menu="2"]').should("be.visible");
    cy.get('[data-community-member-role="2"][data-community-member-role-value="member"]').should(
      "be.visible",
    );
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
