"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAllSessions, useGameStore } from "@/lib/store";
import type { GameType, ObligMode, Session } from "@/lib/types";
import Logo from "@/components/Logo";

const STACK_PRESETS = [500, 1000, 2000];
const ENTRY_PRESETS = [5, 10, 20];
const SB_PRESETS = [5, 10, 25];

export default function SetupPage() {
  const router = useRouter();
  const createSession = useGameStore((s) => s.createSession);
  const continueSession = useGameStore((s) => s.continueSession);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [gameName, setGameName] = useState("");
  const [gameType, setGameType] = useState<GameType>("texas_holdem");
  const [initialStack, setInitialStack] = useState(1000);
  const [obligMode, setObligMode] = useState<ObligMode>("ante");
  const [entryFee, setEntryFee] = useState(10);
  const [smallBlind, setSmallBlind] = useState(10);
  const [bigBlindTouched, setBigBlindTouched] = useState(false);
  const [bigBlind, setBigBlind] = useState(20);
  const [players, setPlayers] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only localStorage read
    setSessions(loadAllSessions().sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  const handleSmallBlindChange = (v: number) => {
    setSmallBlind(v);
    if (!bigBlindTouched) setBigBlind(v * 2);
  };

  const addPlayer = () => {
    const name = nameInput.trim();
    if (!name || players.length >= 10) return;
    setPlayers([...players, name]);
    setNameInput("");
  };

  const removePlayer = (i: number) => setPlayers(players.filter((_, idx) => idx !== i));

  const canStart = gameName.trim().length > 0 && players.length >= 2 && initialStack > 0;

  const startDealing = () => {
    if (!canStart) return;
    createSession({
      name: gameName.trim(),
      buyIn: initialStack,
      gameType,
      obligMode,
      entryFee: obligMode === "ante" ? entryFee : 0,
      smallBlind: obligMode === "blinds" ? smallBlind : 0,
      bigBlind: obligMode === "blinds" ? bigBlind : 0,
      playerNames: players,
    });
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

          <Section label="Modo de juego">
            <div className="grid grid-cols-2 gap-2">
              <RadioCard
                label="Texas Hold'em"
                active={gameType === "texas_holdem"}
                onClick={() => setGameType("texas_holdem")}
              />
              <RadioCard
                label="Blackjack"
                active={gameType === "blackjack"}
                onClick={() => setGameType("blackjack")}
              />
            </div>
            {gameType === "blackjack" && (
              <p className="mt-1.5 text-xs text-ink/50">
                La banca rota entre los jugadores de la mesa, no hay dealer automatico.
              </p>
            )}
          </Section>

          <Section label="Stack Inicial — ¿Con cuánto arranca cada uno?">
            <PillPicker presets={STACK_PRESETS} value={initialStack} onChange={setInitialStack} />
            <p className="mt-1.5 text-xs text-ink/50">Monto de fichas con el que empieza cada jugador</p>
          </Section>

          {gameType === "texas_holdem" && (
            <Section label="Tipo de obligatoria">
              <div className="grid grid-cols-2 gap-2">
                <RadioCard label="Ante" active={obligMode === "ante"} onClick={() => setObligMode("ante")} />
                <RadioCard label="Blinds" active={obligMode === "blinds"} onClick={() => setObligMode("blinds")} />
              </div>

              {obligMode === "ante" ? (
                <div className="mt-3">
                  <PillPicker presets={ENTRY_PRESETS} value={entryFee} onChange={setEntryFee} />
                  <p className="mt-1.5 text-xs text-ink/50">Se cobra a todos al iniciar cada mano y va directo al pozo</p>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-ink/50">Small Blind</label>
                    <PillPicker presets={SB_PRESETS} value={smallBlind} onChange={handleSmallBlindChange} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-ink/50">Big Blind</label>
                    <PillPicker
                      presets={[smallBlind * 2]}
                      value={bigBlind}
                      onChange={(v) => {
                        setBigBlindTouched(true);
                        setBigBlind(v);
                      }}
                    />
                  </div>
                </div>
              )}
            </Section>
          )}

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

function RadioCard({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-terracotta bg-terracotta/10 text-terracotta"
          : "border-cloudy text-ink/70 hover:border-terracotta hover:text-terracotta"
      }`}
    >
      {label}
    </button>
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
