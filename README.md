# 🥘 Sous — your daily cooking to-do list

> A simple AI micro-app that turns your day into a personal cooking to-do list.
> 🔗 **Live demo:** https://sous-cooking-todo.vercel.app
>
> Built for **PromptWars** (Hack2Skill × Google for Developers) with **Google AI Studio (Gemini)**.

Tell Sous what your day looks like. It returns a structured plan, not a wall of text:

1. **Breakfast / Lunch / Dinner plan** — dishes that fit your time, energy, and diet, each with a short cooking checklist.
2. **Grocery list** — every ingredient, with quantity, aisle category, and estimated cost.
3. **Smart substitutions** — cheaper / healthier / allergy-safe swaps.
4. **Budget feasibility logic** — adds up the real cost, tells you if you're within budget, and if not, exactly how to get there.

---

## Chosen vertical

**Vertical: a daily home-cooking assistant.** The persona is a **busy home cook** — someone
who, at the start of the day, doesn't want to think about *what* to cook, *what to buy*, or
*whether they can afford it*. Sous turns their day's context (schedule, energy, people, diet,
allergies, budget) into a complete, actionable cooking to-do list. It's a smart, dynamic
assistant: the entire plan changes with the user's input, and it reasons about real-world
constraints (time, money, allergens) rather than returning a fixed menu.

## Approach & logic

The challenge asked for a *structured meal-planning flow*, so the core of the app is a
**forced-JSON contract with Gemini**. The model is required (via `responseSchema`) to
return all four artifacts in a fixed shape every single time — so the output is a
dependable data structure the UI renders, not free text we hope to parse.

The decision-making is genuinely context-driven:
- The user's day, diet, cuisine, party size, allergies, and budget all flow into the prompt.
- **Allergens are an absolute rule** — they're stripped from every field, and a server-side
  scanner re-checks the output and regenerates once if anything leaked.
- **Budget feasibility is real logic, not a guess.** The server **recomputes** the grocery
  total and the within-budget verdict from the actual numbers ([`lib/plan-logic.ts`](lib/plan-logic.ts)),
  and if the plan is over budget the substitutions must include cheaper swaps that bring it
  back under. The model proposes; the server verifies.

## How it works

1. The user fills in their day + constraints in the single-page UI ([`app/page.tsx`](app/page.tsx)).
2. The browser POSTs to a server-only API route ([`app/api/plan/route.ts`](app/api/plan/route.ts)),
   which validates and bounds every input with Zod and rate-limits the request.
3. The server builds a prompt (user text safely delimited) and calls **Gemini** via Google AI
   Studio with the forced JSON schema ([`lib/gemini.ts`](lib/gemini.ts)).
4. The response is validated against a Zod output schema, allergen-scanned, and the budget is
   recomputed deterministically.
5. The structured plan is returned and rendered as meal cards, a grocery list, substitutions,
   and a budget feasibility panel.

## Assumptions

- **Prices are estimates.** Gemini estimates costs in the chosen currency; they're indicative
  for planning, not live market prices. The grocery total is treated as authoritative; per-meal
  costs are indicative.
- **One day at a time.** Sous plans a single day (breakfast/lunch/dinner), not a week.
- **The grocery list is the budget basis** — the feasibility verdict is computed from grocery
  item costs, assuming the user is shopping for the day rather than using a stocked pantry.
- **English input**, and a small fixed set of currencies (INR/USD/EUR/GBP) and diets offered in
  the UI. The allergy field is free text and treated as an absolute exclusion list.
- **A valid Google AI Studio key** is provided server-side via `GEMINI_API_KEY`.

## Why this design

The challenge asked for a *structured meal-planning flow*, so the core of the app is a
**forced-JSON contract with Gemini**. The model is required (via `responseSchema`) to
return all four artifacts in a fixed shape every single time — so the output is a
dependable data structure the UI renders, not free text we hope to parse.

Budget feasibility is the headline feature, so we don't trust the model's verdict blindly:
the server **recomputes the totals and the within-budget boolean from the actual numbers**
([`lib/gemini.ts`](lib/gemini.ts)). The model proposes; the server verifies.

## Architecture

```
Browser (app/page.tsx)
   │  POST /api/plan  { dayContext, people, diet, allergies, cuisine, budget, currency }
   ▼
Next.js API route (app/api/plan/route.ts)   ← runs on the server only
   │  1. Zod validation (lib/validation.ts)  — every field bounded
   │  2. generateCookingPlan (lib/gemini.ts) — Gemini structured output
   │  3. recompute budget math               — trust but verify
   ▼
Google AI Studio · Gemini (gemini-2.5-flash)
```

### Security

- The **`GEMINI_API_KEY` lives only on the server** (read from `process.env` inside the
  API route). It is never shipped to the browser, never in a `NEXT_PUBLIC_` var.
- **All input is validated and length-bounded** with Zod before it reaches the model.
- Errors are logged server-side; the client only gets a safe, generic message — no stack
  traces, no key, no model internals.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**, strict mode
- **@google/genai** SDK → Gemini structured output
- **Zod** for input validation
- Hand-written CSS (no UI framework) — one stylesheet, fully responsive
- Deployed on **Vercel**

## Run it locally

```bash
npm install
cp .env.example .env.local
# then edit .env.local and paste your key from https://aistudio.google.com/apikey
npm run dev
```

Open http://localhost:3000.

## Tests

The pure planning logic (budget recompute, allergen scan, input validation, rate
limiter) is unit-tested with Vitest — no network or API key required.

```bash
npm test
```

25 tests cover: budget math (under / over / exact, NaN-safety, model-lie override,
notes sanitization), the allergen leak scanner (including the `dairy-free`
false-positive guard), the Zod input schema (bounds, defaults, coercion, currency
allowlist), and the rate limiter (limit, reset, per-client isolation).

### Environment variables

| Name             | Required | Description                                            |
| ---------------- | -------- | ------------------------------------------------------ |
| `GEMINI_API_KEY` | yes      | Your Google AI Studio key. Server-side only.           |
| `GEMINI_MODEL`   | no       | Override the model. Defaults to `gemini-2.5-flash`.    |

## Project layout

| Path                       | Purpose                                          |
| -------------------------- | ------------------------------------------------ |
| `app/page.tsx`             | The single-page UI: input form + results         |
| `app/api/plan/route.ts`    | Server API: validate → generate → return         |
| `lib/gemini.ts`            | Gemini client, response schema, generation flow  |
| `lib/plan-logic.ts`        | Pure logic: prompt, allergen scan, budget math   |
| `lib/validation.ts`        | Zod input + output schemas                        |
| `lib/rate-limit.ts`        | In-memory per-IP rate limiter                     |
| `lib/types.ts`             | Shared domain types                              |
| `app/globals.css`          | All styling                                      |
| `tests/`                   | Vitest unit tests for the pure logic              |

## License

MIT
