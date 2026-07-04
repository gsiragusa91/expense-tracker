import { categorizeMerchant } from "@/lib/domain/categorize";
import { todayISO } from "@/lib/domain/dates";
import { amountToArs } from "@/lib/domain/money";
import { normalizeMerchant } from "@/lib/domain/merchants";
import type { Currency, ExpenseDraft } from "@/lib/domain/types";
import { VOICE_ERRORS, VoiceError, type VoiceErrorCode } from "@/lib/voice/errors";
import { VOICE_EXPENSE_JSON_SCHEMA } from "@/lib/voice/schema";

// La guía de categorías está sincronizada con CATEGORY_SEEDS (lib/domain/categories.ts):
// el enum del schema garantiza ids válidos; acá le damos a GPT QUÉ entra en cada una.
// Si se agrega/cambia una categoría en categories.ts, actualizar también esta guía.
// Validado con un eval de 101 frases (scratchpad/eval-voice.mjs): 3 flags, todos ambiguos.
const VOICE_SYSTEM_PROMPT = `Sos un asistente que convierte lo que alguien dice en voz en uno o más gastos domésticos en Argentina, listos para confirmar. Devolvés SOLO JSON según el schema. No guardás nada ni inventás gastos.

Reglas de parsing:
- Si la frase tiene varios gastos, separalos en items distintos. Si no hay ningún gasto claro, devolvé la lista vacía.
- Montos en formato argentino: el punto es separador de miles y la coma es decimal. "20.000" = 20000; "1.500,50" = 1500.5. Jerga: "luca"/"lucas" = 1000 ("20 lucas" = 20000), "palo"/"palos" = 1000000, "gamba" = 100, "mango"/"mangos"/"pesos" = unidad. "20 mil" = 20000. amountOriginal es sólo el número.
- Moneda: ARS por default. USD sólo si dice dólares, USD o "verdes".
- expenseDate: fechas relativas a "today" en YYYY-MM-DD ("ayer", "hoy", "el lunes pasado"). Si no menciona fecha, null.
- ownerProfileKey: "guido" o "dalu" SOLO si lo dice explícitamente; si no, null.
- merchantName: el comercio o lugar si lo nombra (Coto, la verdulería, YPF). Si no nombra ninguno, poné un nombre corto de QUÉ compró o pagó, de 1 a 3 palabras (ej. "leche de fórmula"→"Leche de fórmula", "un curso online"→"Curso online", "intereses de la tarjeta"→"Tarjeta de crédito"). El merchantName JAMÁS puede ser "null", "otros" ni "descripción del gasto".
- description: frase corta y clara del gasto.
- confidence: 0 a 1.

Categorización — elegí SIEMPRE el id más adecuado de esta lista según QUÉ es el gasto. Usá "otros" SÓLO si de verdad no encaja en ninguna:
supermercado — supermercado o autoservicio (Coto, Carrefour, Día, Jumbo, "el súper", "el chino", autoservicio de barrio).
verduleria-almacen — comida en comercios de barrio: verdulería, almacén, carnicería, fiambrería, panadería, dietética, kiosco, granja.
delivery — comida pedida a domicilio por app (Rappi, PedidosYa).
restaurantes-cafes — comer o tomar algo afuera: restaurante, bar, café, brunch, cervecería, heladería, comida al paso.
transporte — moverse: Uber, Cabify, Didi, taxi, SUBE, colectivo, subte, tren, estacionamiento.
nafta-peajes — auto en la calle: nafta, combustible, GNC, estaciones de servicio (YPF, Shell, Axion), peajes.
hogar-limpieza — cosas para la casa: limpieza, electrodomésticos, muebles, deco, blanco/sábanas, ferretería (Frávega, etc.).
expensas — expensas del edificio o administración del consorcio.
mascotas — todo de mascotas: alimento de perro/gato, veterinario, arena, juguetes y peluquería de mascota.
servicios-impuestos — servicios y boletas: luz, gas, agua, internet, teléfono/celular, cable, ABL, patente, impuestos, seguros.
salud-farmacia — farmacia y salud: remedios, farmacia, obra social, análisis, óptica.
consultorio — consultas de profesionales de salud: médico, dentista, psicólogo, kinesiólogo, pediatra.
ropa — indumentaria y calzado de adultos: ropa, zapatillas, accesorios.
educacion — educación: jardín, colegio, facultad, cursos, clases particulares, libros de estudio.
ocio-suscripciones — ocio y suscripciones: Netflix, Spotify, ChatGPT, cine, recitales, gimnasio, streaming, salidas.
viajes — viajes y turismo: pasajes, vuelos, hotel, Airbnb, alquiler de auto en viaje, excursiones.
banco-comisiones — costos financieros: comisiones bancarias, mantenimiento de cuenta, intereses de tarjeta, comisiones de Mercado Pago.
familia-bebe — cosas de bebés/niños: pañales, leche de fórmula, mamadera, cuna, cochecito, juguetes y ropa de bebé.
regalos — regalos para otras personas: regalos de cumpleaños/casamiento, flores para alguien.
otros — sólo si no encaja en ninguna (ej. extracción de cajero, corte de pelo/peluquería, préstamo a un amigo).`;

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
