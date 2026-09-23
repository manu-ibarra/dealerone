import { create } from "zustand";
import type { DebtLogEntry, GameType, HistoryEntry, Player, Round, Session } from "./types";

const SESSIONS_KEY = "dealerone_sessions";
const CURRENT_KEY = "dealerone_current_session";
export const BET_STEP = 5;

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

interface GameState {
  session: Session | null;
  betAmount: number;
  toast: string | null;

  createSession: (name: string, buyIn: number, entryFee: number, playerNames: string[]) => void;
  continueSession: (id: string) => void;
  hydrateCurrentSession: () => void;
  saveAndExit: () => void;
  finalizeSession: () => void;
  clearToast: () => void;

  startHand: () => void;
  nextPlayer: () => void;
  prevPlayer: () => void;
  nextUnactedPlayer: () => void;

  setBetAmount: (n: number) => void;
  adjustBet: (delta: number) => void;

  placeBet: (targetTotal: number) => void;
  call: () => void;
  fold: () => void;
  check: () => void;
  allIn: () => void;

  loan: (playerId: string, amount: number) => void;
  transfer: (fromId: string, toId: string, amount: number) => void;
  editStack: (playerId: string, newStack: number) => void;
  repayDebt: (playerId: string, amount: number) => void;

  nextStreet: () => void;
  awardPot: (winnerIds: string[]) => void;
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

export function bettingRoundComplete(session: Session): boolean {
  const highest = roundHighestBet(session);
  const active = session.players.filter((p) => p.status === "active");
  return active.length > 0 && active.every((p) => p.hasActed && p.currentBet === highest);
}

// ponytail: heads-up (2-player) dealer-acts-first special case not implemented, treats dealer like a full ring.
function findNextIndex(players: Player[], from: number, predicate: (p: Player) => boolean) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (predicate(players[idx])) return idx;
  }
  return from;
}

export const useGameStore = create<GameState>()((set, get) => ({
  session: null,
  betAmount: BET_STEP,
  toast: null,

  createSession: (name, buyIn, entryFee, playerNames) => {
    const players: Player[] = playerNames.map((n) => ({
      id: crypto.randomUUID(),
      name: n,
      stack: buyIn,
      debt: 0,
      status: "active",
      currentBet: 0,
      hasActed: false,
    }));
    const session: Session = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      buyIn,
      entryFee,
      gameType: "texas_holdem" as GameType,
      status: "active",
      players,
      dealerIndex: -1,
      currentPlayerIndex: 0,
      pot: 0,
      round: "preflop",
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

  startHand: () => {
    const s = get().session;
    if (!s) return;
    const n = s.players.length;
    const dealerIndex = (s.dealerIndex + 1) % n;

    let pot = 0;
    const players: Player[] = s.players.map((p) => {
      const fee = Math.min(s.entryFee, p.stack);
      pot += fee;
      const stack = p.stack - fee;
      return { ...p, status: stack === 0 ? "allin" : "active", currentBet: fee, hasActed: false, stack };
    });

    const session: Session = {
      ...s,
      players,
      dealerIndex,
      pot,
      round: "preflop",
      currentPlayerIndex: (dealerIndex + 1) % n,
      history: log(s, `Nueva mano — Dealer: ${players[dealerIndex].name}${s.entryFee > 0 ? ` — Ante $${s.entryFee} x ${n}` : ""}`),
    };
    set({ session, betAmount: BET_STEP });
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

  loan: (playerId, amount) => {
    const s = get().session;
    if (!s) return;
    const name = s.players.find((p) => p.id === playerId)?.name ?? "";
    const players = s.players.map((p) => (p.id === playerId ? { ...p, stack: p.stack + amount, debt: p.debt + amount } : p));
    const debtLog: DebtLogEntry[] = [...s.debtLog, { id: crypto.randomUUID(), type: "loan", playerId, amount, timestamp: Date.now() }];
    const session: Session = { ...s, players, debtLog, history: log(s, `Prestamo de $${amount} a ${name}`) };
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

  awardPot: (winnerIds) => {
    const s = get().session;
    if (!s) return;
    const share = Math.floor(s.pot / winnerIds.length);
    const remainder = s.pot - share * winnerIds.length;
    let settledDebt = 0;
    const players = s.players.map((p) => {
      if (!winnerIds.includes(p.id)) return p;
      const bonus = winnerIds.indexOf(p.id) === 0 ? remainder : 0;
      const winnings = share + bonus;
      const deduction = Math.min(winnings, p.debt);
      settledDebt += deduction;
      return { ...p, stack: p.stack + winnings - deduction, debt: p.debt - deduction };
    });
    const names = s.players.filter((p) => winnerIds.includes(p.id)).map((p) => p.name).join(", ");
    const session: Session = {
      ...s,
      players,
      pot: 0,
      round: "showdown",
      history: log(s, `Bote de $${s.pot} repartido a ${names}`),
    };
    set({ session, toast: settledDebt > 0 ? `$${settledDebt} de deuda saldada` : null });
    scheduleSave(session);
  },
}));
