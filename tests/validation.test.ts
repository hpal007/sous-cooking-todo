import { describe, it, expect } from "vitest";
import { planRequestSchema, cookingPlanSchema } from "../lib/validation";

describe("planRequestSchema", () => {
  const valid = {
    dayContext: "busy day at work",
    people: 2,
    budget: 500,
  };

  it("accepts a valid request and applies defaults", () => {
    const r = planRequestSchema.parse(valid);
    expect(r.currency).toBe("INR");
    expect(r.allergies).toBe("None");
    expect(r.cuisine).toBe("Any");
    expect(r.dietaryPreference).toBe("No preference");
  });

  it("rejects a too-short dayContext", () => {
    expect(planRequestSchema.safeParse({ ...valid, dayContext: "x" }).success).toBe(
      false,
    );
  });

  it("rejects people out of range", () => {
    expect(planRequestSchema.safeParse({ ...valid, people: 0 }).success).toBe(false);
    expect(planRequestSchema.safeParse({ ...valid, people: 999 }).success).toBe(
      false,
    );
  });

  it("rejects budget over the cap", () => {
    expect(
      planRequestSchema.safeParse({ ...valid, budget: 100001 }).success,
    ).toBe(false);
  });

  it("coerces numeric strings for people and budget", () => {
    const r = planRequestSchema.parse({
      ...valid,
      people: "3",
      budget: "250",
    });
    expect(r.people).toBe(3);
    expect(r.budget).toBe(250);
  });

  it("rejects a currency outside the allowlist", () => {
    expect(
      planRequestSchema.safeParse({ ...valid, currency: "BTC" }).success,
    ).toBe(false);
    expect(
      planRequestSchema.safeParse({ ...valid, currency: "USD" }).success,
    ).toBe(true);
  });
});

describe("cookingPlanSchema", () => {
  it("rejects a plan missing required sections", () => {
    expect(cookingPlanSchema.safeParse({ summary: "hi" }).success).toBe(false);
  });
});
