"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/store";

const BET_PRESETS = [5, 10, 25, 50, 100];

export default function BlackjackPanel() {
  const { session, startHand, placeBlackjackBet, doubleDown, hit, stand, resolveBlackjack } = useGameStore();
  const [bets, setBets] = useState<Record<string, number>>({});

  if (!session) return null;
  const banker = session.players[session.dealerIndex];
  const players = session.players.filter((p) => p.id !== banker?.id);

  const betFor = (id: string) => bets[id] ?? BET_PRESETS[0];
  const setBetFor = (id: string, value: number) => setBets((b) => ({ ...b, [id]: value }));

  return (
    <div className="flex h-full flex-col bg-pampas px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">Banca</div>
          <div className="text-3xl font-extrabold tracking-tight">{banker?.name.toUpperCase()}</div>
          <div className="mt-1 text-sm text-ink/60">Stack: ${banker?.stack}</div>
        </div>
        <button
          onClick={startHand}
          className="rounded-full bg-terracotta px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Nueva Ronda
        </button>
      </div>

      <div className="scrollbar-thin-cloudy mt-6 flex-1 space-y-3 overflow-y-auto">
        {players.map((p) => (
          <div key={p.id} className="rounded-xl border border-cloudy/40 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-ink/50">
                  Stack: ${p.stack}
                  {p.currentBet > 0 && <span className="text-ink"> · Apuesta: ${p.currentBet}</span>}
                  {p.debt > 0 && <span className="text-terracotta"> · -${p.debt} deuda</span>}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => hit(p.id)}
                  disabled={p.currentBet <= 0}
                  className="rounded-full border border-cloudy px-3 py-1 text-xs font-medium text-ink/70 hover:border-terracotta hover:text-terracotta disabled:opacity-30"
                >
                  Hit
                </button>
                <button
                  onClick={() => stand(p.id)}
                  disabled={p.currentBet <= 0}
                  className="rounded-full border border-cloudy px-3 py-1 text-xs font-medium text-ink/70 hover:border-terracotta hover:text-terracotta disabled:opacity-30"
                >
                  Stand
                </button>
                <button
                  onClick={() => doubleDown(p.id)}
                  disabled={p.currentBet <= 0 || p.stack < p.currentBet}
                  className="rounded-full border border-cloudy px-3 py-1 text-xs font-medium text-ink/70 hover:border-terracotta hover:text-terracotta disabled:opacity-30"
                >
                  Double
                </button>
              </div>
            </div>

            {p.currentBet <= 0 ? (
              <div className="mt-3 flex items-center gap-2">
                {BET_PRESETS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setBetFor(p.id, v)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      betFor(p.id) === v
                        ? "border-terracotta bg-terracotta text-white"
                        : "border-cloudy text-ink/70 hover:border-terracotta hover:text-terracotta"
                    }`}
                  >
                    {v}
                  </button>
                ))}
                <input
                  type="number"
                  value={betFor(p.id)}
                  onChange={(e) => setBetFor(p.id, Number(e.target.value))}
                  className="w-20 rounded-md border border-cloudy bg-white px-2 py-1 text-xs"
                />
                <button
                  onClick={() => placeBlackjackBet(p.id, betFor(p.id))}
                  disabled={betFor(p.id) <= 0 || betFor(p.id) > p.stack}
                  className="rounded-full bg-terracotta px-4 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  Apostar
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-1.5">
                <button
                  onClick={() => resolveBlackjack(p.id, "win")}
                  className="rounded-full border border-terracotta px-3 py-1.5 text-xs font-semibold text-terracotta hover:bg-terracotta hover:text-white"
                >
                  Gano
                </button>
                <button
                  onClick={() => resolveBlackjack(p.id, "blackjack")}
                  className="rounded-full border border-terracotta px-3 py-1.5 text-xs font-semibold text-terracotta hover:bg-terracotta hover:text-white"
                >
                  Blackjack 3:2
                </button>
                <button
                  onClick={() => resolveBlackjack(p.id, "push")}
                  className="rounded-full border border-cloudy px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-ink"
                >
                  Empata
                </button>
                <button
                  onClick={() => resolveBlackjack(p.id, "lose")}
                  className="rounded-full border border-ink px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink hover:text-white"
                >
                  Pierde
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
