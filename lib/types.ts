export type GameType = "texas_holdem" | "omaha" | "five_card_draw" | "blackjack";

export type PlayerStatus = "active" | "folded" | "allin";

export type Round = "preflop" | "flop" | "turn" | "river" | "showdown";

export type ObligMode = "ante" | "blinds";

export interface Player {
  id: string;
  name: string;
  stack: number;
  debt: number;
  status: PlayerStatus;
  currentBet: number;
  committed: number;
  hasActed: boolean;
  loanLastHandId: string | null;
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

export interface Pot {
  label: string;
  amount: number;
  eligiblePlayerIds: string[];
}

export type SessionStatus = "active" | "finished";

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  buyIn: number;
  entryFee: number;
  obligMode: ObligMode;
  smallBlind: number;
  bigBlind: number;
  minBet: number;
  maxBet: number | null;
  gameType: GameType;
  status: SessionStatus;
  players: Player[];
  dealerIndex: number;
  currentPlayerIndex: number;
  pot: number;
  round: Round;
  handId: string;
  history: HistoryEntry[];
  debtLog: DebtLogEntry[];
}
