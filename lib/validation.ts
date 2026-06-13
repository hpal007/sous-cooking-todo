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
  currency: z
    .string()
    .trim()
    .min(1)
    .max(8)
    .default("INR"),
});

export type ValidatedPlanRequest = z.infer<typeof planRequestSchema>;
