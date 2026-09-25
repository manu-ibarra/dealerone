"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import AmountModal from "./AmountModal";
import TransferModal from "./TransferModal";
import LoanModal from "./LoanModal";
import AddPlayerModal from "./AddPlayerModal";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  folded: "Folded",
  allin: "All-in",
};

type ModalType = "loan" | "transfer" | "edit" | "repay";

export default function Leaderboard() {
  const { session, loan, transfer, editStack, repayDebt, addPlayer, renamePlayer } = useGameStore();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: ModalType; playerId: string } | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!session) return null;
  const { players, dealerIndex, currentPlayerIndex, buyIn } = session;
  const isBlackjack = session.gameType === "blackjack";
  const maxDebt = buyIn * 2;
  const modalPlayer = modal ? players.find((p) => p.id === modal.playerId) : null;

  const closeModal = () => setModal(null);

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) renamePlayer(editingId, editValue.trim());
    setEditingId(null);
  };

  return (
    <aside className="flex min-h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-xs font-semibold tracking-wide text-ink/70 uppercase">
          Leaderboard
        </span>
        <button
          onClick={() => setAddPlayerOpen(true)}
          disabled={players.length >= 10}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-cloudy text-sm text-ink/70 hover:border-terracotta hover:text-terracotta disabled:opacity-40"
          aria-label="Agregar jugador"
        >
          +
        </button>
      </div>
      <div>
        {players.map((p, i) => {
          const isCurrent = i === currentPlayerIndex && p.status === "active";
          const overMaxDebt = p.debt > buyIn;
          const loanBlocked = p.debt >= maxDebt || (!!session.handId && p.loanLastHandId === session.handId);
          return (
            <motion.div
              key={p.id}
              layout
              className={`group relative flex items-center justify-between border-l-4 px-4 py-3 ${
                isCurrent ? "border-terracotta bg-terracotta/10" : "border-transparent"
              } ${p.status === "folded" ? "opacity-40" : ""} ${overMaxDebt ? "bg-[#FDE8E8]" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink/40">{i + 1}</span>
                <div>
                  {editingId === p.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                      className="w-28 rounded border border-terracotta bg-white px-1.5 py-0.5 text-sm outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{p.name}</span>
                      <button
                        onClick={() => startEditing(p.id, p.name)}
                        className="text-cloudy opacity-0 hover:text-terracotta group-hover:opacity-100"
                        aria-label={`Editar ${p.name}`}
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-ink/50">{STATUS_LABEL[p.status]}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {i === dealerIndex && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-semibold text-white">
                    {isBlackjack ? "BANCA" : "D"}
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
                <div className="absolute right-4 top-12 z-10 w-44 rounded-xl border border-cloudy/40 bg-white py-1 shadow-sm">
                  <MenuItem
                    disabled={loanBlocked}
                    title={
                      p.debt >= maxDebt
                        ? "Deuda maxima alcanzada"
                        : p.loanLastHandId === session.handId
                          ? "Ya pediste en esta mano"
                          : undefined
                    }
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

      {addPlayerOpen && (
        <AddPlayerModal
          buyIn={buyIn}
          onClose={() => setAddPlayerOpen(false)}
          onConfirm={(name) => {
            addPlayer(name);
            setAddPlayerOpen(false);
          }}
        />
      )}

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

      {modal?.type === "loan" && modalPlayer && (
        <LoanModal
          playerName={modalPlayer.name}
          hasInterest={modalPlayer.debt > 0}
          onClose={closeModal}
          onConfirm={(amount) => {
            loan(modalPlayer.id, amount);
            closeModal();
          }}
        />
      )}

      {modal && (modal.type === "edit" || modal.type === "repay") && modalPlayer && (
        <AmountModal
          title={
            modal.type === "edit"
              ? `Editar stack de ${modalPlayer.name}`
              : `Cobrar deuda a ${modalPlayer.name}`
          }
          initialValue={modal.type === "edit" ? modalPlayer.stack : modalPlayer.debt}
          onClose={closeModal}
          onConfirm={(amount) => {
            if (modal.type === "edit") editStack(modalPlayer.id, amount);
            if (modal.type === "repay") repayDebt(modalPlayer.id, amount);
            closeModal();
          }}
        />
      )}
    </aside>
  );
}

function MenuItem({
  onClick,
  children,
  disabled,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`block w-full px-4 py-2 text-left text-sm ${
        disabled ? "cursor-not-allowed text-ink/30" : "text-ink/80 hover:bg-pampas"
      }`}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
