import { describe, it, expect } from "vitest";
import {
  parseAllergens,
  findAllergenLeak,
  reconcileBudget,
} from "../lib/plan-logic";
import type { CookingPlan, Meal } from "../lib/types";
import type { ValidatedPlanRequest } from "../lib/validation";

function meal(over: Partial<Meal> = {}): Meal {
  return {
    name: "Test dish",
    description: "A test dish.",
    prepTimeMinutes: 10,
    calories: 300,
    steps: ["Cook it."],
    ingredients: ["rice"],
    estimatedCost: 50,
    ...over,
  };
}

function plan(over: Partial<CookingPlan> = {}): CookingPlan {
  return {
    summary: "summary",
    meals: { breakfast: meal(), lunch: meal(), dinner: meal() },
    groceryList: [
      { name: "rice", quantity: "1 kg", category: "Grains", estimatedCost: 80 },
      { name: "dal", quantity: "500 g", category: "Pulses", estimatedCost: 60 },
    ],
    substitutions: [],
    budget: {
      estimatedTotal: 0,
      budgetLimit: 0,
      currency: "INR",
      withinBudget: false,
      difference: 0,
      notes: "Buy spices in bulk to save money.",
    },
    ...over,
  };
}

function req(over: Partial<ValidatedPlanRequest> = {}): ValidatedPlanRequest {
  return {
    dayContext: "a normal day",
    people: 1,
    dietaryPreference: "No preference",
    allergies: "None",
    cuisine: "Any",
    budget: 500,
    currency: "INR",
    ...over,
  };
}

describe("parseAllergens", () => {
  it("returns [] for none/empty/n-a", () => {
    expect(parseAllergens("None")).toEqual([]);
    expect(parseAllergens("")).toEqual([]);
    expect(parseAllergens("n/a")).toEqual([]);
  });

  it("splits commas, semicolons and newlines and lowercases", () => {
    expect(parseAllergens("Peanuts, Dairy; Shellfish\nGluten")).toEqual([
      "peanuts",
      "dairy",
      "shellfish",
      "gluten",
    ]);
  });

  it("drops 1-char noise tokens", () => {
    expect(parseAllergens("a, peanuts")).toEqual(["peanuts"]);
  });
});

describe("findAllergenLeak", () => {
  it("short-circuits with no allergens", () => {
    expect(findAllergenLeak(plan(), [])).toBeNull();
  });

  it("flags an allergen mentioned in a meal description", () => {
    const p = plan();
    p.meals.breakfast.description = "Poha tempered with peanuts and curry leaves.";
    expect(findAllergenLeak(p, ["peanuts"])).toBe("peanuts");
  });

  it("flags an allergen in the grocery list", () => {
    const p = plan();
    p.groceryList.push({
      name: "Cheese",
      quantity: "100 g",
      category: "Dairy",
      estimatedCost: 40,
    });
    expect(findAllergenLeak(p, ["cheese"])).toBe("cheese");
  });

  it("does NOT flag a reassuring 'dairy-free' phrasing", () => {
    const p = plan();
    p.meals.lunch.description = "A creamy dairy-free curry.";
    expect(findAllergenLeak(p, ["dairy"])).toBeNull();
  });

  it("returns null when the plan is clean", () => {
    expect(findAllergenLeak(plan(), ["peanuts", "shellfish"])).toBeNull();
  });
});

describe("reconcileBudget", () => {
  it("recomputes the total from grocery items", () => {
    const p = plan();
    reconcileBudget(p, req({ budget: 500 }));
    expect(p.budget.estimatedTotal).toBe(140); // 80 + 60
    expect(p.budget.budgetLimit).toBe(500);
    expect(p.budget.difference).toBe(-360);
    expect(p.budget.withinBudget).toBe(true);
  });

  it("marks over-budget correctly", () => {
    const p = plan();
    reconcileBudget(p, req({ budget: 100 }));
    expect(p.budget.withinBudget).toBe(false);
    expect(p.budget.difference).toBe(40); // 140 - 100
    expect(p.budget.notes).toMatch(/over your 100 INR budget/i);
  });

  it("ignores the model's boolean and trusts the math", () => {
    const p = plan();
    p.budget.withinBudget = true; // model lied
    reconcileBudget(p, req({ budget: 50 }));
    expect(p.budget.withinBudget).toBe(false);
  });

  it("strips numeric figures the model put in notes and prepends a verdict", () => {
    const p = plan();
    p.budget.notes = "The total is 999 INR which is great.";
    reconcileBudget(p, req({ budget: 500 }));
    expect(p.budget.notes).not.toMatch(/999/);
    expect(p.budget.notes).toMatch(/^This plan costs about 140 INR/);
  });

  it("propagates the requested currency", () => {
    const p = plan();
    reconcileBudget(p, req({ budget: 40, currency: "USD" }));
    expect(p.budget.currency).toBe("USD");
    expect(p.budget.notes).toMatch(/USD/);
  });

  it("guards against NaN grocery costs", () => {
    const p = plan();
    // @ts-expect-error simulate a bad model value
    p.groceryList[0].estimatedCost = "oops";
    reconcileBudget(p, req({ budget: 500 }));
    expect(p.budget.estimatedTotal).toBe(60); // bad item counts as 0
  });
});
