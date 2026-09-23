"use client";

import { useState } from "react";

export default function AmountModal({
  title,
  initialValue = 0,
  confirmLabel = "Confirmar",
  onConfirm,
  onClose,
}: {
  title: string;
  initialValue?: number;
  confirmLabel?: string;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-cloudy/40 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold">{title}</h2>
        <input
          type="number"
          autoFocus
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="mt-4 w-full rounded-md border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-cloudy px-4 py-2 text-sm font-medium text-ink/70"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(value)}
            className="rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
