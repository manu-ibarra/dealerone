"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAllSessions, useGameStore } from "@/lib/store";
import type { Session } from "@/lib/types";
import Logo from "@/components/Logo";

const STACK_PRESETS = [500, 1000, 2000];
const ENTRY_PRESETS = [5, 10, 20];

export default function SetupPage() {
  const router = useRouter();
  const createSession = useGameStore((s) => s.createSession);
  const continueSession = useGameStore((s) => s.continueSession);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [gameName, setGameName] = useState("");
  const [initialStack, setInitialStack] = useState(1000);
  const [entryFee, setEntryFee] = useState(10);
  const [players, setPlayers] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only localStorage read
    setSessions(loadAllSessions().sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  const addPlayer = () => {
    const name = nameInput.trim();
    if (!name || players.length >= 10) return;
    setPlayers([...players, name]);
    setNameInput("");
  };

  const removePlayer = (i: number) => setPlayers(players.filter((_, idx) => idx !== i));

  const canStart = gameName.trim().length > 0 && players.length >= 2 && initialStack > 0 && entryFee >= 0;

  const startDealing = () => {
    if (!canStart) return;
    createSession(gameName.trim(), initialStack, entryFee, players);
    router.push("/game");
  };

  return (
    <div className="flex min-h-screen flex-col bg-pampas px-8 py-6">
      <Logo />

      <div className="flex flex-1 flex-col items-center gap-10 py-10 lg:flex-row lg:items-start lg:justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-cloudy/40 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight">Nueva Partida</h1>
          <p className="mt-1 text-sm text-ink/60">
            Configura jugadores y entrada, despues empeza a repartir.
          </p>

          <Section label="Nombre de la partida">
            <input
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Jueves en lo de Manu"
              className="w-full rounded-md border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
            />
          </Section>

          <Section label="Stack Inicial — ¿Con cuánto arranca cada uno?">
            <PillPicker presets={STACK_PRESETS} value={initialStack} onChange={setInitialStack} />
            <p className="mt-1.5 text-xs text-ink/50">Monto de fichas con el que empieza cada jugador</p>
          </Section>

          <Section label="Entrada / Ante — ¿Cuánto cuesta entrar a cada mano?">
            <PillPicker presets={ENTRY_PRESETS} value={entryFee} onChange={setEntryFee} />
            <p className="mt-1.5 text-xs text-ink/50">Se cobra a todos al iniciar cada mano y va directo al pozo</p>
          </Section>

          <Section label={`Jugadores (${players.length}/10)`}>
            <div className="flex gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPlayer())}
                placeholder="Nombre del jugador"
                className="flex-1 rounded-md border border-cloudy bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
              />
              <button
                onClick={addPlayer}
                disabled={players.length >= 10}
                className="rounded-md border border-cloudy px-4 py-2 text-sm font-medium text-ink/70 hover:border-terracotta hover:text-terracotta disabled:opacity-40"
              >
                Agregar
              </button>
            </div>
            {players.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {players.map((name, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-md bg-pampas px-3 py-1.5 text-sm"
                  >
                    <span>
                      {i + 1}. {name}
                    </span>
                    <button
                      onClick={() => removePlayer(i)}
                      className="text-ink/40 hover:text-terracotta"
                      aria-label={`Quitar ${name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <button
            onClick={startDealing}
            disabled={!canStart}
            className="mt-8 w-full rounded-full bg-terracotta py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Start Dealing
          </button>
        </div>

        {sessions.length > 0 && (
          <div className="w-full max-w-lg rounded-2xl border border-cloudy/40 bg-white p-8 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              Partidas anteriores
            </h2>
            <ul className="mt-4 space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-cloudy/40 bg-pampas px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="mt-0.5 text-xs text-ink/50">
                      {new Date(s.createdAt).toLocaleDateString()} · {s.players.length} jugadores · Bote ${s.pot}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        s.status === "active"
                          ? "bg-terracotta/10 text-terracotta"
                          : "bg-cloudy/20 text-ink/50"
                      }`}
                    >
                      {s.status === "active" ? "Activa" : "Finalizada"}
                    </span>
                    {s.status === "active" && (
                      <button
                        onClick={() => {
                          continueSession(s.id);
                          router.push("/game");
                        }}
                        className="rounded-full border border-cloudy px-4 py-1.5 text-xs font-medium text-ink/70 hover:border-terracotta hover:text-terracotta"
                      >
                        Continuar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</div>
      {children}
    </div>
  );
}

function PillPicker({
  presets,
  value,
  onChange,
}: {
  presets: number[];
  value: number;
  onChange: (n: number) => void;
}) {
  const isPreset = presets.includes(value);
  const [customOpen, setCustomOpen] = useState(!isPreset);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((v) => (
        <button
          key={v}
          onClick={() => {
            setCustomOpen(false);
            onChange(v);
          }}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            !customOpen && value === v
              ? "border-terracotta bg-terracotta text-white"
              : "border-cloudy text-ink/70 hover:border-terracotta hover:text-terracotta"
          }`}
        >
          {v}
        </button>
      ))}
      <button
        onClick={() => setCustomOpen(true)}
        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
          customOpen
            ? "border-terracotta bg-terracotta text-white"
            : "border-cloudy text-ink/70 hover:border-terracotta hover:text-terracotta"
        }`}
      >
        Custom
      </button>
      {customOpen && (
        <input
          type="number"
          autoFocus
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 rounded-full border border-terracotta px-4 py-1.5 text-center text-sm font-medium text-terracotta outline-none"
        />
      )}
    </div>
  );
}
