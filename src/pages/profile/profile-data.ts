export type ProfileRecord = {
  id: string;
  publicId: number;
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
  id?: string | number | undefined;
  username?: string | number | undefined;
  firstName?: string | number | undefined;
  lastName?: string | number | undefined;
};

function normaliseProfileValue(value?: string | number): string {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (typeof value === "number") {
    return String(value).trim().toLowerCase();
  }

  return "";
}

export const PROFILE_RECORDS: ProfileRecord[] = [
  {
    id: "sofya-sitnichenko",
    publicId: 1,
    firstName: "Софья",
    lastName: "Ситниченко",
    username: "sofya-sit",
    avatarLink:
      "https://sun9-5.userapi.com/s/v1/ig2/uGYEtsdSK4QHpAyiRnb5vCasxGZy7dR-MYECGzReWIivHlfmnfQP2DaVY6_UOJHzPG4yzjnVbty6aWqM8kjydEAS.jpg?quality=95&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640&from=bu&cs=640x0",
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
    publicId: 2,
    firstName: "Арина",
    lastName: "Асхабова",
    username: "arina-a",
    avatarLink: "https://i.ibb.co/mQvfkNY/pop-User2.png",
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
    publicId: 3,
    firstName: "Милана",
    lastName: "Шахбиева",
    username: "milana-sh",
    avatarLink: "https://i.ibb.co/mCpKjmxK/pop-User4.png",
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
    publicId: 4,
    firstName: "Егор",
    lastName: "Ларкин",
    username: "egorlarkin",
    avatarLink: "https://i.ibb.co/6RS96KC7/pop-User3.png",
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
    publicId: 5,
    firstName: "Павел",
    lastName: "Бабкин",
    username: "pavel-b",
    avatarLink: "https://i.ibb.co/C3c6HCjb/pop-User1.png",
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

const profileById = new Map(
  PROFILE_RECORDS.flatMap((profile) => [
    [profile.id, profile] as const,
    [String(profile.publicId), profile] as const,
  ]),
);

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
  const profileId = matchedProfile?.publicId ?? input.id ?? "";

  return profileId ? `/id${profileId}` : "/profile";
}
