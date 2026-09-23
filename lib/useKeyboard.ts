"use client";

import { useEffect } from "react";
import { BET_STEP, useGameStore } from "./store";

export function useGameKeyboard() {
  const { nextPlayer, prevPlayer, nextUnactedPlayer, adjustBet, placeBet, fold, check, allIn, betAmount } =
    useGameStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          nextPlayer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prevPlayer();
          break;
        case "ArrowUp":
          e.preventDefault();
          adjustBet(BET_STEP * (e.shiftKey ? 5 : 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          adjustBet(-BET_STEP * (e.shiftKey ? 5 : 1));
          break;
        case "Enter":
          e.preventDefault();
          placeBet(betAmount);
          break;
        case "f":
        case "F":
          fold();
          break;
        case "c":
        case "C":
          check();
          break;
        case "a":
        case "A":
          allIn();
          break;
        case " ":
          e.preventDefault();
          nextUnactedPlayer();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextPlayer, prevPlayer, nextUnactedPlayer, adjustBet, placeBet, fold, check, allIn, betAmount]);
}
