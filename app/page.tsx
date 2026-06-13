"use client";

import { useState } from "react";
import type { CookingPlan, MealSlot, PlanRequest } from "@/lib/types";

const MEAL_ORDER: { slot: MealSlot; label: string; icon: string }[] = [
  { slot: "breakfast", label: "Breakfast", icon: "☀️" },
  { slot: "lunch", label: "Lunch", icon: "🍽️" },
  { slot: "dinner", label: "Dinner", icon: "🌙" },
];

const EXAMPLE =
  "Busy WFH day. Gym at 7am, back-to-back meetings till 6pm, want something quick and high-protein. Cooking for myself.";

const initialForm: PlanRequest = {
  dayContext: "",
  people: 1,
  dietaryPreference: "No preference",
  allergies: "",
  cuisine: "Any",
  budget: 500,
  currency: "INR",
};

export default function Home() {
  const [form, setForm] = useState<PlanRequest>(initialForm);
  const [plan, setPlan] = useState<CookingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PlanRequest>(key: K, value: PlanRequest[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          allergies: form.allergies.trim() || "None",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }
      setPlan(data.plan as CookingPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const money = (n: number) =>
    `${form.currency} ${Number(n).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;

  return (
    <main className="page">
      <header className="hero">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            🥘
          </span>
          <span className="brand-name">Sous</span>
        </div>
        <h1>Turn your day into a cooking to-do list</h1>
        <p className="tagline">
          Tell Sous about your day. Get a breakfast / lunch / dinner plan, a
          grocery list, smart substitutions, and a budget check — in one go.
        </p>
        <p className="powered">Powered by Google AI Studio · Gemini</p>
      </header>

      <form className="card form" onSubmit={onSubmit} aria-busy={loading}>
        <label className="field field-wide">
          <span className="label">
            What does your day look like?
            <button
              type="button"
              className="ghost-btn"
              onClick={() => update("dayContext", EXAMPLE)}
            >
              Use an example
            </button>
          </span>
          <textarea
            value={form.dayContext}
            onChange={(e) => update("dayContext", e.target.value)}
            placeholder="e.g. Long work day, gym in the evening, low on time, craving something comforting…"
            rows={3}
            maxLength={600}
            required
          />
        </label>

        <div className="grid">
          <label className="field">
            <span className="label">People</span>
            <input
              type="number"
              min={1}
              max={20}
              value={form.people}
              onChange={(e) =>
                update("people", Math.max(1, Number(e.target.value) || 1))
              }
            />
          </label>

          <label className="field">
            <span className="label">Diet</span>
            <select
              value={form.dietaryPreference}
              onChange={(e) => update("dietaryPreference", e.target.value)}
            >
              <option>No preference</option>
              <option>Vegetarian</option>
              <option>Vegan</option>
              <option>Eggetarian</option>
              <option>High-protein</option>
              <option>Low-carb / Keto</option>
              <option>Jain</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Cuisine</span>
            <select
              value={form.cuisine}
              onChange={(e) => update("cuisine", e.target.value)}
            >
              <option>Any</option>
              <option>Indian</option>
              <option>Continental</option>
              <option>Italian</option>
              <option>East Asian</option>
              <option>Mediterranean</option>
              <option>Mexican</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Budget / day</span>
            <div className="money-input">
              <select
                value={form.currency}
                onChange={(e) => update("currency", e.target.value)}
                aria-label="Currency"
              >
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
              <input
                type="number"
                min={1}
                value={form.budget}
                onChange={(e) =>
                  update("budget", Math.max(1, Number(e.target.value) || 1))
                }
              />
            </div>
          </label>
        </div>

        <label className="field field-wide">
          <span className="label">Allergies / things to avoid (optional)</span>
          <input
            type="text"
            value={form.allergies}
            onChange={(e) => update("allergies", e.target.value)}
            placeholder="e.g. peanuts, shellfish, mushrooms"
            maxLength={200}
          />
        </label>

        <button className="submit" type="submit" disabled={loading}>
          {loading ? "Cooking up your plan…" : "Generate my cooking to-do list"}
        </button>
      </form>

      {error && (
        <div className="card error" role="alert">
          <strong>Couldn&apos;t generate a plan.</strong>
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="card skeleton-wrap" aria-hidden="true">
          <div className="skeleton-line w-40" />
          <div className="skeleton-line w-90" />
          <div className="skeleton-line w-70" />
        </div>
      )}

      {!plan && !loading && !error && (
        <div className="card empty">
          <h2>Your cooking plan will appear here</h2>
          <p>
            Describe your day above and Sous builds the whole thing in one go.
          </p>
          <div className="empty-steps">
            <div className="empty-step">
              <span className="es-num">1</span>
              <span className="es-text">
                Tell it about your day, diet, and budget
              </span>
            </div>
            <div className="empty-step">
              <span className="es-num">2</span>
              <span className="es-text">
                Get a breakfast, lunch &amp; dinner plan with steps
              </span>
            </div>
            <div className="empty-step">
              <span className="es-num">3</span>
              <span className="es-text">
                Plus a grocery list, swaps &amp; a budget check
              </span>
            </div>
          </div>
        </div>
      )}

      {plan && (
        <section className="results" aria-live="polite">
          <div className="card summary">
            <h2>Today&apos;s plan</h2>
            <p>{plan.summary}</p>
          </div>

          <h3 className="section-title">Meals</h3>
          <div className="meals">
            {MEAL_ORDER.map(({ slot, label, icon }) => {
              const meal = plan.meals[slot];
              if (!meal) return null;
              return (
                <article className="card meal" key={slot}>
                  <header className="meal-head">
                    <span className="meal-icon" aria-hidden="true">
                      {icon}
                    </span>
                    <div>
                      <span className="meal-slot">{label}</span>
                      <h4>{meal.name}</h4>
                    </div>
                  </header>
                  <p className="meal-desc">{meal.description}</p>
                  <div className="meal-meta">
                    <span>{meal.prepTimeMinutes} min</span>
                    <span>{meal.calories} kcal</span>
                    <span>{money(meal.estimatedCost)}</span>
                  </div>
                  <div className="meal-steps">
                    <span className="mini-label">Cooking to-do</span>
                    <ol>
                      {meal.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="two-col">
            <div className="card">
              <h3 className="section-title flush">
                <span aria-hidden="true">🛒</span> Grocery list
              </h3>
              <ul className="grocery">
                {plan.groceryList.map((item, i) => (
                  <li key={i}>
                    <span className="g-name">
                      {item.name}
                      <span className="g-qty">{item.quantity}</span>
                    </span>
                    <span className="g-cat">{item.category}</span>
                    <span className="g-cost">{money(item.estimatedCost)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h3 className="section-title flush">
                <span aria-hidden="true">🔄</span> Smart substitutions
              </h3>
              <ul className="subs">
                {plan.substitutions.map((s, i) => (
                  <li key={i}>
                    <span className="sub-swap">
                      <s>{s.ingredient}</s> → <strong>{s.alternative}</strong>
                    </span>
                    <span className="sub-reason">{s.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className={`card budget ${plan.budget.withinBudget ? "ok" : "over"}`}
          >
            <div className="budget-head">
              <h3 className="section-title flush">
                <span aria-hidden="true">💸</span> Budget feasibility
              </h3>
              <span className="badge">
                {plan.budget.withinBudget ? "Within budget" : "Over budget"}
              </span>
            </div>
            <div className="budget-numbers">
              <div>
                <span className="bn-label">Estimated cost</span>
                <span className="bn-value">
                  {money(plan.budget.estimatedTotal)}
                </span>
              </div>
              <div>
                <span className="bn-label">Your budget</span>
                <span className="bn-value">
                  {money(plan.budget.budgetLimit)}
                </span>
              </div>
              <div>
                <span className="bn-label">
                  {plan.budget.difference <= 0 ? "Headroom" : "Over by"}
                </span>
                <span className="bn-value">
                  {money(Math.abs(plan.budget.difference))}
                </span>
              </div>
            </div>
            <p className="budget-notes">{plan.budget.notes}</p>
          </div>
        </section>
      )}

      <footer className="footer">
        <span>Built for PromptWars · Hack2Skill × Google for Developers</span>
      </footer>
    </main>
  );
}
