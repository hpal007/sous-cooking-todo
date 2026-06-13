# Build-in-Public narrative (for the PromptWars submission)

Two ready-to-post drafts. Edit the bracketed bits, add your screenshots/links, and post.

---

## 1) Technical blog post

### Title: I turned "what do I cook today?" into a structured AI flow — building Sous at PromptWars

**The challenge (revealed on the spot):** build a simple AI micro-app that turns a user's
day into a personal cooking to-do list — a breakfast/lunch/dinner plan, a grocery list,
substitutions, and budget feasibility logic.

**The insight:** the word that mattered in that brief was *structured*. The easy version is
"ask Gemini for a meal plan and print the text." That fails the moment you want to render a
grocery table, total up a budget, or check feasibility — you're back to regexing prose.

So I built the app around a **forced-JSON contract** instead. Using Google AI Studio's
Gemini with a `responseSchema`, the model is *required* to return all four artifacts in a
fixed shape every time:

```ts
config: {
  responseMimeType: "application/json",
  responseSchema, // meals{breakfast,lunch,dinner}, groceryList[], substitutions[], budget{}
}
```

That one decision turned "an AI that writes about food" into "a meal-planning flow that
returns data my UI can trust."

**Budget feasibility — trust, but verify.** Feasibility is the headline feature, so I don't
let the model grade its own homework. The server recomputes the grocery total and the
within-budget verdict from the actual numbers:

```ts
const computedTotal = plan.groceryList.reduce((s, i) => s + i.estimatedCost, 0);
plan.budget.withinBudget = computedTotal <= input.budget;
```

If it's over budget, the prompt forces the substitutions list to include concrete cheaper
swaps that would bring it back under — so "over budget" always comes with a way out.

**Security, because it's judged and because it's right.** The Gemini key lives only on the
server inside a Next.js API route — never a `NEXT_PUBLIC_` var, never in the browser bundle.
Every input is length-bounded with Zod before it reaches the model. Errors are logged
server-side; the client gets a safe generic message.

**Stack:** Next.js 16 (App Router) + TypeScript, `@google/genai`, Zod, hand-written CSS,
deployed on Vercel.

**What I'd add next:** save plans, a weekly view, and pantry-aware grocery lists (skip what
you already have).

🔗 Live app: https://sous-cooking-todo.vercel.app
💻 Code: https://github.com/hpal007/sous-cooking-todo

---

## 2) LinkedIn post

Just shipped **Sous** at #PromptWars (Hack2Skill × Google for Developers) 🥘

The on-the-spot challenge: turn someone's day into a personal cooking to-do list.

Instead of asking Gemini to *write* a meal plan, I made it return a **structured plan** —
a forced-JSON contract via Google AI Studio that always gives back:
✅ Breakfast / Lunch / Dinner with cooking steps
✅ A grocery list with quantities + costs
✅ Smart substitutions (budget / allergy / health)
✅ Budget feasibility — and if you're over, exactly how to get under

Two things I'm happy with:
🔒 The Gemini key never leaves the server, inputs are validated end to end
🧮 The server recomputes the budget math instead of trusting the model's word

Built with Next.js + TypeScript + Gemini, deployed on Vercel. Build-in-public ftw.

🔗 Try it: https://sous-cooking-todo.vercel.app
💻 Code: https://github.com/hpal007/sous-cooking-todo

#BuildWithAI #Gemini #GoogleAIStudio #Hackathon #AI
