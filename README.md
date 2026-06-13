# 🥘 Sous — your daily cooking to-do list

> A simple AI micro-app that turns your day into a personal cooking to-do list.
> Built for **PromptWars** (Hack2Skill × Google for Developers) with **Google AI Studio (Gemini)**.

Tell Sous what your day looks like. It returns a structured plan, not a wall of text:

1. **Breakfast / Lunch / Dinner plan** — dishes that fit your time, energy, and diet, each with a short cooking checklist.
2. **Grocery list** — every ingredient, with quantity, aisle category, and estimated cost.
3. **Smart substitutions** — cheaper / healthier / allergy-safe swaps.
4. **Budget feasibility logic** — adds up the real cost, tells you if you're within budget, and if not, exactly how to get there.

---

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
