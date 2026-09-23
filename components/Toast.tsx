"use client";

import { useEffect } from "react";
import { useGameStore } from "@/lib/store";

export default function Toast() {
  const { toast, clearToast } = useGameStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 3000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center">
      <div className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-sm">
        {toast}
      </div>
    </div>
  );
}
