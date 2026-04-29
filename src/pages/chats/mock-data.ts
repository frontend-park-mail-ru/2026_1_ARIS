/**
 * Моковые данные страницы чатов.
 *
 * Используются как резервный источник локальных тредов, пока страница
 * не перешла полностью на API-данные или когда нужен предсказуемый dev-сценарий.
 */
import { getSessionUser } from "../../state/session";
import { PROFILE_RECORDS } from "../profile/profile-data";
import { resolvePersonPath, getCurrentUserProfilePath } from "./helpers";
import type { ChatViewThread } from "./types";

/**
 * Создаёт набор моковых тредов чата.
 *
 * @returns {ChatViewThread[]} Тестовые диалоги для локального сценария.
 */
export function createMockThreads(): ChatViewThread[] {
  const byId = (id: string) => PROFILE_RECORDS.find((p) => p.id === id);
  const currentUser = getSessionUser();
  const currentUserName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Вы";

  const pavel = byId("pavel-babkin");
  const arina = byId("arina-askhabova");
  const milana = byId("milana-shakhbieva");
  const egor = byId("egor-larkin");
  const sofya = byId("sofya-sitnichenko");

  return [
    {
      id: "mock-pavel",
      title: pavel ? `${pavel.firstName} ${pavel.lastName}` : "Павел Бабкин",
      avatarLink: pavel?.avatarLink,
      preview: "у вас неплохой диплом",
      timeLabel: "22 фев. 23:45",
      createdAt: "2026-02-22T12:50:00+03:00",
      updatedAt: "2026-02-22T23:45:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath("Павел Бабкин", pavel ? String(pavel.publicId) : undefined),
      messages: [
        {
          id: "m1",
          authorName: pavel ? `${pavel.firstName} ${pavel.lastName}` : "Павел Бабкин",
          text: "у вас неплохой диплом",
          createdAt: "2026-02-22T12:50:00+03:00",
          isOwn: false,
          avatarLink: pavel?.avatarLink,
          profilePath: resolvePersonPath(
            "Павел Бабкин",
            pavel ? String(pavel.publicId) : undefined,
          ),
        },
        {
          id: "m2",
          authorName: currentUserName,
          text: "Здравствуйте, Павел Сергеевич. Увидел вашу машину на парковке, понял, что вы сегодня в университете. Как вам в целом мой диплом? Я дополнил одно его дело, хорошо поработал над конструкторской частью. Посмотрите, отпишитесь если есть замечания. Буду рад любой критике. P.S. передавайте привет Кате",
          createdAt: "2026-02-22T23:45:00+03:00",
          isOwn: true,
          profilePath: getCurrentUserProfilePath(),
        },
        {
          id: "m3",
          authorName: pavel ? `${pavel.firstName} ${pavel.lastName}` : "Павел Бабкин",
          text: "у вас неплохой диплом",
          createdAt: "2026-02-22T12:50:00+03:00",
          isOwn: false,
          avatarLink: pavel?.avatarLink,
          profilePath: resolvePersonPath(
            "Павел Бабкин",
            pavel ? String(pavel.publicId) : undefined,
          ),
        },
      ],
    },
    {
      id: "mock-arina",
      title: arina ? `${arina.firstName} ${arina.lastName}` : "Арина Асхабова",
      avatarLink: arina?.avatarLink,
      preview: "ого!!!!!!!!!!",
      timeLabel: "1 ч.",
      createdAt: "2026-03-30T17:20:00+03:00",
      updatedAt: "2026-03-30T17:20:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath("Арина Асхабова", arina ? String(arina.publicId) : undefined),
      messages: [
        {
          id: "m4",
          authorName: arina ? `${arina.firstName} ${arina.lastName}` : "Арина Асхабова",
          text: "ого!!!!!!!!!!",
          createdAt: "2026-03-30T17:20:00+03:00",
          isOwn: false,
          avatarLink: arina?.avatarLink,
          profilePath: resolvePersonPath(
            "Арина Асхабова",
            arina ? String(arina.publicId) : undefined,
          ),
        },
      ],
    },
    {
      id: "mock-milana",
      title: milana ? `${milana.firstName} ${milana.lastName}` : "Милана Шахбиева",
      avatarLink: milana?.avatarLink,
      preview: "пойдем в мафию",
      timeLabel: "1 ч.",
      createdAt: "2026-03-30T17:05:00+03:00",
      updatedAt: "2026-03-30T17:05:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath(
        "Милана Шахбиева",
        milana ? String(milana.publicId) : undefined,
      ),
      messages: [
        {
          id: "m5",
          authorName: milana ? `${milana.firstName} ${milana.lastName}` : "Милана Шахбиева",
          text: "пойдем в мафию",
          createdAt: "2026-03-30T17:05:00+03:00",
          isOwn: false,
          avatarLink: milana?.avatarLink,
          profilePath: resolvePersonPath(
            "Милана Шахбиева",
            milana ? String(milana.publicId) : undefined,
          ),
        },
      ],
    },
    {
      id: "mock-egor",
      title: egor ? `${egor.firstName} ${egor.lastName}` : "Егор Ларкин",
      avatarLink: egor?.avatarLink,
      preview: "люблю ее сильно",
      timeLabel: "1 ч.",
      createdAt: "2026-03-30T16:45:00+03:00",
      updatedAt: "2026-03-30T16:45:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath("Егор Ларкин", egor ? String(egor.publicId) : undefined),
      messages: [
        {
          id: "m6",
          authorName: egor ? `${egor.firstName} ${egor.lastName}` : "Егор Ларкин",
          text: "люблю ее сильно",
          createdAt: "2026-03-30T16:45:00+03:00",
          isOwn: false,
          avatarLink: egor?.avatarLink,
          profilePath: resolvePersonPath("Егор Ларкин", egor ? String(egor.publicId) : undefined),
        },
      ],
    },
    {
      id: "mock-sofya",
      title: sofya ? `${sofya.firstName} ${sofya.lastName}` : "Софья Ситниченко",
      avatarLink: sofya?.avatarLink,
      preview: "ваши сообщения в 12...",
      timeLabel: "1 ч.",
      createdAt: "2026-03-30T16:15:00+03:00",
      updatedAt: "2026-03-30T16:15:00+03:00",
      source: "mock",
      profilePath: resolvePersonPath(
        "Софья Ситниченко",
        sofya ? String(sofya.publicId) : undefined,
      ),
      messages: [
        {
          id: "m7",
          authorName: sofya ? `${sofya.firstName} ${sofya.lastName}` : "Софья Ситниченко",
          text: "ваши сообщения в 12...",
          createdAt: "2026-03-30T16:15:00+03:00",
          isOwn: false,
          avatarLink: sofya?.avatarLink,
          profilePath: resolvePersonPath(
            "Софья Ситниченко",
            sofya ? String(sofya.publicId) : undefined,
          ),
        },
      ],
    },
  ];
}
