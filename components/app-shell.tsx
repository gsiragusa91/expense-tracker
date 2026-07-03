"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { LogOut, Monitor, Settings } from "lucide-react";
import { signOutAction } from "@/app/actions";
import type { HouseholdMember } from "@/lib/domain/types";
import { TabBar } from "./tab-bar";
import { VoiceDock } from "./voice-dock";

export function AppShell({ member, children }: { member: HouseholdMember; children: ReactNode }) {
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <div className="mobile-shell min-h-dvh bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/88 px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary-strong)]">
              Hogar compartido
            </p>
            <h1 className="text-xl font-extrabold text-[var(--ink)]">Gastos del mes</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/monitor"
              className="grid size-10 place-items-center rounded-full bg-white text-[var(--ink)] shadow-sm"
              aria-label="Abrir monitor"
            >
              <Monitor size={19} />
            </Link>
            <Link
              href="/review"
              className="grid size-10 place-items-center rounded-full bg-white text-[var(--ink)] shadow-sm"
              aria-label="Ajustes"
            >
              <Settings size={19} />
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="grid size-10 place-items-center rounded-full bg-white text-[var(--ink)] shadow-sm"
                aria-label="Salir"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm">
          <span className="font-semibold text-[var(--ink)]">{member.displayName}</span>
          <span className="text-[var(--muted)]">{member.profileKey === "guido" ? "Perfil Guido" : "Perfil Dalu"}</span>
        </div>
      </header>

      <main className="px-4 pb-32 pt-4">{children}</main>
      <TabBar onMicClick={() => setVoiceOpen(true)} />
      <VoiceDock open={voiceOpen} member={member} onClose={() => setVoiceOpen(false)} />
    </div>
  );
}
