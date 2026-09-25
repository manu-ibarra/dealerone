"use client";

import { useState } from "react";

export default function AddPlayerModal({
  buyIn,
  onConfirm,
  onClose,
}: {
  buyIn: number;
  onConfirm: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-cloudy/40 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Agregar jugador</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onConfirm(name.trim())}
          placeholder="Nombre del jugador"
          className="mt-4 w-full rounded-md border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
        />
        <p className="mt-2 text-xs text-ink/50">Arranca con ${buyIn} en la proxima mano</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-cloudy px-4 py-2 text-sm font-medium text-ink/70"
          >
            Cancelar
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
