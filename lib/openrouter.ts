import type { AnalysisResult } from "./types";
import type { MarketData } from "./scraper";
import { AnalysisResultSchema } from "./schemas";

// ─── OpenRouter / Mastra Bridge ───
// Deterministic Architect-Reviewer pipeline via OpenRouter API.

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model cascade: fast models first, heavier models as fallback.
// This ensures results even when premium models are slow or rate-limited.
const MODEL_CASCADE = [
  "google/gemini-2.0-flash-001",
  "anthropic/claude-3-haiku",
  "anthropic/claude-3.5-sonnet",
];

const REQUEST_TIMEOUT_MS = 55000; // 55 seconds per attempt

/**
 * Construct the Architect-Reviewer system prompt.
 * This prompt enforces deterministic JSON output with no markdown.
 */
function buildSystemPrompt(): string {
  return `You are an Architect-Reviewer operating inside a deterministic Project-to-Income Engine pipeline.

Your function:
1. ARCHITECT PASS: Analyze the student's project description and the scraped market data. Identify the highest-viability monetization path: the ideal target user persona, the optimal business model, and a realistic pricing structure grounded in the market data.
2. REVIEWER PASS: Ruthlessly critique your Architect output. Is this viable for a student developer with no marketing budget? Are the pricing tiers backed by the scraped competitor data? Remove any hallucinated or aspirational suggestions.
3. OUTPUT: Return ONLY the surviving, validated strategy.

STRICT OUTPUT RULES:
- Output ONLY valid, parsable JSON. No markdown. No code blocks. No explanatory text.
- Your output must match this exact schema:
{
  "target_users": "A specific 2-3 sentence description of who will pay for this, their role, and their exact pain point. Ground this in the forum data provided.",
  "monetization_strategy": "A 2-3 sentence description of the business model (e.g., Open-Core, API-as-a-Service, Freemium SaaS, One-Time License). Include the immediate first technical step to implement payment (e.g., integrate Stripe Checkout, add license key validation).",
  "pricing_tiers": [
    {
      "tier_name": "Name of the tier",
      "price": 0,
      "features": ["Feature 1 derived from project capabilities", "Feature 2 matching competitor limits"]
    }
  ],
  "market_income_capability": {
    "estimated_mrr": "A realistic monthly recurring revenue estimate for the first 6 months, e.g. '$800-$2,400/mo'. Ground this in the competitor pricing data.",
    "validation_summary": "A 1-2 sentence summary of why this revenue estimate is achievable based on the scraped market data.",
    "growth_ceiling": "The realistic upper bound of annual revenue if the product gains traction, e.g. '$120K ARR within 18 months'."
  },
  "success_blueprint": {
    "founder_archetype": "A short label for the ideal founder profile, e.g. 'Technical Solo Founder' or 'Design-Dev Duo'.",
    "execution_theory": "A 2-3 sentence action plan describing HOW to go from current state to first paying customer.",
    "immediate_roadmap": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
  }
}

- pricing_tiers MUST have 2-4 tiers.
- immediate_roadmap MUST have 3-5 steps.
- All prices must be realistic and grounded in the scraped competitor data. Do not invent prices that contradict market baselines.
- The 'price' field MUST be a raw number (e.g. 0, 15, 29.99). Do NOT include strings, currency symbols, or text like "/mo".
- Features must be derived from the project description's actual capabilities, not imagined features.
- Do NOT wrap your response in \`\`\`json\`\`\` or any other markdown.`;
}

/**
 * Construct the user prompt with project description and market data.
 */
function buildUserPrompt(
  projectDescription: string,
  marketData: MarketData
): string {
  return `<project_description>
${projectDescription}
</project_description>

<scraped_market_data>
Sources: ${marketData.sources.join(", ")}
Scrape Method: ${marketData.scrape_method}

${marketData.combined_data}
</scraped_market_data>

Analyze this project and return the monetization strategy as strict JSON. No markdown. No explanation. JSON only.`;
}

/**
 * Make a single LLM call to a specific model with timeout.
 * Returns the validated result or throws on failure.
 */
async function callModel(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://project-to-income.vercel.app",
        "X-Title": "Project-to-Income Engine",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        top_p: 0.9,
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenRouter API error (${response.status}) [${model}]: ${errorBody}`
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error(`Empty response from model: ${model}`);
    }

    // Robustly extract JSON object ignoring any prefixes or markdown
    let cleanedContent = rawContent;
    const firstBrace = cleanedContent.indexOf("{");
    const lastBrace = cleanedContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      cleanedContent = cleanedContent.substring(firstBrace, lastBrace + 1);
    } else {
      throw new Error(`No JSON object found in response from: ${model}`);
    }

    // Parse and validate with Zod
    const parsed = JSON.parse(cleanedContent);
    const validated = AnalysisResultSchema.parse(parsed);

    return validated;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Call OpenRouter API with a model cascade and return validated analysis result.
 * Tries fast models first, falls back to heavier models if needed.
 */
export async function analyzeWithLLM(
  projectDescription: string,
  marketData: MarketData
): Promise<AnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to your .env file."
    );
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(projectDescription, marketData);

  const errors: string[] = [];

  for (const model of MODEL_CASCADE) {
    try {
      const result = await callModel(model, apiKey, systemPrompt, userPrompt);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`[${model}] ${msg}`);
      // Continue to next model in cascade
    }
  }

  throw new Error(
    `LLM analysis failed across all models:\n${errors.join("\n")}`
  );
}
