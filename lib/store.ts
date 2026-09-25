import { create } from "zustand";
import type {
  DebtLogEntry,
  GameType,
  HistoryEntry,
  ObligMode,
  Player,
  Pot,
  Round,
  Session,
} from "./types";

const SESSIONS_KEY = "dealerone_sessions";
const CURRENT_KEY = "dealerone_current_session";
export const BET_STEP = 5;
const LOAN_INTEREST_RATE = 1.1;
const MAX_DEBT_MULTIPLIER = 2;

export function loadAllSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistSession(session: Session) {
  if (typeof window === "undefined") return;
  const all = loadAllSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) all[idx] = session;
  else all.push(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
  localStorage.setItem(CURRENT_KEY, session.id);
}

// ponytail: single setTimeout debounce is fine for a single local operator; no queue/lock needed.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(session: Session) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persistSession(session), 500);
}
function flushSave(session: Session) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  persistSession(session);
}

type BlackjackOutcome = "win" | "lose" | "push" | "blackjack";

interface CreateSessionConfig {
  name: string;
  buyIn: number;
  gameType: GameType;
  obligMode: ObligMode;
  entryFee: number;
  smallBlind: number;
  bigBlind: number;
  playerNames: string[];
}

interface GameState {
  session: Session | null;
  betAmount: number;
  toast: string | null;
  limitsModalOpen: boolean;

  createSession: (config: CreateSessionConfig) => void;
  continueSession: (id: string) => void;
  hydrateCurrentSession: () => void;
  saveAndExit: () => void;
  finalizeSession: () => void;
  clearToast: () => void;
  openLimitsModal: () => void;
  closeLimitsModal: () => void;
  setLimits: (minBet: number, maxBet: number | null) => void;

  startHand: () => void;
  nextPlayer: () => void;
  prevPlayer: () => void;
  nextUnactedPlayer: () => void;

  setBetAmount: (n: number) => void;
  adjustBet: (delta: number) => void;

  placeBet: (targetTotal: number) => void;
  bet: (targetTotal: number) => void;
  call: () => void;
  fold: () => void;
  check: () => void;
  allIn: () => void;
  fastForwardToShowdown: () => void;

  loan: (playerId: string, amount: number) => void;
  transfer: (fromId: string, toId: string, amount: number) => void;
  editStack: (playerId: string, newStack: number) => void;
  repayDebt: (playerId: string, amount: number) => void;
  addPlayer: (name: string) => void;
  renamePlayer: (playerId: string, name: string) => void;

  nextStreet: () => void;
  awardPot: (potAmount: number, winnerIds: string[]) => void;
  finishHandAward: () => void;

  startBlackjackRound: () => void;
  placeBlackjackBet: (playerId: string, amount: number) => void;
  doubleDown: (playerId: string) => void;
  hit: (playerId: string) => void;
  stand: (playerId: string) => void;
  resolveBlackjack: (playerId: string, outcome: BlackjackOutcome) => void;
}

function log(session: Session, text: string): HistoryEntry[] {
  return [{ id: crypto.randomUUID(), text }, ...session.history].slice(0, 50);
}

function canAct(p: Player) {
  return p.status === "active";
}

export function roundHighestBet(session: Session): number {
  return Math.max(0, ...session.players.filter((p) => p.status !== "folded").map((p) => p.currentBet));
}

// A betting round is over once every remaining active player has matched the highest bet and
// acted, OR once there's at most one player left who could still voluntarily bet (everyone
// else is all-in or folded) — nobody left to call/raise against, so betting is capped.
export function bettingRoundComplete(session: Session): boolean {
  const nonFolded = session.players.filter((p) => p.status !== "folded");
  if (nonFolded.length <= 1) return true;
  const active = session.players.filter((p) => p.status === "active");
  if (active.length <= 1) return true;
  const highest = roundHighestBet(session);
  return active.every((p) => p.hasActed && p.currentBet === highest);
}

// True while multiple players are still contesting the pot but betting is capped (at most one
// player has chips behind) and the hand hasn't reached showdown yet — the state the "auto ir a
// showdown" runout button targets.
export function isAllInRunout(session: Session): boolean {
  const nonFolded = session.players.filter((p) => p.status !== "folded");
  const active = session.players.filter((p) => p.status === "active");
  return nonFolded.length > 1 && active.length <= 1 && session.round !== "showdown";
}

// Splits session.pot into main/side pots from each player's total contribution this hand
// (committed), following the standard side-pot algorithm: each distinct all-in commitment
// level caps a pot layer to only the players who put in at least that much.
export function computePots(session: Session): Pot[] {
  const contributors = session.players.filter((p) => p.committed > 0);
  if (contributors.length === 0) {
    return [
      {
        label: "Pozo Principal",
        amount: session.pot,
        eligiblePlayerIds: session.players.filter((p) => p.status !== "folded").map((p) => p.id),
      },
    ];
  }

  const allInLevels = Array.from(
    new Set(contributors.filter((p) => p.status === "allin").map((p) => p.committed))
  ).sort((a, b) => a - b);

  const pots: Pot[] = [];
  let previous = 0;
  for (const level of allInLevels) {
    const amount = (level - previous) * contributors.filter((p) => p.committed >= level).length;
    if (amount > 0) {
      pots.push({
        label: pots.length === 0 ? "Pozo Principal" : `Pozo Secundario ${pots.length}`,
        amount,
        eligiblePlayerIds: session.players
          .filter((p) => p.status !== "folded" && p.committed >= level)
          .map((p) => p.id),
      });
    }
    previous = level;
  }

  const remainder = contributors.reduce((sum, p) => sum + Math.max(0, p.committed - previous), 0);
  if (remainder > 0) {
    pots.push({
      label: pots.length === 0 ? "Pozo Principal" : `Pozo Secundario ${pots.length}`,
      amount: remainder,
      eligiblePlayerIds: session.players
        .filter((p) => p.status !== "folded" && p.committed > previous)
        .map((p) => p.id),
    });
  }

  if (pots.length === 0) {
    pots.push({
      label: "Pozo Principal",
      amount: session.pot,
      eligiblePlayerIds: session.players.filter((p) => p.status !== "folded").map((p) => p.id),
    });
  }
  return pots;
}

// Validates a voluntary bet/raise (the BET button / Enter key) against the table's
// configured min/max. The dedicated call()/check() actions never go through this, so
// matching an existing bet is always allowed regardless of these limits; only all-ins
// bypass them here.
export function validateBetAmount(
  session: Session,
  player: Player,
  targetTotal: number
): { ok: boolean; reason?: string } {
  const highest = roundHighestBet(session);
  const isAllIn = targetTotal >= player.currentBet + player.stack;
  if (isAllIn) return { ok: true };

  // No voluntary raise yet this street (only the mandatory ante/blind, if any) -> minBet is the
  // floor. Otherwise raising over an existing bet must add at least minBet on top of it.
  const floor = Math.max(session.entryFee, session.bigBlind);
  const isFirstVoluntaryBet = highest <= floor;
  const requiredMin = isFirstVoluntaryBet ? session.minBet : highest + session.minBet;
  if (targetTotal < requiredMin) return { ok: false, reason: `Minimo es $${requiredMin}` };
  if (session.maxBet !== null && targetTotal > session.maxBet) {
    return { ok: false, reason: `Maximo es $${session.maxBet}` };
  }
  return { ok: true };
}

// ponytail: heads-up (2-player) blinds special case IS handled in startHand (dealer = SB).
// This generic search just skips folded/all-in players for rotation purposes elsewhere.
function findNextIndex(players: Player[], from: number, predicate: (p: Player) => boolean) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (predicate(players[idx])) return idx;
  }
  return from;
}

// Charges a player the required ante/blind. If their stack can't cover it, the shortfall
// becomes debt (auto-loan) so the player is never excluded from the hand.
function chargeRequired(player: Player, required: number): { player: Player; deficitToast: string | null } {
  const base = { ...player, currentBet: required, committed: required, hasActed: false };
  if (player.stack >= required) {
    const stack = player.stack - required;
    return { player: { ...base, stack, status: stack === 0 ? "allin" : "active" }, deficitToast: null };
  }
  const deficit = required - player.stack;
  return {
    player: { ...base, stack: 0, debt: player.debt + deficit, status: "allin" },
    deficitToast: `${player.name} entro con $${deficit} de deuda`,
  };
}

export const useGameStore = create<GameState>()((set, get) => ({
  session: null,
  betAmount: BET_STEP,
  toast: null,
  limitsModalOpen: false,

  createSession: (config) => {
    const { name, buyIn, gameType, obligMode, entryFee, smallBlind, bigBlind, playerNames } = config;
    const players: Player[] = playerNames.map((n) => ({
      id: crypto.randomUUID(),
      name: n,
      stack: buyIn,
      debt: 0,
      status: "active",
      currentBet: 0,
      committed: 0,
      hasActed: false,
      loanLastHandId: null,
    }));
    const session: Session = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      buyIn,
      entryFee,
      obligMode,
      smallBlind,
      bigBlind,
      minBet: obligMode === "blinds" ? bigBlind : Math.max(entryFee * 2, 10),
      maxBet: null,
      gameType,
      status: "active",
      players,
      dealerIndex: -1,
      currentPlayerIndex: 0,
      pot: 0,
      round: "preflop",
      handId: "",
      history: [],
      debtLog: [],
    };
    set({ session, betAmount: BET_STEP });
    flushSave(session);
    get().startHand();
  },

  continueSession: (id) => {
    const found = loadAllSessions().find((s) => s.id === id);
    if (!found) return;
    set({ session: found, betAmount: BET_STEP });
  },

  hydrateCurrentSession: () => {
    if (typeof window === "undefined") return;
    const id = localStorage.getItem(CURRENT_KEY);
    if (!id) return;
    const found = loadAllSessions().find((s) => s.id === id && s.status === "active");
    if (found) set({ session: found });
  },

  saveAndExit: () => {
    const s = get().session;
    if (s) flushSave(s);
    set({ session: null });
  },

  finalizeSession: () => {
    const s = get().session;
    if (!s) return;
    const finished = { ...s, status: "finished" as const };
    flushSave(finished);
    set({ session: null });
  },

  clearToast: () => set({ toast: null }),
  openLimitsModal: () => set({ limitsModalOpen: true }),
  closeLimitsModal: () => set({ limitsModalOpen: false }),

  setLimits: (minBet, maxBet) => {
    const s = get().session;
    if (!s) return;
    const session: Session = {
      ...s,
      minBet: Math.max(0, Math.round(minBet)),
      maxBet: maxBet === null ? null : Math.max(0, Math.round(maxBet)),
    };
    set({ session, limitsModalOpen: false });
    scheduleSave(session);
  },

  startHand: () => {
    const s = get().session;
    if (!s) return;
    if (s.gameType === "blackjack") {
      get().startBlackjackRound();
      return;
    }

    const n = s.players.length;
    const dealerIndex = (s.dealerIndex + 1) % n;
    const handId = crypto.randomUUID();
    const toasts: string[] = [];
    let pot = 0;
    let players: Player[];
    let currentPlayerIndex: number;
    let historyText: string;

    if (s.obligMode === "blinds") {
      const headsUp = n === 2;
      const sbIndex = headsUp ? dealerIndex : (dealerIndex + 1) % n;
      const bbIndex = headsUp ? (dealerIndex + 1) % n : (dealerIndex + 2) % n;
      players = s.players.map((p, i) => {
        const base: Player = { ...p, status: "active", currentBet: 0, committed: 0, hasActed: false };
        if (i === sbIndex) {
          const r = chargeRequired(base, s.smallBlind);
          pot += s.smallBlind;
          if (r.deficitToast) toasts.push(r.deficitToast);
          return r.player;
        }
        if (i === bbIndex) {
          const r = chargeRequired(base, s.bigBlind);
          pot += s.bigBlind;
          if (r.deficitToast) toasts.push(r.deficitToast);
          return r.player;
        }
        return base;
      });
      currentPlayerIndex = findNextIndex(players, bbIndex, canAct);
      historyText = `Nueva mano — Dealer: ${players[dealerIndex].name} — Ciegas $${s.smallBlind}/$${s.bigBlind}`;
    } else {
      players = s.players.map((p) => {
        const base: Player = { ...p, status: "active", currentBet: 0, committed: 0, hasActed: false };
        if (s.entryFee <= 0) return base;
        const r = chargeRequired(base, s.entryFee);
        pot += s.entryFee;
        if (r.deficitToast) toasts.push(r.deficitToast);
        return r.player;
      });
      currentPlayerIndex = findNextIndex(players, dealerIndex, canAct);
      historyText = `Nueva mano — Dealer: ${players[dealerIndex].name}${s.entryFee > 0 ? ` — Ante $${s.entryFee} x ${n}` : ""}`;
    }

    const session: Session = {
      ...s,
      players,
      dealerIndex,
      pot,
      round: "preflop",
      currentPlayerIndex,
      handId,
      history: log(s, historyText),
    };
    set({ session, betAmount: BET_STEP, toast: toasts[0] ?? null });
    scheduleSave(session);
  },

  nextPlayer: () => {
    const s = get().session;
    if (!s) return;
    set({ session: { ...s, currentPlayerIndex: findNextIndex(s.players, s.currentPlayerIndex, canAct) } });
  },

  prevPlayer: () => {
    const s = get().session;
    if (!s) return;
    const n = s.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (s.currentPlayerIndex - i + n * 2) % n;
      if (canAct(s.players[idx])) {
        set({ session: { ...s, currentPlayerIndex: idx } });
        return;
      }
    }
  },

  nextUnactedPlayer: () => {
    const s = get().session;
    if (!s) return;
    set({
      session: {
        ...s,
        currentPlayerIndex: findNextIndex(s.players, s.currentPlayerIndex, (p) => canAct(p) && !p.hasActed),
      },
    });
  },

  setBetAmount: (n) => set({ betAmount: Math.max(0, Math.round(n)) }),
  adjustBet: (delta) => set((st) => ({ betAmount: Math.max(0, Math.round(st.betAmount + delta)) })),

  // targetTotal = the player's desired total contribution to the pot THIS street (not a delta).
  placeBet: (targetTotal) => {
    const s = get().session;
    if (!s) return;
    const players = [...s.players];
    const p = { ...players[s.currentPlayerIndex] };
    const target = Math.max(p.currentBet, Math.round(targetTotal));
    const additional = Math.max(0, Math.min(target - p.currentBet, p.stack));
    p.stack -= additional;
    p.currentBet += additional;
    p.committed += additional;
    p.hasActed = true;
    if (p.stack === 0) p.status = "allin";
    players[s.currentPlayerIndex] = p;

    const session: Session = {
      ...s,
      players,
      pot: s.pot + additional,
      history: log(s, `${p.name} apuesta $${p.currentBet}${additional > 0 ? ` (+$${additional})` : ""}`),
    };
    set({ session, betAmount: BET_STEP });
    scheduleSave(session);
    get().nextPlayer();
  },

  // Validated entry point for voluntary bets/raises (the BET button + Enter key).
  bet: (targetTotal) => {
    const s = get().session;
    if (!s) return;
    const current = s.players[s.currentPlayerIndex];
    const result = validateBetAmount(s, current, targetTotal);
    if (!result.ok) {
      set({ toast: result.reason ?? null });
      return;
    }
    get().placeBet(targetTotal);
  },

  call: () => {
    const s = get().session;
    if (!s) return;
    get().placeBet(roundHighestBet(s));
  },

  fold: () => {
    const s = get().session;
    if (!s) return;
    const players = [...s.players];
    players[s.currentPlayerIndex] = { ...players[s.currentPlayerIndex], status: "folded", hasActed: true };
    const session: Session = { ...s, players, history: log(s, `${players[s.currentPlayerIndex].name} se retira`) };
    set({ session });
    scheduleSave(session);
    get().nextPlayer();
  },

  check: () => {
    const s = get().session;
    if (!s) return;
    const current = s.players[s.currentPlayerIndex];
    if (current.currentBet !== roundHighestBet(s)) return;
    const players = [...s.players];
    players[s.currentPlayerIndex] = { ...players[s.currentPlayerIndex], hasActed: true };
    const session: Session = { ...s, players, history: log(s, `${players[s.currentPlayerIndex].name} pasa`) };
    set({ session });
    scheduleSave(session);
    get().nextPlayer();
  },

  allIn: () => {
    const s = get().session;
    if (!s) return;
    const p = s.players[s.currentPlayerIndex];
    get().placeBet(p.currentBet + p.stack);
  },

  // Jumps straight to showdown once betting is capped (everyone left is all-in or folded) —
  // there's no further card animation to step through, so one click resolves the runout.
  fastForwardToShowdown: () => {
    const s = get().session;
    if (!s) return;
    const session: Session = { ...s, round: "showdown", history: log(s, "-- Reparto automatico: todos all-in --") };
    set({ session });
    scheduleSave(session);
  },

  loan: (playerId, amount) => {
    const s = get().session;
    if (!s) return;
    const player = s.players.find((p) => p.id === playerId);
    if (!player) return;
    const maxDebt = s.buyIn * MAX_DEBT_MULTIPLIER;
    if (player.debt >= maxDebt) {
      set({ toast: "Deuda maxima alcanzada" });
      return;
    }
    if (s.handId && player.loanLastHandId === s.handId) {
      set({ toast: "Ya pediste en esta mano" });
      return;
    }
    const hasInterest = player.debt > 0;
    const actualAdded = hasInterest ? Math.round(amount * LOAN_INTEREST_RATE) : amount;
    const players = s.players.map((p) =>
      p.id === playerId
        ? { ...p, stack: p.stack + amount, debt: p.debt + actualAdded, loanLastHandId: s.handId }
        : p
    );
    const debtLog: DebtLogEntry[] = [
      ...s.debtLog,
      { id: crypto.randomUUID(), type: "loan", playerId, amount: actualAdded, timestamp: Date.now() },
    ];
    const session: Session = {
      ...s,
      players,
      debtLog,
      history: log(s, `Prestamo de $${amount} a ${player.name}${hasInterest ? ` (+10% interes = $${actualAdded} de deuda)` : ""}`),
    };
    set({ session });
    scheduleSave(session);
  },

  transfer: (fromId, toId, amount) => {
    const s = get().session;
    if (!s) return;
    const donor = s.players.find((p) => p.id === fromId);
    const receiver = s.players.find((p) => p.id === toId);
    if (!donor || !receiver || fromId === toId || amount <= 0 || donor.stack < amount) return;
    const players = s.players.map((p) => {
      if (p.id === fromId) return { ...p, stack: p.stack - amount };
      if (p.id === toId) return { ...p, stack: p.stack + amount };
      return p;
    });
    const session: Session = { ...s, players, history: log(s, `${donor.name} dona $${amount} a ${receiver.name}`) };
    set({ session });
    scheduleSave(session);
  },

  editStack: (playerId, newStack) => {
    const s = get().session;
    if (!s) return;
    const name = s.players.find((p) => p.id === playerId)?.name ?? "";
    const players = s.players.map((p) => (p.id === playerId ? { ...p, stack: Math.max(0, newStack) } : p));
    const session: Session = { ...s, players, history: log(s, `Stack de ${name} editado a $${newStack}`) };
    set({ session });
    scheduleSave(session);
  },

  repayDebt: (playerId, amount) => {
    const s = get().session;
    if (!s) return;
    const name = s.players.find((p) => p.id === playerId)?.name ?? "";
    const players = s.players.map((p) => (p.id === playerId ? { ...p, debt: Math.max(0, p.debt - amount) } : p));
    const debtLog: DebtLogEntry[] = [...s.debtLog, { id: crypto.randomUUID(), type: "repay", playerId, amount, timestamp: Date.now() }];
    const session: Session = { ...s, players, debtLog, history: log(s, `${name} salda $${amount} de deuda`) };
    set({ session });
    scheduleSave(session);
  },

  addPlayer: (name) => {
    const s = get().session;
    if (!s) return;
    const trimmed = name.trim();
    if (!trimmed || s.players.length >= 10) return;
    const player: Player = {
      id: crypto.randomUUID(),
      name: trimmed,
      stack: s.buyIn,
      debt: 0,
      status: "folded",
      currentBet: 0,
      committed: 0,
      hasActed: false,
      loanLastHandId: null,
    };
    const session: Session = { ...s, players: [...s.players, player], history: log(s, `${trimmed} se une a la mesa`) };
    set({ session });
    scheduleSave(session);
  },

  renamePlayer: (playerId, name) => {
    const s = get().session;
    if (!s) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const players = s.players.map((p) => (p.id === playerId ? { ...p, name: trimmed } : p));
    const session: Session = { ...s, players };
    set({ session });
    scheduleSave(session);
  },

  nextStreet: () => {
    const s = get().session;
    if (!s) return;
    const order: Round[] = ["preflop", "flop", "turn", "river", "showdown"];
    const next = order[Math.min(order.indexOf(s.round) + 1, order.length - 1)];
    const players = s.players.map((p) => ({ ...p, currentBet: 0, hasActed: false }));
    const firstActive = findNextIndex(players, s.dealerIndex, canAct);
    const session: Session = {
      ...s,
      round: next,
      players,
      currentPlayerIndex: firstActive,
      history: log(s, `-- ${next.toUpperCase()} --`),
    };
    set({ session, betAmount: BET_STEP });
    scheduleSave(session);
  },

  // Awards one pot layer (main or a side pot) to its winner(s). Debt is repaid first out of
  // each winner's own share before it hits their stack. Does not touch session.pot/round —
  // call finishHandAward() once every layer from computePots() has been awarded.
  awardPot: (potAmount, winnerIds) => {
    const s = get().session;
    if (!s || winnerIds.length === 0) return;
    const share = Math.floor(potAmount / winnerIds.length);
    const remainder = potAmount - share * winnerIds.length;
    const messages: string[] = [];
    const players = s.players.map((p) => {
      if (!winnerIds.includes(p.id)) return p;
      const bonus = winnerIds.indexOf(p.id) === 0 ? remainder : 0;
      const winnings = share + bonus;
      const payDebt = Math.min(winnings, p.debt);
      const winningsLeft = winnings - payDebt;
      if (payDebt > 0) {
        messages.push(`$${payDebt} de deuda saldada a ${p.name}${winningsLeft > 0 ? `, le quedan $${winningsLeft}` : ""}`);
      }
      return { ...p, stack: p.stack + winningsLeft, debt: p.debt - payDebt };
    });
    const names = s.players.filter((p) => winnerIds.includes(p.id)).map((p) => p.name).join(", ");
    const session: Session = { ...s, players, history: log(s, `$${potAmount} repartido a ${names}`) };
    set({ session, toast: messages[0] ?? null });
    scheduleSave(session);
  },

  finishHandAward: () => {
    const s = get().session;
    if (!s) return;
    const session: Session = { ...s, pot: 0, round: "showdown" };
    set({ session });
    scheduleSave(session);
  },

  startBlackjackRound: () => {
    const s = get().session;
    if (!s) return;
    const n = s.players.length;
    const bankerIndex = (s.dealerIndex + 1) % n;
    const handId = crypto.randomUUID();
    const players: Player[] = s.players.map((p, i) => ({
      ...p,
      status: i === bankerIndex ? "folded" : "active",
      currentBet: 0,
      committed: 0,
      hasActed: false,
    }));
    const session: Session = {
      ...s,
      players,
      dealerIndex: bankerIndex,
      pot: 0,
      currentPlayerIndex: bankerIndex,
      handId,
      history: log(s, `Nueva ronda — Banca: ${players[bankerIndex].name}`),
    };
    set({ session, betAmount: BET_STEP });
    scheduleSave(session);
  },

  placeBlackjackBet: (playerId, amount) => {
    const s = get().session;
    if (!s) return;
    const player = s.players.find((p) => p.id === playerId);
    if (!player || player.status === "folded") return;
    const amt = Math.max(0, Math.min(Math.round(amount), player.stack));
    const players = s.players.map((p) =>
      p.id === playerId ? { ...p, stack: p.stack - amt, currentBet: amt, committed: amt, hasActed: true } : p
    );
    const session: Session = { ...s, players, history: log(s, `${player.name} apuesta $${amt}`) };
    set({ session });
    scheduleSave(session);
  },

  doubleDown: (playerId) => {
    const s = get().session;
    if (!s) return;
    const player = s.players.find((p) => p.id === playerId);
    if (!player || player.currentBet <= 0 || player.stack < player.currentBet) return;
    const extra = player.currentBet;
    const players = s.players.map((p) =>
      p.id === playerId
        ? { ...p, stack: p.stack - extra, currentBet: p.currentBet + extra, committed: p.committed + extra }
        : p
    );
    const session: Session = { ...s, players, history: log(s, `${player.name} dobla a $${player.currentBet + extra}`) };
    set({ session });
    scheduleSave(session);
  },

  hit: (playerId) => {
    const s = get().session;
    if (!s) return;
    const player = s.players.find((p) => p.id === playerId);
    if (!player) return;
    const session: Session = { ...s, history: log(s, `${player.name} pide carta`) };
    set({ session });
    scheduleSave(session);
  },

  stand: (playerId) => {
    const s = get().session;
    if (!s) return;
    const player = s.players.find((p) => p.id === playerId);
    if (!player) return;
    const session: Session = { ...s, history: log(s, `${player.name} se planta`) };
    set({ session });
    scheduleSave(session);
  },

  resolveBlackjack: (playerId, outcome) => {
    const s = get().session;
    if (!s) return;
    const banker = s.players[s.dealerIndex];
    const player = s.players.find((p) => p.id === playerId);
    if (!player || player.currentBet <= 0) return;
    const bet = player.currentBet;

    let playerDelta = 0;
    let bankerDelta = 0;
    let winnings = 0;

    if (outcome === "lose") {
      bankerDelta = bet;
    } else if (outcome === "push") {
      playerDelta = bet;
    } else if (outcome === "win") {
      playerDelta = bet * 2;
      bankerDelta = -bet;
      winnings = bet;
    } else {
      const bonus = Math.round(bet * 1.5);
      playerDelta = bet + bonus;
      bankerDelta = -bonus;
      winnings = bonus;
    }

    const payDebt = Math.min(winnings, player.debt);
    const players = s.players.map((p) => {
      if (p.id === playerId) {
        return { ...p, stack: p.stack + playerDelta - payDebt, debt: p.debt - payDebt, currentBet: 0 };
      }
      if (p.id === banker.id) {
        return { ...p, stack: p.stack + bankerDelta };
      }
      return p;
    });

    const outcomeLabel = { lose: "pierde", push: "empata", win: "gana", blackjack: "hace Blackjack" }[outcome];
    const session: Session = { ...s, players, history: log(s, `${player.name} ${outcomeLabel} vs banca ($${bet})`) };
    set({ session, toast: payDebt > 0 ? `$${payDebt} de deuda saldada a ${player.name}` : null });
    scheduleSave(session);
  },
}));
