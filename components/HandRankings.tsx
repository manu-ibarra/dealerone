"use client";

import { HAND_RANKINGS } from "@/lib/handRankings";
import CardIcon from "./CardIcon";

export default function HandRankings({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-t border-cloudy/40 bg-white">
      <button
        onClick={onToggle}
        className="flex h-12 w-full shrink-0 items-center justify-between px-6"
      >
        <span className="text-xs font-semibold tracking-wide text-ink/70 uppercase">
          Guia de manos
        </span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cloudy text-xs text-ink/70">
          {expanded ? "v" : "^"}
        </span>
      </button>

      {expanded && (
        <div className="scrollbar-thin-cloudy grid flex-1 grid-cols-2 gap-2 overflow-y-auto px-6 pb-4 sm:grid-cols-5">
          {HAND_RANKINGS.map((hand, i) => (
            <div
              key={hand.name}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-cloudy/40 bg-pampas px-2 py-2"
            >
              <div className="flex gap-1">
                {hand.cards.map((card, j) => (
                  <CardIcon key={j} card={card} />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terracotta text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-ink">{hand.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
