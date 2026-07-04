import { CATEGORY_SEEDS } from "@/lib/domain/categories";
import { categorizeMerchant } from "@/lib/domain/categorize";
import { todayISO } from "@/lib/domain/dates";
import { amountToArs } from "@/lib/domain/money";
import { normalizeMerchant } from "@/lib/domain/merchants";
import type { Currency, ExpenseDraft } from "@/lib/domain/types";
import { VOICE_ERRORS, VoiceError, type VoiceErrorCode } from "@/lib/voice/errors";
import { VOICE_EXPENSE_JSON_SCHEMA } from "@/lib/voice/schema";

// Lista "id — nombre" que le mostramos a GPT para que elija la categoría correcta.
const CATEGORY_LIST = CATEGORY_SEEDS.map((c) => `${c.id} — ${c.name}`).join("\n");

const VOICE_SYSTEM_PROMPT = `Sos un asistente que convierte lo que alguien dice en voz en uno o más gastos domésticos en Argentina, listos para confirmar. Devolvés SOLO JSON según el schema. No guardás nada ni inventás gastos.

Reglas:
- Si la frase tiene varios gastos, separalos en items distintos. Si no hay ningún gasto claro, devolvé la lista vacía.
- Montos en formato argentino: el punto es separador de miles y la coma es decimal. "20.000" = 20000; "1.500,50" = 1500.5. Jerga: "luca"/"lucas" = 1000 ("20 lucas" = 20000), "palo" = 1000000, "gamba" = 100, "mango"/"mangos"/"pesos" = unidad. "20 mil" = 20000. amountOriginal es sólo el número, sin símbolos.
- Moneda: ARS por default. USD sólo si dice dólares, USD o "verdes".
- merchantName: el comercio o lugar si lo menciona ("la verdulería", "Coto", "el kiosco de la esquina"). Si no hay comercio, poné una descripción corta del gasto.
- description: frase corta y clara del gasto.
- expenseDate: resolvé fechas relativas a "today" en formato YYYY-MM-DD ("ayer", "hoy", "el lunes pasado"). Si no menciona fecha, null.
- ownerProfileKey: "guido" o "dalu" SOLO si lo dice explícitamente; si no, null.
- categoryId: elegí SIEMPRE el id más adecuado de la lista de abajo, infiriendo por el tipo de comercio o gasto (verdulería/almacén → verduleria-almacen, súper → supermercado, farmacia → salud-farmacia, nafta → nafta-peajes, uber/bondi/subte → transporte, resto/café → restaurantes-cafes, delivery → delivery). Usá "otros" SOLO si de verdad no encaja en ninguna.
- confidence: 0 a 1, qué tan seguro estás de la interpretación completa del gasto.

Categorías disponibles (id — nombre):
${CATEGORY_LIST}`;

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
            content: VOICE_SYSTEM_PROMPT
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
    // GPT elige la categoría (id válido por el enum del schema). Si cae en "otros",
    // le damos una última chance a la heurística de comercios conocidos.
    const gptCategoryId = optionalString(record.categoryId);
    const categoryId =
      gptCategoryId && gptCategoryId !== "otros"
        ? gptCategoryId
        : categorizeMerchant(merchantName).categoryId ?? gptCategoryId ?? "otros";
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
      categoryId,
      sourceType: "voice" as const,
      ownerProfileId,
      notes: optionalString(record.notes) ?? undefined,
      confidence:
        typeof record.confidence === "number" && Number.isFinite(record.confidence)
          ? Math.max(0, Math.min(1, record.confidence))
          : 0.5,
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

export function voiceErrorPayload(code: VoiceErrorCode, detail?: string) {
  return {
    errorCode: code,
    error: VOICE_ERRORS[code].message,
    detail: detail ?? null,
    expenses: [],
    warnings: []
  };
}
