"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Zap,
  DollarSign,
  Users,
  ArrowRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Info,
  Search,
  Layers,
  Shield,
  TrendingUp,
  ChevronDown,
  Cpu,
  Globe,
  Target,
  BarChart3,
  Map,
} from "lucide-react";
import type { AppState, TerminalLog, AnalysisResult, StreamEvent } from "@/lib/types";

// ─── Motion Variants ───

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.04, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: 0.3 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      delay: i * 0.12,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// ─── Example Prompts ───

const EXAMPLE_PROMPTS = [
  {
    icon: Cpu,
    text: "A CLI tool that converts Figma designs to React components using GPT-4 Vision",
    short: "Figma → React CLI",
  },
  {
    icon: TrendingUp,
    text: "An open-source analytics dashboard for tracking GitHub repo growth metrics",
    short: "GitHub Analytics",
  },
  {
    icon: Globe,
    text: "A browser extension that summarizes academic papers using AI and creates flashcards",
    short: "AI Paper Summaries",
  },
  {
    icon: Layers,
    text: "A real-time collaborative code editor with built-in AI pair programming",
    short: "AI Code Editor",
  },
];

// ─── Pipeline Steps ───

const PIPELINE_STEPS = [
  { label: "Ingest", icon: Search },
  { label: "Scrape", icon: Globe },
  { label: "Analyze", icon: Cpu },
  { label: "Validate", icon: Shield },
  { label: "Output", icon: Sparkles },
];

// ─── ID Gen ───
let _c = 0;
const uid = () => `l_${Date.now()}_${++_c}`;

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeStep, setActiveStep] = useState(-1);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightX = useTransform(mouseX, (v) => `${v}px`);
  const spotlightY = useTransform(mouseY, (v) => `${v}px`);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs]);

  // Track mouse for spotlight
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  // Map log agents to pipeline steps
  useEffect(() => {
    if (logs.length === 0) return;
    const last = logs[logs.length - 1];
    const map: Record<string, number> = {
      validator: 0,
      scraper: 1,
      mastra: 2,
      optimizer: 2,
      zod: 3,
      system: logs.some((l) => l.message.includes("complete")) ? 4 : 0,
    };
    const step = map[last.agent];
    if (step !== undefined) setActiveStep(step);
  }, [logs]);

  const addLog = useCallback(
    (agent: string, message: string, status: TerminalLog["status"] = "info") => {
      setLogs((prev) => [
        ...prev,
        {
          id: uid(),
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          agent,
          message,
          status,
        },
      ]);
    },
    []
  );

  // ─── Submit ───

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 10) return;

    setAppState("loading");
    setLogs([]);
    setResult(null);
    setErrorMessage("");
    setActiveStep(0);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_description: trimmed }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${response.status}`);
      }
      if (!response.body) throw new Error("No stream received");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: StreamEvent = JSON.parse(line.slice(6));
            if (event.type === "log") {
              addLog(event.data.agent, event.data.message, event.data.status);
            } else if (event.type === "result") {
              setActiveStep(4);
              setResult(event.data);
              setAppState("result");
            } else if (event.type === "error") {
              setErrorMessage(event.data.message);
              setAppState("error");
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unexpected error";
      setErrorMessage(msg);
      addLog("system", `Fatal: ${msg}`, "error");
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setInput("");
    setLogs([]);
    setResult(null);
    setErrorMessage("");
    setActiveStep(-1);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* ─── Animated Mesh BG ─── */}
      <div className="mesh-bg">
        <div className="mesh-orb-3" />
      </div>
      <div className="fixed inset-0 dot-grid z-[1] pointer-events-none" />

      {/* ─── Mouse Spotlight ─── */}
      <motion.div
        className="fixed z-[2] pointer-events-none"
        style={{
          left: spotlightX,
          top: spotlightY,
          width: 600,
          height: 600,
          x: -300,
          y: -300,
          background: "radial-gradient(circle, rgba(99,102,241,0.03) 0%, transparent 70%)",
        }}
      />

      {/* ─── Header ─── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3.5"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[rgba(99,102,241,0.15)]">
            <Zap className="w-[18px] h-[18px] text-[var(--accent-primary)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
              Project→Income
            </span>
            <span className="text-[10px] text-[var(--text-muted)] tracking-wide uppercase">
              VibeHack Engine
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="badge badge-active">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent-success)] opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-success)]" />
            </span>
            Online
          </div>
        </motion.div>
      </header>

      {/* ─── Main ─── */}
      <main className="relative z-10 flex flex-col items-center px-5 md:px-8">
        <AnimatePresence mode="wait">

          {/* ═══ IDLE STATE ═══ */}
          {appState === "idle" && (
            <motion.div
              key="idle"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center w-full max-w-2xl mt-[10vh]"
            >
              {/* Hero */}
              <motion.div variants={itemVariants} className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[11px] text-[var(--text-tertiary)] font-medium tracking-wide">
                  <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
                  AI-Powered Monetization Analysis
                </div>
                <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-[-0.03em] leading-[1.1] mb-4">
                  <span className="text-gradient-hero">Turn your project</span>
                  <br />
                  <span className="text-[var(--text-primary)]">into income</span>
                </h1>
                <p className="text-[15px] text-[var(--text-tertiary)] max-w-md mx-auto leading-relaxed">
                  Describe what you&apos;ve built. Our engine scrapes live market data,
                  identifies your ideal customer, and generates a monetization
                  playbook — in seconds.
                </p>
              </motion.div>

              {/* Input */}
              <motion.div variants={itemVariants} className="w-full">
                <div className="relative glass-card p-1.5">
                  <div
                    className="glass-card-accent"
                    style={{
                      background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), var(--accent-tertiary))",
                    }}
                  />
                  <textarea
                    ref={inputRef}
                    id="project-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your project — what it does, the tech, and who it's for..."
                    rows={4}
                    className="premium-input w-full px-5 py-4"
                    maxLength={5000}
                  />
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                      {input.length.toLocaleString()}<span className="text-[var(--text-muted)]">/5,000</span>
                    </span>
                    <button
                      id="analyze-button"
                      onClick={handleSubmit}
                      disabled={input.trim().length < 10}
                      className="btn-primary"
                    >
                      Analyze Project
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Example Prompts */}
              <motion.div variants={itemVariants} className="w-full mt-8">
                <p className="text-[11px] text-[var(--text-muted)] font-medium tracking-widest uppercase mb-3 ml-1">
                  Try an example
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EXAMPLE_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(p.text)}
                      className="prompt-chip group"
                    >
                      <p.icon className="w-4 h-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                      <span className="truncate">{p.short}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Pipeline Viz */}
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-2 mt-14 mb-8"
              >
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <div className="pipeline-connector" />}
                    <div className="pipeline-step">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <step.icon className="w-3 h-3 text-[var(--text-muted)]" />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        {step.label}
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ═══ LOADING STATE ═══ */}
          {appState === "loading" && (
            <motion.div
              key="loading"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-2xl mt-8"
            >
              {/* Header */}
              <motion.div variants={itemVariants} className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[rgba(99,102,241,0.15)]">
                    <Cpu className="w-[18px] h-[18px] text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      Analyzing Project
                    </h2>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Running through the pipeline...
                    </p>
                  </div>
                </div>
                <div className="badge badge-active">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]" />
                  </span>
                  Processing
                </div>
              </motion.div>

              {/* Pipeline Tracker */}
              <motion.div variants={itemVariants} className="flex items-center gap-2 mb-5 px-1">
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && (
                      <div
                        className="pipeline-connector transition-all duration-500"
                        style={{
                          background: i <= activeStep
                            ? "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))"
                            : undefined,
                        }}
                      />
                    )}
                    <div className={`pipeline-step ${i <= activeStep ? "active" : ""}`}>
                      <div
                        className="flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-500"
                        style={{
                          background: i <= activeStep ? "var(--accent-primary-soft)" : "var(--glass-bg)",
                          borderColor: i <= activeStep ? "rgba(99,102,241,0.2)" : "var(--glass-border)",
                        }}
                      >
                        {i < activeStep ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-success)]" />
                        ) : (
                          <step.icon
                            className="w-3 h-3 transition-colors duration-500"
                            style={{
                              color: i === activeStep ? "var(--accent-primary)" : "var(--text-muted)",
                            }}
                          />
                        )}
                      </div>
                      <span
                        className="text-[10px] font-medium transition-colors duration-500"
                        style={{
                          color: i <= activeStep ? "var(--text-secondary)" : "var(--text-muted)",
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Terminal */}
              <motion.div variants={itemVariants}>
                <div className="terminal-window">
                  <div className="terminal-titlebar">
                    <div className="terminal-dot" style={{ background: "rgba(239,68,68,0.7)" }} />
                    <div className="terminal-dot" style={{ background: "rgba(245,158,11,0.7)" }} />
                    <div className="terminal-dot" style={{ background: "rgba(16,185,129,0.7)" }} />
                    <span className="ml-3 text-[11px] text-[var(--text-muted)] font-mono">
                      pipeline.analysis
                    </span>
                  </div>
                  <div ref={terminalRef} className="terminal-body">
                    {logs.map((log, idx) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.015 }}
                        className="flex items-start gap-2.5"
                      >
                        <span className="text-[var(--text-muted)] shrink-0 select-none tabular-nums">
                          {log.timestamp}
                        </span>
                        <LogIcon status={log.status} />
                        <span className="text-[var(--accent-primary)] opacity-60 shrink-0">
                          [{log.agent}]
                        </span>
                        <span
                          style={{
                            color:
                              log.status === "success"
                                ? "var(--accent-success)"
                                : log.status === "error"
                                  ? "var(--accent-danger)"
                                  : log.status === "warning"
                                    ? "var(--accent-warning)"
                                    : "var(--text-tertiary)",
                          }}
                        >
                          {log.message}
                        </span>
                      </motion.div>
                    ))}
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-[var(--accent-primary)] opacity-40">❯</span>
                      <span className="cursor-blink" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Progress */}
              <motion.div variants={itemVariants} className="mt-4">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: "100%" }} />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ RESULT STATE ═══ */}
          {appState === "result" && result && (
            <motion.div
              key="result"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-5xl mt-8 mb-20"
            >
              {/* Header */}
              <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3.5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent-success-soft)] border border-[rgba(16,185,129,0.15)]">
                    <CheckCircle2 className="w-5 h-5 text-[var(--accent-success)]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                      Analysis Complete
                    </h2>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      Architect-Reviewer validated • Schema enforced
                    </p>
                  </div>
                </div>
                <button id="reset-button" onClick={handleReset} className="btn-secondary">
                  <RotateCcw className="w-3.5 h-3.5" />
                  New Analysis
                </button>
              </motion.div>

              {/* Bento Grid Results */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Card 1: Target Users */}
                <motion.div custom={0} variants={cardVariants} className="glass-card p-6 lg:col-span-1">
                  <div
                    className="glass-card-accent"
                    style={{ background: "linear-gradient(90deg, var(--accent-secondary), transparent)" }}
                  />
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent-secondary-soft)] border border-[rgba(6,182,212,0.12)]">
                      <Target className="w-[18px] h-[18px] text-[var(--accent-secondary)]" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
                        Target Users
                      </h3>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                        Ideal customer profile
                      </p>
                    </div>
                  </div>
                  <p className="text-[13.5px] text-[var(--text-secondary)] leading-[1.75]">
                    {result.target_users}
                  </p>
                </motion.div>

                {/* Card 2: Monetization Strategy */}
                <motion.div custom={1} variants={cardVariants} className="glass-card p-6 lg:col-span-1">
                  <div
                    className="glass-card-accent"
                    style={{ background: "linear-gradient(90deg, var(--accent-primary), transparent)" }}
                  />
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent-primary-soft)] border border-[rgba(99,102,241,0.12)]">
                      <Sparkles className="w-[18px] h-[18px] text-[var(--accent-primary)]" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
                        Monetization Strategy
                      </h3>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                        Revenue model
                      </p>
                    </div>
                  </div>
                  <p className="text-[13.5px] text-[var(--text-secondary)] leading-[1.75]">
                    {result.monetization_strategy}
                  </p>
                </motion.div>

                {/* Card 3: Pricing */}
                <motion.div custom={2} variants={cardVariants} className="glass-card p-6 lg:col-span-1">
                  <div
                    className="glass-card-accent"
                    style={{ background: "linear-gradient(90deg, var(--accent-tertiary), transparent)" }}
                  />
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent-tertiary-soft)] border border-[rgba(139,92,246,0.12)]">
                      <DollarSign className="w-[18px] h-[18px] text-[var(--accent-tertiary)]" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
                        Pricing Model
                      </h3>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                        Validated tiers
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {result.pricing_tiers.map((tier, i) => (
                      <div key={i} className="pricing-tier">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                            {tier.tier_name}
                          </span>
                          <span
                            className="text-[14px] font-bold font-mono"
                            style={{
                              color:
                                tier.price === 0
                                  ? "var(--accent-success)"
                                  : "var(--accent-primary)",
                            }}
                          >
                            {tier.price === 0 ? "Free" : `$${tier.price}`}
                            {tier.price > 0 && (
                              <span className="text-[10px] text-[var(--text-muted)] font-normal ml-0.5">
                                /mo
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {tier.features.map((f, j) => (
                            <div key={j} className="feature-item">
                              <div
                                className="dot"
                                style={{
                                  background:
                                    i === 0
                                      ? "var(--accent-secondary)"
                                      : i === 1
                                        ? "var(--accent-primary)"
                                        : "var(--accent-tertiary)",
                                }}
                              />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* ─── Row 2: Market Income + Success Blueprint ─── */}
              {(result?.market_income_capability || result?.success_blueprint) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Card 4: Market Income Capability */}
                  {result?.market_income_capability && (
                    <motion.div custom={3} variants={cardVariants} className="glass-card p-6">
                      <div
                        className="glass-card-accent"
                        style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.6), transparent)" }}
                      />
                      <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.12)]">
                          <BarChart3 className="w-[18px] h-[18px] text-[var(--accent-success)]" />
                        </div>
                        <div>
                          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
                            Market Income Capability
                          </h3>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                            Revenue potential
                          </p>
                        </div>
                      </div>
                      {/* Estimated MRR — hero metric */}
                      <div className="mb-4">
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1.5 font-medium">Est. MRR</p>
                        <p className="text-[28px] font-bold font-mono tracking-tight" style={{ color: "rgb(34,211,238)" }}>
                          {result.market_income_capability.estimated_mrr}
                        </p>
                      </div>
                      {/* Validation Summary */}
                      <p className="text-[13px] text-[var(--text-secondary)] leading-[1.75] mb-4">
                        {result.market_income_capability.validation_summary}
                      </p>
                      {/* Growth Ceiling */}
                      <div className="pt-3 border-t border-[var(--glass-border)]">
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1 font-medium">Growth Ceiling</p>
                        <p className="text-[13.5px] font-mono" style={{ color: "var(--accent-tertiary)" }}>
                          {result.market_income_capability.growth_ceiling}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Card 5: Success Blueprint */}
                  {result?.success_blueprint && (
                    <motion.div custom={4} variants={cardVariants} className="glass-card p-6">
                      <div
                        className="glass-card-accent"
                        style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.6), transparent)" }}
                      />
                      <div className="flex items-center gap-3 mb-5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent-primary-soft)] border border-[rgba(99,102,241,0.12)]">
                          <Map className="w-[18px] h-[18px] text-[var(--accent-primary)]" />
                        </div>
                        <div>
                          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
                            Success Blueprint
                          </h3>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                            Execution plan
                          </p>
                        </div>
                      </div>
                      {/* Founder Archetype Badge */}
                      <div className="mb-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[var(--accent-primary-soft)] border border-[rgba(99,102,241,0.15)] text-[12px] font-mono font-semibold text-[var(--accent-primary)] tracking-wide">
                          {result.success_blueprint.founder_archetype}
                        </span>
                      </div>
                      {/* Execution Theory */}
                      <p className="text-[13px] text-[var(--text-secondary)] leading-[1.75] mb-5">
                        {result.success_blueprint.execution_theory}
                      </p>
                      {/* Immediate Roadmap Timeline */}
                      {result.success_blueprint.immediate_roadmap?.length > 0 && (
                        <div className="pt-3 border-t border-[var(--glass-border)]">
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-3 font-medium">Immediate Roadmap</p>
                          <div className="space-y-2.5">
                            {result.success_blueprint.immediate_roadmap.map((step, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <div className="flex flex-col items-center mt-1">
                                  <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{
                                      background: i === 0 ? "var(--accent-primary)" : i === 1 ? "var(--accent-secondary)" : "var(--accent-tertiary)",
                                    }}
                                  />
                                  {i < (result.success_blueprint?.immediate_roadmap?.length ?? 0) - 1 && (
                                    <div className="w-px h-4 bg-[var(--glass-border)] mt-0.5" />
                                  )}
                                </div>
                                <span className="text-[12.5px] text-[var(--text-secondary)] font-mono leading-snug">
                                  {step}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Expandable Logs */}
              <motion.div variants={itemVariants} className="mt-6">
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-[12px] text-[var(--text-muted)] hover:text-[var(--text-tertiary)] transition-colors select-none">
                    <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform duration-300" />
                    View execution log ({logs.length} events)
                  </summary>
                  <div className="terminal-window mt-3">
                    <div className="terminal-titlebar">
                      <div className="terminal-dot" style={{ background: "rgba(239,68,68,0.7)" }} />
                      <div className="terminal-dot" style={{ background: "rgba(245,158,11,0.7)" }} />
                      <div className="terminal-dot" style={{ background: "rgba(16,185,129,0.7)" }} />
                      <span className="ml-3 text-[11px] text-[var(--text-muted)] font-mono">
                        pipeline.log — completed
                      </span>
                    </div>
                    <div className="terminal-body" style={{ maxHeight: "30vh" }}>
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2.5">
                          <span className="text-[var(--text-muted)] shrink-0 tabular-nums">
                            {log.timestamp}
                          </span>
                          <LogIcon status={log.status} />
                          <span className="text-[var(--accent-primary)] opacity-60 shrink-0">
                            [{log.agent}]
                          </span>
                          <span
                            style={{
                              color:
                                log.status === "success"
                                  ? "var(--accent-success)"
                                  : log.status === "error"
                                    ? "var(--accent-danger)"
                                    : "var(--text-tertiary)",
                            }}
                          >
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ ERROR STATE ═══ */}
          {appState === "error" && (
            <motion.div
              key="error"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-2xl mt-16"
            >
              <motion.div variants={itemVariants}>
                <div className="glass-card p-8" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.12)]">
                      <AlertCircle className="w-5 h-5 text-[var(--accent-danger)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--accent-danger)]">
                        Pipeline Error
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        The analysis encountered a problem
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.08)] mb-6">
                    <p className="text-[13px] text-[var(--text-secondary)] font-mono leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                  <button onClick={handleReset} className="btn-primary">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                </div>
              </motion.div>

              {logs.length > 0 && (
                <motion.div variants={itemVariants} className="mt-6">
                  <div className="terminal-window">
                    <div className="terminal-titlebar">
                      <div className="terminal-dot" style={{ background: "rgba(239,68,68,0.7)" }} />
                      <div className="terminal-dot" style={{ background: "rgba(245,158,11,0.7)" }} />
                      <div className="terminal-dot" style={{ background: "rgba(16,185,129,0.7)" }} />
                      <span className="ml-3 text-[11px] text-[var(--text-muted)] font-mono">
                        error trace
                      </span>
                    </div>
                    <div className="terminal-body" style={{ maxHeight: "25vh" }}>
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2.5">
                          <span className="text-[var(--text-muted)] shrink-0 tabular-nums">
                            {log.timestamp}
                          </span>
                          <LogIcon status={log.status} />
                          <span className="text-[var(--accent-primary)] opacity-60 shrink-0">
                            [{log.agent}]
                          </span>
                          <span
                            style={{
                              color:
                                log.status === "error"
                                  ? "var(--accent-danger)"
                                  : "var(--text-tertiary)",
                            }}
                          >
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Footer ─── */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-center py-4 pointer-events-none">
        <p className="text-[10px] text-[var(--text-muted)] tracking-wider">
          VibeHack 2026 • Architect-Reviewer Pipeline • OpenRouter × Claude
        </p>
      </footer>
    </div>
  );
}

// ─── Sub-component ───

function LogIcon({ status }: { status: TerminalLog["status"] }) {
  const size = "w-3 h-3 shrink-0 mt-[3px]";
  switch (status) {
    case "success":
      return <CheckCircle2 className={`${size} text-[var(--accent-success)]`} />;
    case "error":
      return <AlertCircle className={`${size} text-[var(--accent-danger)]`} />;
    case "warning":
      return <AlertCircle className={`${size} text-[var(--accent-warning)]`} />;
    default:
      return <Info className={`${size} text-[var(--text-muted)]`} />;
  }
}
