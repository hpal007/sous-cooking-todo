import { z } from "zod";

// Server-side input validation. Every field is bounded so a hostile or
// accidental payload can't blow up the prompt, the model, or our bill.
// Strings are length-capped; numbers are range-checked.
export const planRequestSchema = z.object({
  dayContext: z
    .string()
    .trim()
    .min(3, "Tell us a little about your day.")
    .max(600, "Keep the day description under 600 characters."),
  people: z.coerce.number().int().min(1).max(20),
  dietaryPreference: z.string().trim().max(80).default("No preference"),
  allergies: z.string().trim().max(200).default("None"),
  cuisine: z.string().trim().max(80).default("Any"),
  budget: z.coerce.number().min(1).max(100000),
  // Allowlist the currencies the UI offers rather than accepting any string,
  // so the value reaching the prompt and the UI is always one we control.
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
});

export type ValidatedPlanRequest = z.infer<typeof planRequestSchema>;

// Output contract. We validate the model's JSON against this before trusting it,
// so a partial or malformed-but-parseable response is rejected cleanly instead
// of throwing deep in the budget recompute or crashing the client render.
const mealSchema = z.object({
  name: z.string(),
  description: z.string(),
  prepTimeMinutes: z.number(),
  calories: z.number(),
  steps: z.array(z.string()),
  ingredients: z.array(z.string()),
  estimatedCost: z.number(),
});

export const cookingPlanSchema = z.object({
  summary: z.string(),
  meals: z.object({
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema,
  }),
  groceryList: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      category: z.string(),
      estimatedCost: z.number(),
    }),
  ),
  substitutions: z.array(
    z.object({
      ingredient: z.string(),
      alternative: z.string(),
      reason: z.string(),
    }),
  ),
  budget: z.object({
    estimatedTotal: z.number(),
    budgetLimit: z.number(),
    currency: z.string(),
    withinBudget: z.boolean(),
    difference: z.number(),
    notes: z.string(),
  }),
});
