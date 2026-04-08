// ─── Strict Type Definitions for the Project-to-Income Engine ───

export interface PricingTier {
  tier_name: string;
  price: number;
  features: string[];
}

export interface AnalysisResult {
  target_users: string;
  monetization_strategy: string;
  pricing_tiers: PricingTier[];
}

export interface AnalyzeRequest {
  project_description: string;
}

// ─── Streaming Protocol Types ───

export interface StreamLogEvent {
  type: "log";
  data: {
    agent: string;
    message: string;
    status: "info" | "success" | "warning" | "error";
  };
}

export interface StreamResultEvent {
  type: "result";
  data: AnalysisResult;
}

export interface StreamErrorEvent {
  type: "error";
  data: {
    message: string;
  };
}

export type StreamEvent = StreamLogEvent | StreamResultEvent | StreamErrorEvent;

// ─── UI State Types ───

export type AppState = "idle" | "loading" | "result" | "error";

export interface TerminalLog {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
  status: "info" | "success" | "warning" | "error";
}
