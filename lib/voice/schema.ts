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
          "categoryHint",
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
          categoryHint: { type: ["string", "null"] },
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
} as const;
