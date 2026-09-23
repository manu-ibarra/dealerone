"use client";

import { useState } from "react";

const MIN_PRESETS = [5, 10, 25, 50, 100];
const MAX_PRESETS = [100, 200, 500, 1000];

function withCurrent(presets: number[], value: number) {
  return presets.includes(value) ? presets : [value, ...presets].sort((a, b) => a - b);
}

export default function LimitsModal({
  initialMin,
  initialMax,
  onSave,
  onClose,
}: {
  initialMin: number;
  initialMax: number | null;
  onSave: (minBet: number, maxBet: number | null) => void;
  onClose: () => void;
}) {
  const [min, setMin] = useState(initialMin);
  const [noLimit, setNoLimit] = useState(initialMax === null);
  const [max, setMax] = useState(initialMax ?? 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-cloudy/40 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Configurar limites de apuesta</h2>

        <label className="mt-4 block text-sm text-ink">Minimo:</label>
        <select
          value={min}
          onChange={(e) => setMin(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
        >
          {withCurrent(MIN_PRESETS, min).map((v) => (
            <option key={v} value={v}>
              ${v}
            </option>
          ))}
        </select>

        <div className="mt-4 flex items-center justify-between">
          <label className="text-sm text-ink">Maximo:</label>
          <label className="flex items-center gap-1.5 text-xs text-ink/60">
            <input
              type="checkbox"
              checked={noLimit}
              onChange={(e) => setNoLimit(e.target.checked)}
              className="accent-[#C15F3C]"
            />
            Sin limite / &#8734;
          </label>
        </div>
        <select
          value={max}
          disabled={noLimit}
          onChange={(e) => setMax(Number(e.target.value))}
          className={`mt-1 w-full rounded-lg border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta ${
            noLimit ? "opacity-50" : ""
          }`}
        >
          {withCurrent(MAX_PRESETS, max).map((v) => (
            <option key={v} value={v}>
              ${v}
            </option>
          ))}
        </select>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-cloudy px-4 py-2 text-sm font-medium text-ink/70"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(min, noLimit ? null : max)}
            className="rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
