"use client";

import { useState } from "react";

export default function LoanModal({
  playerName,
  hasInterest,
  onConfirm,
  onClose,
}: {
  playerName: string;
  hasInterest: boolean;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(100);
  const added = hasInterest ? Math.round(amount * 1.1) : amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-cloudy/40 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Prestar a {playerName} (De: Banca)</h2>
        <input
          type="number"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-4 w-full rounded-md border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
        />
        {hasInterest && amount > 0 && (
          <p className="mt-2 text-xs text-terracotta">
            Pedis ${amount}, se suma ${added} de deuda por interes (10%)
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-cloudy px-4 py-2 text-sm font-medium text-ink/70"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(amount)}
            className="rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
