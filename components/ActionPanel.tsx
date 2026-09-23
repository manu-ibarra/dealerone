"use client";

import { useState } from "react";
import { bettingRoundComplete, roundHighestBet, useGameStore } from "@/lib/store";
import type { Player } from "@/lib/types";
import LimitsModal from "./LimitsModal";

const ROUND_LABEL: Record<string, string> = {
  preflop: "Pre-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

const NEXT_STREET_LABEL: Record<string, string> = {
  preflop: "Repartir Flop",
  flop: "Repartir Turn",
  turn: "Repartir River",
  river: "Ir a Showdown",
};

export default function ActionPanel() {
  const {
    session,
    betAmount,
    setBetAmount,
    bet,
    call,
    fold,
    check,
    nextStreet,
    awardPot,
    startHand,
    limitsModalOpen,
    openLimitsModal,
    closeLimitsModal,
    setLimits,
  } = useGameStore();
  const [winnerPanelOpen, setWinnerPanelOpen] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);

  if (!session) return null;
  const current = session.players[session.currentPlayerIndex];
  const dealer = session.players[session.dealerIndex];
  const nonFolded = session.players.filter((p) => p.status !== "folded");
  const handConcluded = session.round === "showdown" || nonFolded.length <= 1;

  if (!current) return null;

  const highestBet = roundHighestBet(session);
  const canCheck = current.status === "active" && current.currentBet === highestBet;
  const amountToCall = highestBet - current.currentBet;
  const roundComplete = bettingRoundComplete(session);
  const anteOnly =
    session.round === "preflop" && nonFolded.every((p) => p.currentBet === session.entryFee);

  const quickChips = [
    { label: "5", value: 5, isAllIn: false },
    { label: "10", value: 10, isAllIn: false },
    { label: "25", value: 25, isAllIn: false },
    { label: "100", value: 100, isAllIn: false },
    { label: "1/2 Pot", value: Math.floor(session.pot / 2), isAllIn: false },
    { label: "Pot", value: session.pot, isAllIn: false },
    { label: "ALL IN", value: current.currentBet + current.stack, isAllIn: true },
  ];

  const openWinnerPanel = () => {
    setWinners(nonFolded.length === 1 ? [nonFolded[0].id] : []);
    setWinnerPanelOpen(true);
  };

  return (
    <div className="flex h-full flex-col justify-between bg-pampas px-8 py-6">
      <div>
        <div className="mb-2 flex justify-start">
          <button
            onClick={openLimitsModal}
            className="flex h-8 items-center rounded-full border border-cloudy bg-white px-3 text-xs font-medium text-ink/70 hover:border-terracotta hover:text-terracotta"
          >
            ⚙️ Limites: ${session.minBet} / {session.maxBet === null ? "∞" : `$${session.maxBet}`}
          </button>
        </div>
        <div className="flex items-center justify-between text-sm text-ink/60">
          <span>
            Stack: <span className="font-semibold text-ink">${session.buyIn}</span>
            {session.entryFee > 0 && (
              <>
                {" "}
                · Ante: <span className="font-semibold text-ink">${session.entryFee}</span>
              </>
            )}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">
            {ROUND_LABEL[session.round]}
          </span>
          <span>
            Dealer: <span className="font-semibold text-ink">{dealer?.name}</span>
          </span>
        </div>

        <div className="mt-2 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">Bote</div>
          <div className="text-5xl font-bold text-terracotta">${session.pot}</div>
          {anteOnly && session.entryFee > 0 && (
            <div className="mt-1 text-xs text-ink/50">
              {nonFolded.length} jugadores x ${session.entryFee}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">Turno de</div>
          <div className="text-4xl font-extrabold tracking-tight">{current.name.toUpperCase()}</div>
          <div className="mt-1 text-sm text-ink/60">Stack: ${current.stack}</div>
        </div>
      </div>

      {handConcluded ? (
        session.pot === 0 ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-ink/60">Mano terminada.</p>
            <button
              onClick={startHand}
              className="rounded-full bg-terracotta px-8 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Nueva Mano
            </button>
          </div>
        ) : winnerPanelOpen ? (
          <WinnerSelector
            players={nonFolded}
            pot={session.pot}
            winners={winners}
            setWinners={setWinners}
            onAward={() => {
              awardPot(winners.length ? winners : nonFolded.map((p) => p.id));
              setWinnerPanelOpen(false);
            }}
          />
        ) : (
          <div className="flex justify-center py-6">
            <button
              onClick={openWinnerPanel}
              className="rounded-full bg-terracotta px-8 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Repartir Pozo / Elegir Ganador
            </button>
          </div>
        )
      ) : (
        <div className="space-y-6">
          {highestBet > 0 && !canCheck && (
            <p className="text-center text-xs font-medium text-terracotta">
              Ya apostaste ${current.currentBet}. Para igualar ${highestBet} necesitas ${amountToCall} mas
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {quickChips.map((c) => {
              const disabled =
                !c.isAllIn &&
                (c.value < session.minBet || (session.maxBet !== null && c.value > session.maxBet));
              return (
                <button
                  key={c.label}
                  onClick={() => setBetAmount(c.value)}
                  disabled={disabled}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    disabled
                      ? "cursor-not-allowed border-cloudy/40 text-ink/30 opacity-30"
                      : betAmount === c.value
                        ? "border-terracotta bg-terracotta text-white"
                        : "border-cloudy text-ink/70 hover:border-terracotta hover:text-terracotta"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={Math.max(current.stack, 1)}
              value={Math.min(betAmount, current.stack)}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="flex-1 accent-[#C15F3C]"
            />
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="w-24 rounded-md border border-cloudy bg-white px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => bet(betAmount)}
              className="flex-1 rounded-full bg-terracotta py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              BET
            </button>
            {canCheck ? (
              <button
                onClick={check}
                className="flex-1 rounded-full border border-cloudy py-3 text-sm font-medium text-ink/70 hover:border-ink"
              >
                CHECK
              </button>
            ) : (
              <button
                onClick={call}
                className="flex-1 rounded-full border border-terracotta py-3 text-sm font-semibold text-terracotta hover:bg-terracotta hover:text-white"
              >
                IGUALAR ${amountToCall}
              </button>
            )}
            <button
              onClick={fold}
              className="flex-1 rounded-full border border-ink py-3 text-sm font-medium text-ink hover:bg-ink hover:text-white"
            >
              FOLD
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2 text-xs text-ink/50">
              <Kbd>→← Cambiar</Kbd>
              <Kbd>F Fold</Kbd>
              <Kbd>C Check</Kbd>
              <Kbd>↵ Apostar</Kbd>
              <Kbd>L Limites</Kbd>
              <Kbd>Espacio Siguiente</Kbd>
            </div>
            <button
              onClick={nextStreet}
              disabled={!roundComplete}
              title={roundComplete ? undefined : "Todos los jugadores activos deben igualar la apuesta"}
              className="rounded-full border border-cloudy px-5 py-2 text-sm font-medium text-ink/70 hover:border-terracotta hover:text-terracotta disabled:cursor-not-allowed disabled:border-cloudy/40 disabled:text-ink/30 disabled:hover:text-ink/30"
            >
              {NEXT_STREET_LABEL[session.round]} →
            </button>
          </div>
        </div>
      )}

      {limitsModalOpen && (
        <LimitsModal
          initialMin={session.minBet}
          initialMax={session.maxBet}
          onClose={closeLimitsModal}
          onSave={(minBet, maxBet) => setLimits(minBet, maxBet)}
        />
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-cloudy bg-white px-2 py-1 font-mono text-[11px]">
      {children}
    </span>
  );
}

function WinnerSelector({
  players,
  pot,
  winners,
  setWinners,
  onAward,
}: {
  players: Player[];
  pot: number;
  winners: string[];
  setWinners: (ids: string[]) => void;
  onAward: () => void;
}) {
  const toggle = (id: string) =>
    setWinners(winners.includes(id) ? winners.filter((w) => w !== id) : [...winners, id]);

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        Elegi ganador(es) — el bote se puede repartir
      </p>
      <div className="flex flex-wrap gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              winners.includes(p.id) ? "border-terracotta bg-terracotta text-white" : "border-cloudy text-ink/70"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <button
        onClick={onAward}
        disabled={winners.length === 0}
        className="rounded-full bg-terracotta px-6 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Repartir ${pot}
      </button>
    </div>
  );
}
