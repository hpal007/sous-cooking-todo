import { GoogleGenAI, Type } from "@google/genai";
import type { CookingPlan } from "./types";
import { cookingPlanSchema, type ValidatedPlanRequest } from "./validation";
import {
  buildPrompt,
  findAllergenLeak,
  parseAllergens,
  reconcileBudget,
} from "./plan-logic";

// One shared client. The key is read from the server environment only and is
// never sent to the browser. Built with Google AI Studio (Gemini).
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).",
    );
  }
  return new GoogleGenAI({ apiKey });
}

// The structured-output contract. Forcing a responseSchema is what makes this
// a real meal-planning *flow* instead of a free-text blob: the model must
// return all four required artifacts, every time, in a shape the UI can render.
const mealSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    prepTimeMinutes: { type: Type.INTEGER },
    calories: { type: Type.INTEGER },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    estimatedCost: { type: Type.NUMBER },
  },
  required: [
    "name",
    "description",
    "prepTimeMinutes",
    "calories",
    "steps",
    "ingredients",
    "estimatedCost",
  ],
  propertyOrdering: [
    "name",
    "description",
    "prepTimeMinutes",
    "calories",
    "steps",
    "ingredients",
    "estimatedCost",
  ],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    meals: {
      type: Type.OBJECT,
      properties: {
        breakfast: mealSchema,
        lunch: mealSchema,
        dinner: mealSchema,
      },
      required: ["breakfast", "lunch", "dinner"],
      propertyOrdering: ["breakfast", "lunch", "dinner"],
    },
    groceryList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.STRING },
          category: { type: Type.STRING },
          estimatedCost: { type: Type.NUMBER },
        },
        required: ["name", "quantity", "category", "estimatedCost"],
        propertyOrdering: ["name", "quantity", "category", "estimatedCost"],
      },
    },
    substitutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ingredient: { type: Type.STRING },
          alternative: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ["ingredient", "alternative", "reason"],
        propertyOrdering: ["ingredient", "alternative", "reason"],
      },
    },
    budget: {
      type: Type.OBJECT,
      properties: {
        estimatedTotal: { type: Type.NUMBER },
        budgetLimit: { type: Type.NUMBER },
        currency: { type: Type.STRING },
        withinBudget: { type: Type.BOOLEAN },
        difference: { type: Type.NUMBER },
        notes: { type: Type.STRING },
      },
      required: [
        "estimatedTotal",
        "budgetLimit",
        "currency",
        "withinBudget",
        "difference",
        "notes",
      ],
      propertyOrdering: [
        "estimatedTotal",
        "budgetLimit",
        "currency",
        "withinBudget",
        "difference",
        "notes",
      ],
    },
  },
  required: ["summary", "meals", "groceryList", "substitutions", "budget"],
  propertyOrdering: [
    "summary",
    "meals",
    "groceryList",
    "substitutions",
    "budget",
  ],
};

async function callModel(prompt: string): Promise<CookingPlan> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("The model returned an empty response. Please try again.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("The model returned malformed JSON. Please try again.");
  }

  // Validate the shape before we trust it. This replaces an unchecked cast and
  // guarantees every field the recompute and the UI rely on actually exists.
  const parsed = cookingPlanSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The model returned an unexpected shape. Please try again.");
  }
  return parsed.data;
}

export async function generateCookingPlan(
  input: ValidatedPlanRequest,
): Promise<CookingPlan> {
  const allergens = parseAllergens(input.allergies);
  const prompt = buildPrompt(input, allergens);

  let plan = await callModel(prompt);

  // Allergen safety net: if a listed allergen leaked into any field, regenerate
  // once with a sterner reminder. Capped at one retry to bound latency/cost.
  const leaked = findAllergenLeak(plan, allergens);
  if (leaked) {
    const retryPrompt = `${prompt}\n\nCRITICAL: a previous attempt wrongly referenced "${leaked}". Produce a plan that contains absolutely no mention of [${allergens.join(", ")}] anywhere.`;
    plan = await callModel(retryPrompt);
  }

  reconcileBudget(plan, input);
  return plan;
}
