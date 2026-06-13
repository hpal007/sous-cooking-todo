// Shared types for the cooking to-do list domain.
// These mirror the structured JSON schema we force Gemini to return,
// so the API route, the model, and the UI all agree on one shape.

export type MealSlot = "breakfast" | "lunch" | "dinner";

export interface Meal {
  /** Dish name, e.g. "Masala oats with boiled egg". */
  name: string;
  /** One-line description of the dish and why it fits the user's day. */
  description: string;
  /** Hands-on cooking time in minutes. */
  prepTimeMinutes: number;
  /** Approximate calories for the serving. */
  calories: number;
  /** Step-by-step cooking to-do items for this meal. */
  steps: string[];
  /** Ingredients used in this specific meal. */
  ingredients: string[];
  /** Estimated cost of this meal, in the user's currency. */
  estimatedCost: number;
}

export interface GroceryItem {
  name: string;
  /** Human-readable amount, e.g. "200 g" or "2 pcs". */
  quantity: string;
  /** Aisle/category for an organized shop, e.g. "Produce", "Dairy". */
  category: string;
  estimatedCost: number;
}

export interface Substitution {
  ingredient: string;
  /** A cheaper, healthier, or more available swap. */
  alternative: string;
  /** Why this swap helps: budget, allergy, availability, or health. */
  reason: string;
}

export interface BudgetAssessment {
  /** Sum of estimated grocery costs. */
  estimatedTotal: number;
  /** The budget the user gave us. */
  budgetLimit: number;
  currency: string;
  /** The core feasibility verdict. */
  withinBudget: boolean;
  /** estimatedTotal - budgetLimit (negative means under budget). */
  difference: number;
  /** Plain-language explanation of the feasibility logic and any tradeoffs. */
  notes: string;
}

export interface CookingPlan {
  /** A short, friendly summary of the day's eating plan. */
  summary: string;
  meals: Record<MealSlot, Meal>;
  groceryList: GroceryItem[];
  substitutions: Substitution[];
  budget: BudgetAssessment;
}

/** The form input the user fills in. */
export interface PlanRequest {
  dayContext: string;
  people: number;
  dietaryPreference: string;
  allergies: string;
  cuisine: string;
  budget: number;
  currency: string;
}
