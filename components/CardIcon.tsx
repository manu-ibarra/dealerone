import type { CardSpec } from "@/lib/handRankings";

const SUIT_SYMBOL: Record<CardSpec["suit"], string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const RED_SUITS = new Set(["h", "d"]);

export default function CardIcon({ card }: { card: CardSpec }) {
  const isRed = RED_SUITS.has(card.suit);
  return (
    <div
      style={{ width: 24, height: 32, opacity: card.isKicker ? 0.3 : 1 }}
      className={`flex flex-col items-center justify-center rounded border border-cloudy bg-white text-[10px] font-semibold leading-none shrink-0 ${
        isRed ? "text-terracotta" : "text-ink"
      }`}
    >
      <span>{card.rank}</span>
      <span className="text-xs leading-none">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}
