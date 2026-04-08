import type { AnalysisResult } from "./types";
import type { MarketData } from "./scraper";
import { AnalysisResultSchema } from "./schemas";

// ─── OpenRouter / Mastra Bridge ───
// Deterministic Architect-Reviewer pipeline via OpenRouter API.

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-3.5-sonnet";

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
  ]
}

- pricing_tiers MUST have 2-4 tiers.
- All prices must be realistic and grounded in the scraped competitor data. Do not invent prices that contradict market baselines.
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
 * Call OpenRouter API and return validated analysis result.
 * Implements retry logic and Zod schema enforcement.
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

  // Attempt up to 2 tries (initial + 1 retry)
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://project-to-income.vercel.app",
          "X-Title": "Project-to-Income Engine",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3, // Low temperature for deterministic output
          max_tokens: 2000,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenRouter API error (${response.status}): ${errorBody}`
        );
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) {
        throw new Error("Empty response from OpenRouter API");
      }

      // Clean potential markdown wrapper
      let cleanedContent = rawContent.trim();
      if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent
          .replace(/^```(?:json)?\s*\n?/, "")
          .replace(/\n?```\s*$/, "");
      }

      // Parse and validate with Zod
      const parsed = JSON.parse(cleanedContent);
      const validated = AnalysisResultSchema.parse(parsed);

      return validated;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(String(error));

      // If it's a parse/validation error, retry with a stricter prompt nudge
      if (attempt === 0) {
        continue;
      }
    }
  }

  throw new Error(
    `LLM analysis failed after 2 attempts: ${lastError?.message}`
  );
}
