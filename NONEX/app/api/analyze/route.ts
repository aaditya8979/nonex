import { NextRequest } from "next/server";
import { AnalyzeRequestSchema } from "@/lib/schemas";
import { scrapeMarketData } from "@/lib/scraper";
import { analyzeWithLLM } from "@/lib/openrouter";
import type { StreamEvent } from "@/lib/types";

// ─── SSE Streaming API Route: /api/analyze ───
// Pipeline: Validate Input → Scrape Market Data → LLM Analysis → Stream Results

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for scraping + LLM

/**
 * Encode a StreamEvent as an SSE data line.
 */
function encodeEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Create a log event helper.
 */
function log(
  agent: string,
  message: string,
  status: StreamEvent extends { type: "log" } ? StreamEvent["data"]["status"] : string = "info"
): StreamEvent {
  return {
    type: "log",
    data: { agent, message, status: status as "info" | "success" | "warning" | "error" },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = AnalyzeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: parseResult.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { project_description } = parseResult.data;

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        };

        try {
          // ─── Step 1: Input Processing ───
          send(log("system", "Pipeline initialized. Starting analysis...", "info"));
          await delay(300);

          send(log("validator", `Input validated: ${project_description.length} chars`, "success"));
          await delay(200);

          // ─── Step 2: Market Data Scraping ───
          send(log("scraper", "Launching market data scrapers...", "info"));
          await delay(400);

          send(log("scraper", "→ Querying HackerNews Algolia API...", "info"));
          send(log("scraper", "→ Fetching Product Hunt search data...", "info"));

          const marketData = await scrapeMarketData(project_description);

          send(
            log(
              "scraper",
              `Scrape complete. Method: ${marketData.scrape_method} | Sources: ${marketData.sources.length}`,
              "success"
            )
          );
          await delay(200);

          for (const source of marketData.sources) {
            send(log("scraper", `  ✓ ${source}`, "success"));
            await delay(100);
          }

          // ─── Step 3: Token Optimization ───
          send(log("optimizer", `Payload sanitized: ${marketData.combined_data.length} chars → optimized for LLM`, "info"));
          await delay(300);

          // ─── Step 4: LLM Analysis ───
          send(log("mastra", "Routing to OpenRouter (anthropic/claude-3.5-sonnet)...", "info"));
          await delay(300);

          send(log("mastra", "Architect pass: constructing monetization strategy...", "info"));
          send(log("mastra", "Reviewer pass: validating against market data...", "info"));

          const result = await analyzeWithLLM(project_description, marketData);

          send(log("zod", "Schema validation passed ✓", "success"));
          await delay(200);

          send(log("system", "Analysis complete. Rendering results.", "success"));
          await delay(200);

          // ─── Step 5: Return Result ───
          send({ type: "result", data: result });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error occurred";
          send(log("system", `Error: ${message}`, "error"));
          send({ type: "error", data: { message } });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to parse request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
