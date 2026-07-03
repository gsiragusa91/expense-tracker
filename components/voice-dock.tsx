"use client";

import { useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import type { ExpenseDraft, HouseholdMember } from "@/lib/domain/types";
import { ExpenseConfirmationSheet } from "./expense-confirmation-sheet";

type Props = {
  open: boolean;
  member: HouseholdMember;
  onClose: () => void;
};

export function VoiceDock({ open, member, onClose }: Props) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "parsing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ExpenseDraft[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);

  if (!open) return confirmOpen ? (
    <ExpenseConfirmationSheet
      key={drafts.map((draft) => draft.id ?? `${draft.description}-${draft.amountArs}`).join("|")}
      open={confirmOpen}
      drafts={drafts}
      title="Revisar gasto por voz"
      onClose={() => setConfirmOpen(false)}
      onConfirmed={() => {
        setConfirmOpen(false);
        setDrafts([]);
      }}
    />
  ) : null;

  async function sendAudio(blob: Blob) {
    setState("parsing");
    setError(null);
    const formData = new FormData();
    formData.append("audio", blob, "expense-voice.webm");
    const response = await fetch("/api/voice/parse", { method: "POST", body: formData });
    const body = (await response.json()) as { transcript?: string; expenses?: ExpenseDraft[]; error?: string; warnings?: string[] };
    if (!response.ok || !body.expenses?.length) {
      setState("idle");
      setError(body.error ?? "No pude detectar gastos en el audio.");
      return;
    }
    setTranscript(body.transcript ?? null);
    setDrafts(body.expenses);
    setState("idle");
    onClose();
    setConfirmOpen(true);
  }

  async function startRecording() {
    try {
      setError(null);
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        void sendAudio(blob);
      };
      recorder.start();
      setState("recording");
      timeoutRef.current = setTimeout(() => stopRecording(), 30000);
    } catch {
      setError("No pude acceder al microfono. Revisá permisos del navegador.");
    }
  }

  function stopRecording() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#213547]/30 px-3 pb-3 backdrop-blur-sm">
        <section className="w-full max-w-[430px] rounded-t-[28px] border border-[var(--border)] bg-white px-5 py-5 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary-strong)]">
                {member.displayName}
              </p>
              <h2 className="text-2xl font-bold text-[var(--ink)]">Cargar por voz</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full bg-[var(--surface-soft)]"
              aria-label="Cerrar voz"
            >
              <X size={20} />
            </button>
          </div>

          <div className="rounded-[24px] bg-[var(--surface-soft)] p-5 text-center">
            <button
              type="button"
              onClick={state === "recording" ? stopRecording : startRecording}
              disabled={state === "parsing"}
              className={`mx-auto grid size-24 place-items-center rounded-full text-white shadow-lg transition ${
                state === "recording" ? "bg-[var(--danger)]" : "mic-glow bg-[var(--primary-strong)]"
              }`}
              aria-label={state === "recording" ? "Detener grabacion" : "Iniciar grabacion"}
            >
              {state === "recording" ? <Square size={34} /> : <Mic size={38} />}
            </button>
            <p className="mt-4 text-sm font-semibold text-[var(--ink)]">
              {state === "recording"
                ? "Grabando, maximo 30 segundos"
                : state === "parsing"
                  ? "Transcribiendo y separando gastos..."
                  : "Tocá el micrófono y contá uno o varios gastos"}
            </p>
            {transcript ? <p className="mt-3 text-xs text-[var(--muted)]">Ultimo texto: {transcript}</p> : null}
            {error ? <p className="mt-3 rounded-2xl bg-[var(--danger)]/20 p-3 text-sm text-[var(--ink)]">{error}</p> : null}
          </div>
        </section>
      </div>
      <ExpenseConfirmationSheet
        key={drafts.map((draft) => draft.id ?? `${draft.description}-${draft.amountArs}`).join("|")}
        open={confirmOpen}
        drafts={drafts}
        title="Revisar gasto por voz"
        onClose={() => setConfirmOpen(false)}
        onConfirmed={() => {
          setConfirmOpen(false);
          setDrafts([]);
        }}
      />
    </>
  );
}
