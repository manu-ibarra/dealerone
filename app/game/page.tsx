"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store";
import { useGameKeyboard } from "@/lib/useKeyboard";
import ActionPanel from "@/components/ActionPanel";
import BlackjackPanel from "@/components/BlackjackPanel";
import HandRankings from "@/components/HandRankings";
import Leaderboard from "@/components/Leaderboard";
import Toast from "@/components/Toast";

export default function GamePage() {
  const session = useGameStore((s) => s.session);
  const hydrateCurrentSession = useGameStore((s) => s.hydrateCurrentSession);
  const saveAndExit = useGameStore((s) => s.saveAndExit);
  const finalizeSession = useGameStore((s) => s.finalizeSession);
  const router = useRouter();
  const [rankingsExpanded, setRankingsExpanded] = useState(true);
  useGameKeyboard();

  useEffect(() => {
    if (!session) hydrateCurrentSession();
  }, [session, hydrateCurrentSession]);

  useEffect(() => {
    if (!useGameStore.getState().session) router.replace("/");
  }, [session, router]);

  if (!session) return null;
  const isBlackjack = session.gameType === "blackjack";

  return (
    <div className="flex h-screen w-full flex-col">
      <Toast />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex h-full w-3/4 flex-col">
          <div className="flex shrink-0 justify-end gap-2 px-4 py-2">
            <button
              onClick={() => {
                saveAndExit();
                router.push("/");
              }}
              className="rounded-full border border-cloudy px-4 py-1.5 text-xs font-medium text-ink/70 hover:border-terracotta hover:text-terracotta"
            >
              Guardar y Salir
            </button>
            <button
              onClick={() => {
                finalizeSession();
                router.push("/");
              }}
              className="rounded-full border border-ink px-4 py-1.5 text-xs font-medium text-ink hover:bg-ink hover:text-white"
            >
              Finalizar Partida
            </button>
          </div>
          <div className="h-full flex-1 overflow-hidden">
            {isBlackjack ? <BlackjackPanel /> : <ActionPanel />}
          </div>
        </div>
        <div className="scrollbar-thin-cloudy h-full w-1/4 overflow-y-auto border-l border-cloudy/40">
          <Leaderboard />
        </div>
      </div>

      {!isBlackjack && (
        <div
          className={`w-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            rankingsExpanded ? "h-[280px]" : "h-12"
          }`}
        >
          <HandRankings expanded={rankingsExpanded} onToggle={() => setRankingsExpanded((v) => !v)} />
        </div>
      )}
    </div>
  );
}
