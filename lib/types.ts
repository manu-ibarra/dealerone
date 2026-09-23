export type GameType = "texas_holdem" | "omaha" | "five_card_draw";

export type PlayerStatus = "active" | "folded" | "allin";

export type Round = "preflop" | "flop" | "turn" | "river" | "showdown";

export interface Player {
  id: string;
  name: string;
  stack: number;
  debt: number;
  status: PlayerStatus;
  currentBet: number;
  hasActed: boolean;
}

export interface HistoryEntry {
  id: string;
  text: string;
}

export interface DebtLogEntry {
  id: string;
  type: "loan" | "repay";
  playerId: string;
  amount: number;
  timestamp: number;
}

export type SessionStatus = "active" | "finished";

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  buyIn: number;
  entryFee: number;
  minBet: number;
  maxBet: number | null;
  gameType: GameType;
  status: SessionStatus;
  players: Player[];
  dealerIndex: number;
  currentPlayerIndex: number;
  pot: number;
  round: Round;
  history: HistoryEntry[];
  debtLog: DebtLogEntry[];
}
