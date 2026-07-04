import { NextResponse } from "next/server";
import { todayISO } from "@/lib/domain/dates";
import { amountToArs } from "@/lib/domain/money";
import { normalizeMerchant } from "@/lib/domain/merchants";
import { getAppContext } from "@/lib/server/context";
import { getMepSellRate } from "@/lib/server/fx";
import { extractExpensesFromTranscript, transcribeVoiceAudio, voiceErrorPayload } from "@/lib/server/openai";
import { VoiceError } from "@/lib/voice/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (context.mode === "unauthenticated") {
    return NextResponse.json(voiceErrorPayload("unauthenticated"), { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json(voiceErrorPayload("no_audio"), { status: 400 });
  }

  const fxRate = await getMepSellRate(todayISO());
  const profileKey = context.member.profileKey;

  if (!process.env.OPENAI_API_KEY) {
    const amountOriginal = 5000;
    return NextResponse.json({
      transcript: "Demo: gasté 5.000 pesos en verduras",
      warnings: ["OPENAI_API_KEY no está configurada; devolví un ejemplo editable."],
      expenses: [
        {
          id: `voice-demo-${Date.now()}`,
          expenseDate: todayISO(),
          description: "Verdulería",
          merchantName: "Verdulería",
          merchantNormalized: normalizeMerchant("Verdulería"),
          amountOriginal,
          currency: "ARS",
          fxRate: null,
          amountArs: amountToArs(amountOriginal, "ARS", null),
          categoryId: "supermercado",
          sourceType: "voice",
          ownerProfileId: profileKey,
          confidence: 0.86,
          reviewStatus: "pending"
        }
      ]
    });
  }

  try {
    const transcript = await transcribeVoiceAudio(file);
    const parsed = await extractExpensesFromTranscript({ transcript, profileKey, fxRate });
    return NextResponse.json(parsed);
  } catch (error) {
    const code = error instanceof VoiceError ? error.code : "unknown";
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[voice/parse] fallo:", code, detail);
    return NextResponse.json(voiceErrorPayload(code, detail), {
      status: error instanceof VoiceError ? 400 : 500
    });
  }
}
