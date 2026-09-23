export type Suit = "s" | "h" | "d" | "c";
export interface CardSpec {
  rank: string;
  suit: Suit;
  isKicker?: boolean;
}

export interface HandRanking {
  name: string;
  cards: CardSpec[];
}

function r(rank: string, suit: Suit, isKicker = false): CardSpec {
  return { rank, suit, isKicker };
}

function cards(ranks: string, suit: Suit): CardSpec[] {
  return ranks.split(" ").map((rank) => r(rank, suit));
}

export const HAND_RANKINGS: HandRanking[] = [
  { name: "Escalera Real", cards: cards("A K Q J 10", "s") },
  { name: "Escalera de Color", cards: cards("9 8 7 6 5", "h") },
  {
    name: "Poker",
    cards: [r("K", "s"), r("K", "h"), r("K", "d"), r("K", "c"), r("3", "s", true)],
  },
  {
    name: "Full House",
    cards: [r("J", "s"), r("J", "h"), r("J", "d"), r("4", "c"), r("4", "s")],
  },
  { name: "Color", cards: cards("A J 8 6 2", "c") },
  {
    name: "Escalera",
    cards: [r("10", "s"), r("9", "h"), r("8", "d"), r("7", "c"), r("6", "s")],
  },
  {
    name: "Trio",
    cards: [r("7", "s"), r("7", "h"), r("7", "d"), r("K", "c", true), r("2", "s", true)],
  },
  {
    name: "Doble Par",
    cards: [r("Q", "s"), r("Q", "h"), r("4", "d"), r("4", "c"), r("9", "s", true)],
  },
  {
    name: "Par",
    cards: [r("10", "s"), r("10", "h"), r("K", "d", true), r("Q", "c", true), r("3", "s", true)],
  },
  {
    name: "Carta Alta",
    cards: [r("A", "s"), r("K", "h", true), r("8", "d", true), r("6", "c", true), r("2", "s", true)],
  },
];
