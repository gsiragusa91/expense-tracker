"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileUp, Home, ListChecks, Mic, PlusCircle } from "lucide-react";

const tabs = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/manual", label: "Cargar", icon: PlusCircle },
  { href: "/import", label: "Importar", icon: FileUp },
  { href: "/review", label: "Revisar", icon: ListChecks }
];

export function TabBar({ onMicClick }: { onMicClick: () => void }) {
  const pathname = usePathname();
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto flex w-[min(398px,calc(100%-24px))] items-center justify-between rounded-full border border-[var(--border)] bg-white/88 px-3 py-2 shadow-[0_18px_45px_rgba(69,122,168,0.2)] backdrop-blur-xl">
      {[left, right].map((group, groupIndex) => (
        <div key={groupIndex} className="flex flex-1 items-center justify-evenly">
          {groupIndex === 1 ? null : undefined}
          {group.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-[11px] font-semibold transition ${
                  active ? "text-[var(--primary-strong)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.8 : 2.2} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
          {groupIndex === 0 ? (
            <button
              type="button"
              onClick={onMicClick}
              className="mic-glow mx-1 grid size-[58px] place-items-center rounded-full bg-[var(--primary-strong)] text-white shadow-lg transition hover:-translate-y-0.5"
              aria-label="Cargar gasto por voz"
            >
              <Mic size={28} strokeWidth={2.6} />
            </button>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
