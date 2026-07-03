import { categorizeMerchant } from "@/lib/domain/categorize";
import { todayISO } from "@/lib/domain/dates";
import { amountToArs } from "@/lib/domain/money";
import { normalizeMerchant } from "@/lib/domain/merchants";
import type { Currency, ExpenseDraft } from "@/lib/domain/types";
import { VOICE_ERRORS, VoiceError, type VoiceErrorCode } from "@/lib/voice/errors";
import { VOICE_EXPENSE_JSON_SCHEMA } from "@/lib/voice/schema";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_EXTRACTION_MODEL = "gpt-4o-mini";

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new VoiceError("openai_auth", "Missing OPENAI_API_KEY");
  return apiKey;
}

async function readOpenAIError(response: Response) {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

function openAIStatusToCode(status: number, fallback: VoiceErrorCode): VoiceErrorCode {
  if (status === 401 || status === 403) return "openai_auth";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "openai_unavailable";
  return fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function transcribeVoiceAudio(file: File) {
  const formData = new FormData();
  formData.append("file", file, file.name || "expense-voice.webm");
  formData.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL ?? DEFAULT_TRANSCRIPTION_MODEL);
  formData.append("response_format", "json");
  formData.append("language", "es");

  let response: Response;
  try {
    response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getOpenAIKey()}` },
      body: formData
    });
  } catch (cause) {
    throw new VoiceError("network", String(cause));
  }

  if (!response.ok) {
    throw new VoiceError(
      openAIStatusToCode(response.status, "unknown"),
      await readOpenAIError(response)
    );
  }

  const body = (await response.json()) as { text?: unknown };
  const transcript = optionalString(body.text);
  if (!transcript) throw new VoiceError("transcription_empty");
  return transcript;
}

export async function extractExpensesFromTranscript({
  transcript,
  profileKey,
  fxRate
}: {
  transcript: string;
  profileKey: "guido" | "dalu";
  fxRate: number | null;
}): Promise<{ transcript: string; expenses: ExpenseDraft[]; warnings: string[] }> {
  let response: Response;
  try {
    response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenAIKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EXPENSE_EXTRACTION_MODEL ?? DEFAULT_EXTRACTION_MODEL,
        temperature: 0,
        store: false,
        messages: [
          {
            role: "system",
            content:
              "Sos un parser de gastos domésticos en Argentina. Convertís una transcripción corta en uno o más gastos para confirmar. " +
              "No guardes nada: solo devolvé datos estructurados. Si el usuario dice varios gastos, separalos. " +
              "Si no menciona fecha, usá null. Si no menciona persona, usá null. No inventes gastos. " +
              "Moneda default ARS si el usuario no dice dólares."
          },
          {
            role: "user",
            content: JSON.stringify({
              transcript,
              today: todayISO(),
              defaultProfileKey: profileKey,
              locale: "es-AR"
            })
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "expense_voice_parse",
            strict: true,
            schema: VOICE_EXPENSE_JSON_SCHEMA
          }
        }
      })
    });
  } catch (cause) {
    throw new VoiceError("network", String(cause));
  }

  if (!response.ok) {
    throw new VoiceError(
      openAIStatusToCode(response.status, "extraction_invalid"),
      await readOpenAIError(response)
    );
  }

  const body = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = body.choices?.[0]?.message?.content;
  let parsed: { expenses?: unknown[]; warnings?: unknown[] };
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : (content as typeof parsed);
  } catch {
    throw new VoiceError("extraction_invalid");
  }

  const expenses = (Array.isArray(parsed.expenses) ? parsed.expenses : []).map((raw, index) => {
    const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const description = optionalString(record.description) ?? "Gasto por voz";
    const merchantName = optionalString(record.merchantName) ?? description;
    const currency: Currency = record.currency === "USD" ? "USD" : "ARS";
    const amountOriginal =
      typeof record.amountOriginal === "number" && Number.isFinite(record.amountOriginal)
        ? record.amountOriginal
        : 0;
    const category = categorizeMerchant(`${merchantName} ${optionalString(record.categoryHint) ?? ""}`);
    const ownerProfileId =
      record.ownerProfileKey === "guido" || record.ownerProfileKey === "dalu"
        ? record.ownerProfileKey
        : profileKey;
    const amountArs = amountToArs(amountOriginal, currency, currency === "USD" ? fxRate : null);

    return {
      id: `voice-${Date.now()}-${index}`,
      expenseDate: optionalString(record.expenseDate) ?? todayISO(),
      description,
      merchantName,
      merchantNormalized: normalizeMerchant(merchantName),
      amountOriginal,
      currency,
      fxRate: currency === "USD" ? fxRate : null,
      amountArs,
      categoryId: category.categoryId,
      sourceType: "voice" as const,
      ownerProfileId,
      notes: optionalString(record.notes) ?? undefined,
      confidence:
        typeof record.confidence === "number" && Number.isFinite(record.confidence)
          ? Math.max(0, Math.min(1, record.confidence))
          : category.confidence,
      reviewStatus: "pending" as const
    };
  });

  return {
    transcript,
    expenses,
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((item): item is string => typeof item === "string")
      : []
  };
}

export function voiceErrorPayload(code: VoiceErrorCode) {
  return { errorCode: code, error: VOICE_ERRORS[code].message, expenses: [], warnings: [] };
}
