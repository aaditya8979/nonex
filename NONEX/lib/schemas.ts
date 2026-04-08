import { z } from "zod";

// ─── Zod Schema: Enforced on every LLM response ───

export const PricingTierSchema = z.object({
  tier_name: z.string().min(1, "Tier name is required"),
  price: z.number().min(0, "Price must be non-negative"),
  features: z.array(z.string().min(1)).min(1, "At least one feature required"),
});

export const AnalysisResultSchema = z.object({
  target_users: z.string().min(10, "Target users description too short"),
  monetization_strategy: z.string().min(10, "Monetization strategy too short"),
  pricing_tiers: z
    .array(PricingTierSchema)
    .min(1, "At least one pricing tier required")
    .max(5, "Maximum 5 pricing tiers"),
  market_income_capability: z
    .object({
      estimated_mrr: z.string().min(1),
      validation_summary: z.string().min(1),
      growth_ceiling: z.string().min(1),
    })
    .optional(),
  success_blueprint: z
    .object({
      founder_archetype: z.string().min(1),
      execution_theory: z.string().min(1),
      immediate_roadmap: z.array(z.string().min(1)).min(1),
    })
    .optional(),
});

// ─── Request Validation ───

export const AnalyzeRequestSchema = z.object({
  project_description: z
    .string()
    .min(10, "Project description must be at least 10 characters")
    .max(5000, "Project description must be under 5000 characters"),
});
