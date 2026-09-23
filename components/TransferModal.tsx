"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";

export default function TransferModal({
  players,
  defaultFromId,
  onConfirm,
  onClose,
}: {
  players: Player[];
  defaultFromId: string;
  onConfirm: (fromId: string, toId: string, amount: number) => void;
  onClose: () => void;
}) {
  const [fromId, setFromId] = useState(defaultFromId);
  const toCandidates = players.filter((p) => p.id !== fromId);
  const [toId, setToId] = useState(toCandidates[0]?.id ?? "");
  const [amount, setAmount] = useState(100);

  const donor = players.find((p) => p.id === fromId);
  const valid = donor && toId && toId !== fromId && amount > 0 && amount <= donor.stack;

  const handleFromChange = (id: string) => {
    setFromId(id);
    if (toId === id) {
      setToId(players.find((p) => p.id !== id)?.id ?? "");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-cloudy/40 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Donar fichas</h2>

        <label className="mt-4 block text-xs font-medium text-ink/50">De:</label>
        <select
          value={fromId}
          onChange={(e) => handleFromChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ${p.stack}
            </option>
          ))}
        </select>

        <div className="my-3 text-center text-xs text-ink/40">a:</div>

        <select
          value={toId}
          onChange={(e) => setToId(e.target.value)}
          className="w-full rounded-md border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
        >
          {toCandidates.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ${p.stack}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-medium text-ink/50">Cantidad:</label>
        <input
          type="number"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
        />
        {donor && amount > donor.stack && (
          <p className="mt-1.5 text-xs text-terracotta">{donor.name} no tiene ${amount} para donar.</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-cloudy px-4 py-2 text-sm font-medium text-ink/70"
          >
            Cancelar
          </button>
          <button
            onClick={() => valid && onConfirm(fromId, toId, amount)}
            disabled={!valid}
            className="rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
