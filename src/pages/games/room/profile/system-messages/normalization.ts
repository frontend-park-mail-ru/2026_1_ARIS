import { getLanguageMode } from "../../../../../state/language";
import { gameT } from "../../../shared/i18n";
import { inferGenderByFirstName } from "./gender";

/**
 * Нормализует русскую букву ё/е в системных сообщениях backend.
 */
function normalizeRussianYo(value: string): string {
  return value.replace(/Ё/g, "Е").replace(/ё/g, "е");
}

function normalizeRussianSystemMessageText(text: string): string {
  const normalizedText = normalizeRussianYo(text)
    .replace(/"На рейтинг"/g, '"Рейтинговая"')
    .replace(/"Не на рейтинг"/g, '"Обычная"');

  const joinedMatch = normalizedText.match(/^(.+?) присоединил(?:ся|ась) к комнате\.$/);
  if (joinedMatch?.[1]) {
    const gender = inferGenderByFirstName(joinedMatch[1].split(/\s+/)[0] ?? "");
    if (gender === "female") {
      return normalizeRussianYo(`${joinedMatch[1]} присоединилась к комнате.`);
    }
    if (gender === "male") {
      return normalizeRussianYo(`${joinedMatch[1]} присоединился к комнате.`);
    }
  }

  const leftMatch = normalizedText.match(/^(.+?) выш(?:ел|ла) из комнаты\.$/);
  if (leftMatch?.[1]) {
    const gender = inferGenderByFirstName(leftMatch[1].split(/\s+/)[0] ?? "");
    if (gender === "female") {
      return normalizeRussianYo(`${leftMatch[1]} вышла из комнаты.`);
    }
    if (gender === "male") {
      return normalizeRussianYo(`${leftMatch[1]} вышел из комнаты.`);
    }
  }

  return normalizedText;
}

function translateRoomModeLabel(mode: string): string {
  if (mode === "Рейтинговая") return gameT("room.ranked");
  if (mode === "Обычная") return gameT("room.casual");
  return mode;
}

function translateReadyStatus(status: string): string {
  if (status === "Готов") return gameT("room.ready");
  if (status === "Не готов") return gameT("room.notReady");
  return status;
}

function translateRussianSystemMessageText(text: string): string {
  if (text === "Игра начинается.") return gameT("system.gameStarting");
  if (text === "Пароль комнаты установлен.") return gameT("system.passwordSet");
  if (text === "Пароль комнаты удален.") return gameT("system.passwordRemoved");
  if (text === "Пароль комнаты изменен.") return gameT("system.passwordChanged");

  const renamedMatch = text.match(/^Комната переименована: "(.+)"\.$/);
  if (renamedMatch?.[1]) {
    return gameT("system.roomRenamed", { title: renamedMatch[1] });
  }

  const modeMatch = text.match(/^Тип игры изменен: "(.+)"\.$/);
  if (modeMatch?.[1]) {
    return gameT("system.modeChanged", { mode: translateRoomModeLabel(modeMatch[1]) });
  }

  const adminMatch = text.match(
    /^(.+?) (?:назначил|назначила|назначил\(а\)) нового администратора: (.+)\.$/,
  );
  if (adminMatch?.[1] && adminMatch[2]) {
    return gameT("system.adminAssigned", {
      previous: adminMatch[1],
      verb: "",
      next: adminMatch[2],
    });
  }

  const joinedMatch = text.match(/^(.+?) присоединил(?:ся|ась|ся\(ась\)) к комнате\.$/);
  if (joinedMatch?.[1]) {
    return gameT("system.joined", { player: joinedMatch[1], verb: "" });
  }

  const leftMatch = text.match(/^(.+?) выш(?:ел|ла|ел\(ла\)) из комнаты\.$/);
  if (leftMatch?.[1]) {
    return gameT("system.left", { player: leftMatch[1], verb: "" });
  }

  const removedMatch = text.match(
    /^(.+?) (?:был удален|была удалена|был\(а\) удален\(а\)) из комнаты\.$/,
  );
  if (removedMatch?.[1]) {
    return gameT("system.removed", { player: removedMatch[1], verb: "" });
  }

  const readyMatch = text.match(
    /^(.+?) (?:поставил|поставила|поставил\(а\)) статус "(Готов|Не готов)"( \(\d+\/\d+\))?\.$/,
  );
  if (readyMatch?.[1] && readyMatch[2]) {
    return gameT("system.readyChanged", {
      player: readyMatch[1],
      verb: "",
      status: translateReadyStatus(readyMatch[2]),
      suffix: readyMatch[3] ?? "",
    });
  }

  return text;
}

/**
 * Нормализует и локализует уже сохранённый текст системного сообщения перед сравнением и render.
 */
export function normalizeRenderedSystemMessageText(text: string): string {
  const normalizedText = normalizeRussianSystemMessageText(text);
  if (getLanguageMode() !== "EN") return normalizedText;
  return translateRussianSystemMessageText(normalizedText);
}
