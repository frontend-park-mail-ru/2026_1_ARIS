export type ProfileRecord = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarLink?: string;
  status: string;
  city: string;
  phone: string;
  email: string;
  birthday: string;
  gender: string;
  interests: string;
  favoriteMusic: string;
  favoriteMovies: string;
  workCompany: string;
  workRole: string;
  education: Array<{
    place: string;
    subtitle: string;
  }>;
  friends: string[];
};

type ProfileMatchInput = {
  id?: string | undefined;
  username?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
};

function normaliseProfileValue(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

export const PROFILE_RECORDS: ProfileRecord[] = [
  {
    id: "sofya-sitnichenko",
    firstName: "Софья",
    lastName: "Ситниченко",
    username: "sofya-sit",
    status: "Люблю понятные интерфейсы, быстрые сборки и когда продукт ощущается цельным.",
    city: "Пермь",
    phone: "+7 912 480-22-16",
    email: "sofya@arisnet.dev",
    birthday: "31 июля 2002",
    gender: "женский",
    interests: "Frontend, дизайн-системы, производительность интерфейсов",
    favoriteMusic: "The Neighbourhood, Billie Eilish, ODESZA",
    favoriteMovies: "Она, Начало, Дьявол носит Prada",
    workCompany: "VK",
    workRole: "Frontend-разработчик",
    education: [
      {
        place: "МГТУ им. Н.Э. Баумана '25",
        subtitle: "Информационные системы и технологии",
      },
    ],
    friends: ["arina-askhabova", "milana-shakhbieva", "egor-larkin"],
  },
  {
    id: "arina-askhabova",
    firstName: "Арина",
    lastName: "Асхабова",
    username: "arina-a",
    status: "Проектирую продукты так, чтобы сценарии были понятными с первого взгляда.",
    city: "Дербент",
    phone: "+7 928 440-13-09",
    email: "arina@arisnet.dev",
    birthday: "8 января 2003",
    gender: "женский",
    interests: "Продуктовый дизайн, UX-исследования, визуальные системы",
    favoriteMusic: "Lana Del Rey, The Weeknd, M83",
    favoriteMovies: "Дюна, Ла-Ла Ленд, Она",
    workCompany: "VOROH",
    workRole: "Продуктовый дизайнер",
    education: [
      {
        place: "МГТУ им. Н.Э. Баумана '24",
        subtitle: "Информационные системы и технологии",
      },
    ],
    friends: ["sofya-sitnichenko", "milana-shakhbieva", "egor-larkin", "pavel-babkin"],
  },
  {
    id: "milana-shakhbieva",
    firstName: "Милана",
    lastName: "Шахбиева",
    username: "milana-sh",
    status: "Люблю, когда сложные вещи становятся простыми и удобными.",
    city: "Сибай",
    phone: "+7 917 310-88-14",
    email: "milana@arisnet.dev",
    birthday: "8 января 2002",
    gender: "женский",
    interests: "iOS, мобильная архитектура, продуктовые интерфейсы",
    favoriteMusic: "Billie Eilish, ODESZA, SZA",
    favoriteMovies: "Она, Прибытие, Интерстеллар",
    workCompany: "Т-Банк",
    workRole: "iOS-разработчик",
    education: [
      {
        place: "МГТУ им. Н.Э. Баумана '25",
        subtitle: "Информационные системы и технологии",
      },
    ],
    friends: ["sofya-sitnichenko", "arina-askhabova", "egor-larkin", "pavel-babkin"],
  },
  {
    id: "egor-larkin",
    firstName: "Егор",
    lastName: "Ларкин",
    username: "egorlarkin",
    status: "Пишу код так, чтобы потом не стыдно было ревьюить.",
    city: "Нижний Новгород",
    phone: "+7 930 412-55-09",
    email: "egor@arisnet.dev",
    birthday: "15 апреля 2002",
    gender: "мужской",
    interests: "Backend, распределенные системы, производительность API",
    favoriteMusic: "Bring Me The Horizon, Woodkid, The Blaze",
    favoriteMovies: "Социальная сеть, Исходный код, Бойцовский клуб",
    workCompany: "Авито",
    workRole: "Backend-разработчик",
    education: [
      {
        place: "МГТУ им. Н.Э. Баумана '25",
        subtitle: "Информационные системы и технологии",
      },
    ],
    friends: ["sofya-sitnichenko", "arina-askhabova", "milana-shakhbieva", "pavel-babkin"],
  },
  {
    id: "pavel-babkin",
    firstName: "Павел",
    lastName: "Бабкин",
    username: "pavel-b",
    status: "Спокойно отношусь к сложным задачам, если в них есть система и смысл.",
    city: "Москва",
    phone: "+7 927 800-10-82",
    email: "pavel@arisnet.dev",
    birthday: "18 сентября 1990",
    gender: "мужской",
    interests: "Образование, программная инженерия, наставничество",
    favoriteMusic: "M83, Fred again.., Tycho",
    favoriteMovies: "Одержимость, Паразиты, Остров проклятых",
    workCompany: "МГТУ им. Н.Э. Баумана",
    workRole: "старший преподаватель",
    education: [
      {
        place: "МГТУ им. Н.Э. Баумана '13",
        subtitle: "Информационные системы и технологии",
      },
    ],
    friends: ["sofya-sitnichenko", "arina-askhabova", "milana-shakhbieva", "egor-larkin"],
  },
];

const profileById = new Map(PROFILE_RECORDS.map((profile) => [profile.id, profile]));

export function getProfileRecordById(id: string): ProfileRecord | undefined {
  return profileById.get(id);
}

export function findProfileRecord({
  id = "",
  username = "",
  firstName = "",
  lastName = "",
}: ProfileMatchInput): ProfileRecord | undefined {
  const normalisedId = normaliseProfileValue(id);
  const normalisedUsername = normaliseProfileValue(username);
  const normalisedFirstName = normaliseProfileValue(firstName);
  const normalisedLastName = normaliseProfileValue(lastName);

  if (normalisedId) {
    const directMatch = PROFILE_RECORDS.find((profile) => {
      return normaliseProfileValue(profile.id) === normalisedId;
    });

    if (directMatch) {
      return directMatch;
    }
  }

  if (normalisedUsername) {
    const usernameMatch = PROFILE_RECORDS.find((profile) => {
      return normaliseProfileValue(profile.username) === normalisedUsername;
    });

    if (usernameMatch) {
      return usernameMatch;
    }
  }

  if (normalisedFirstName && normalisedLastName) {
    return PROFILE_RECORDS.find((profile) => {
      return (
        normaliseProfileValue(profile.firstName) === normalisedFirstName &&
        normaliseProfileValue(profile.lastName) === normalisedLastName
      );
    });
  }

  return undefined;
}

export function resolveProfilePath(input: ProfileMatchInput): string {
  const matchedProfile = findProfileRecord(input);
  const profileId = matchedProfile?.id ?? input.id ?? "";

  return profileId ? `/profile/${profileId}` : "/profile";
}
