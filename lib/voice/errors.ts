export type VoiceErrorCode =
  | "no_audio"
  | "empty_audio"
  | "audio_too_large"
  | "mic_permission"
  | "transcription_empty"
  | "extraction_invalid"
  | "openai_auth"
  | "rate_limited"
  | "openai_unavailable"
  | "network"
  | "unauthenticated"
  | "unknown";

export class VoiceError extends Error {
  constructor(
    public code: VoiceErrorCode,
    message?: string
  ) {
    super(message ?? code);
  }
}

export const VOICE_ERRORS: Record<VoiceErrorCode, { message: string; hint?: string }> = {
  no_audio: { message: "No llegó ningún audio." },
  empty_audio: { message: "El audio está vacío." },
  audio_too_large: { message: "El audio es demasiado largo." },
  mic_permission: {
    message: "No pude acceder al micrófono.",
    hint: "Revisá permisos y volvé a intentar."
  },
  transcription_empty: { message: "No pude entender el audio." },
  extraction_invalid: { message: "Entendí el audio pero no pude armar gastos." },
  openai_auth: { message: "Falta configurar OpenAI." },
  rate_limited: { message: "OpenAI está limitando los pedidos." },
  openai_unavailable: { message: "OpenAI no está disponible ahora." },
  network: { message: "Hubo un problema de red." },
  unauthenticated: { message: "Necesitás iniciar sesión para usar la voz." },
  unknown: { message: "No pude procesar el audio." }
};
