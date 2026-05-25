import type { GameType } from "../../../api/games";
import { gameT, type GamesI18nKey } from "./i18n";

export type GameDefinition = {
  id: string;
  gameType: GameType;
  href: string;
  minPlayers: number;
  maxPlayers: number;
  titleKey: GamesI18nKey;
  descriptionKey: GamesI18nKey;
};

export type GameCatalogItem = GameDefinition & {
  title: string;
  description: string;
  playerCount: string;
};

export const gameDefinitions: GameDefinition[] = [
  {
    id: "quiz",
    gameType: "number_duel",
    href: "/games/quiz",
    minPlayers: 2,
    maxPlayers: 8,
    titleKey: "game.numberDuel.title",
    descriptionKey: "game.numberDuel.description",
  },
];

/** Возвращает локализованное описание игры для каталога и лобби. */
export function getGameCatalogItem(definition: GameDefinition): GameCatalogItem {
  const playerCount = `${definition.minPlayers}-${definition.maxPlayers}`;
  return {
    ...definition,
    title: gameT(definition.titleKey),
    description: gameT(definition.descriptionKey),
    playerCount,
  };
}

/** Возвращает локализованный каталог всех доступных игр. */
export function getGameCatalogItems(): GameCatalogItem[] {
  return gameDefinitions.map(getGameCatalogItem);
}

/** Возвращает описание игры по route-id без локализации пользовательских строк. */
export function getGameDefinitionById(id: string): GameDefinition | null {
  return gameDefinitions.find((definition) => definition.id === id) ?? null;
}

/** Возвращает локализованное описание игры по route-id. */
export function getGameCatalogItemById(id: string): GameCatalogItem | null {
  const definition = getGameDefinitionById(id);
  return definition ? getGameCatalogItem(definition) : null;
}

/** Возвращает текущую игру по умолчанию для существующего `/games/quiz` flow. */
export function getPrimaryGameCatalogItem(): GameCatalogItem {
  return getGameCatalogItem(gameDefinitions[0]!);
}
