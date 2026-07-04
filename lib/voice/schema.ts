import { CATEGORY_SEEDS } from "@/lib/domain/categories";

// Lista cerrada de ids válidos. Al ir como `enum` en el schema strict de OpenAI,
// GPT SOLO puede devolver una categoría que existe: no puede inventar una.
const CATEGORY_IDS = CATEGORY_SEEDS.map((category) => category.id);

export const VOICE_EXPENSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["expenses", "warnings"],
  properties: {
    expenses: {
      type: "array",
      minItems: 0,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "description",
          "merchantName",
          "amountOriginal",
          "currency",
          "expenseDate",
          "categoryId",
          "ownerProfileKey",
          "confidence",
          "notes"
        ],
        properties: {
          description: { type: "string" },
          merchantName: { type: "string" },
          amountOriginal: { type: "number", minimum: 0 },
          currency: { type: "string", enum: ["ARS", "USD"] },
          expenseDate: { type: ["string", "null"] },
          categoryId: { type: "string", enum: CATEGORY_IDS },
          ownerProfileKey: { type: ["string", "null"], enum: ["guido", "dalu", null] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          notes: { type: ["string", "null"] }
        }
      }
    },
    warnings: {
      type: "array",
      items: { type: "string" }
    }
  }
};
