import { GoogleGenAI, Type } from "@google/genai";
import type { CookingPlan } from "./types";
import type { ValidatedPlanRequest } from "./validation";

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

function buildPrompt(input: ValidatedPlanRequest): string {
  return [
    "You are a practical home-cooking planner. Turn the user's day into a personal cooking to-do list.",
    "Plan three meals (breakfast, lunch, dinner) that realistically fit their schedule, energy, and time.",
    "",
    "Hard rules:",
    `- Cook for ${input.people} ${input.people === 1 ? "person" : "people"}.`,
    `- Respect dietary preference: ${input.dietaryPreference}.`,
    `- Strictly avoid these allergens / disliked items: ${input.allergies}.`,
    `- Lean toward this cuisine when sensible: ${input.cuisine}.`,
    `- Total grocery budget is ${input.budget} ${input.currency} for the whole day.`,
    "",
    "Budget feasibility logic (important):",
    "- Estimate a realistic cost for every grocery item in the user's currency.",
    "- Sum them into estimatedTotal. Set withinBudget = (estimatedTotal <= budgetLimit).",
    "- difference = estimatedTotal - budgetLimit (negative means under budget).",
    "- If over budget, the substitutions list MUST include concrete cheaper swaps that would bring it under budget, and say so in budget.notes.",
    "- If under budget, note the headroom and one optional upgrade.",
    "",
    "Substitutions: give 3-5 useful swaps for budget, allergy-safety, health, or availability. Never suggest anything containing a listed allergen.",
    "",
    "Keep steps short and actionable, like checklist items. Be specific with quantities in the grocery list.",
    "",
    `The user's day: "${input.dayContext}"`,
  ].join("\n");
}

export async function generateCookingPlan(
  input: ValidatedPlanRequest,
): Promise<CookingPlan> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(input),
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

  let plan: CookingPlan;
  try {
    plan = JSON.parse(text) as CookingPlan;
  } catch {
    throw new Error("The model returned malformed JSON. Please try again.");
  }

  // Trust-but-verify the budget math. The model is good at this, but feasibility
  // is the headline feature, so we recompute the verdict from the numbers we got
  // rather than trusting the model's boolean blindly.
  const computedTotal = Number(
    plan.groceryList
      .reduce((sum, item) => sum + (Number(item.estimatedCost) || 0), 0)
      .toFixed(2),
  );
  plan.budget.estimatedTotal = computedTotal;
  plan.budget.budgetLimit = input.budget;
  plan.budget.currency = input.currency;
  plan.budget.difference = Number((computedTotal - input.budget).toFixed(2));
  plan.budget.withinBudget = computedTotal <= input.budget;

  return plan;
}
