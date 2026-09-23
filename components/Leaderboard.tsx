"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import AmountModal from "./AmountModal";
import TransferModal from "./TransferModal";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  folded: "Folded",
  allin: "All-in",
};

type ModalType = "loan" | "transfer" | "edit" | "repay";

export default function Leaderboard() {
  const { session, loan, transfer, editStack, repayDebt } = useGameStore();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: ModalType; playerId: string } | null>(null);

  if (!session) return null;
  const { players, dealerIndex, currentPlayerIndex } = session;
  const modalPlayer = modal ? players.find((p) => p.id === modal.playerId) : null;

  const closeModal = () => setModal(null);

  return (
    <aside className="flex min-h-full w-full flex-col bg-white">
      <div className="px-4 py-4">
        <span className="text-xs font-semibold tracking-wide text-ink/70 uppercase">
          Leaderboard
        </span>
      </div>
      <div>
        {players.map((p, i) => {
          const isCurrent = i === currentPlayerIndex && p.status === "active";
          return (
            <motion.div
              key={p.id}
              layout
              className={`relative flex items-center justify-between border-l-4 px-4 py-3 ${
                isCurrent ? "border-terracotta bg-terracotta/10" : "border-transparent"
              } ${p.status === "folded" ? "opacity-40" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink/40">{i + 1}</span>
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-ink/50">{STATUS_LABEL[p.status]}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {i === dealerIndex && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-[10px] font-semibold text-white">
                    D
                  </span>
                )}
                <div className="text-right">
                  <div className="w-16 text-sm font-semibold text-terracotta">${p.stack}</div>
                  {p.currentBet > 0 && (
                    <div className="text-[11px] text-ink/50">Apuesta: ${p.currentBet}</div>
                  )}
                  {p.debt > 0 && <div className="text-[11px] text-terracotta">-${p.debt} deuda</div>}
                </div>
                <button
                  onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
                  className="rounded-full px-1.5 py-0.5 text-ink/40 hover:bg-pampas hover:text-ink"
                >
                  ⋯
                </button>
              </div>

              {menuFor === p.id && (
                <div className="absolute right-4 top-12 z-10 w-40 rounded-xl border border-cloudy/40 bg-white py-1 shadow-sm">
                  <MenuItem
                    onClick={() => {
                      setModal({ type: "loan", playerId: p.id });
                      setMenuFor(null);
                    }}
                  >
                    Prestar
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setModal({ type: "transfer", playerId: p.id });
                      setMenuFor(null);
                    }}
                  >
                    Donar
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setModal({ type: "edit", playerId: p.id });
                      setMenuFor(null);
                    }}
                  >
                    Editar Stack
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setModal({ type: "repay", playerId: p.id });
                      setMenuFor(null);
                    }}
                  >
                    Cobrar Deuda
                  </MenuItem>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {modal?.type === "transfer" && modalPlayer && players.length > 1 && (
        <TransferModal
          players={players}
          defaultFromId={modalPlayer.id}
          onClose={closeModal}
          onConfirm={(fromId, toId, amount) => {
            transfer(fromId, toId, amount);
            closeModal();
          }}
        />
      )}

      {modal && modal.type !== "transfer" && modalPlayer && (
        <AmountModal
          title={
            {
              loan: `Prestar a ${modalPlayer.name} (De: Banca)`,
              edit: `Editar stack de ${modalPlayer.name}`,
              repay: `Cobrar deuda a ${modalPlayer.name}`,
            }[modal.type]
          }
          initialValue={modal.type === "edit" ? modalPlayer.stack : modal.type === "repay" ? modalPlayer.debt : 100}
          onClose={closeModal}
          onConfirm={(amount) => {
            if (modal.type === "loan") loan(modalPlayer.id, amount);
            if (modal.type === "edit") editStack(modalPlayer.id, amount);
            if (modal.type === "repay") repayDebt(modalPlayer.id, amount);
            closeModal();
          }}
        />
      )}
    </aside>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="block w-full px-4 py-2 text-left text-sm text-ink/80 hover:bg-pampas"
    >
      {children}
    </button>
  );
}
