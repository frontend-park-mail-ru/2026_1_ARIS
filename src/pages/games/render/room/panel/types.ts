import type { GameRoom } from "../../../../../api/games";
import type { GameCatalogItem } from "../../../shared/registry";

type GamePlayer = GameRoom["players"][number];

export type RenderRoomPanelOptions = {
  room: GameRoom;
  game: GameCatalogItem;
  headingTitle: string;
  showRoomHeader: boolean;
  showRulesHint: boolean;
  loading: boolean;
  roomTitle: string;
  roomPasswordDisplay: string;
  titleMenuOpen: boolean;
  passwordMenuOpen: boolean;
  canManageRanked: boolean;
  canDisbandRoom: boolean;
  canLeaveRoom: boolean;
  canStartRoom: boolean;
  startTooltipLines: string[];
  currentPlayer: GamePlayer | null;
  rankedBadge: string;
  rankedToggle: string;
  lobbyCreator: string;
  participantsStatus: string;
  readyStatus: string;
  pauseAction: string;
  gamePlay: string;
  playerList: string;
  passwordError: string;
  footerError: string;
};
