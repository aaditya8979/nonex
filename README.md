# ⚡ Apex Value Engine
**The Deterministic Project-to-Income Framework**

![VibeHack](https://img.shields.io/badge/Hackathon-VibeHack_2026-06b6d4?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js_14-Edge_Runtime-black?style=for-the-badge&logo=nextdotjs)
![React Three Fiber](https://img.shields.io/badge/3D-React_Three_Fiber-black?style=for-the-badge)

## 🎯 Overview
The **Apex Value Engine** tackles **Problem Statement 02: Project-to-Income Engine**. 

Most student projects die in GitHub repositories because developers lack market validation and pricing intuition. Apex bridges this gap by acting as a deterministic software factory. It ingests a project description, autonomously scrapes live market data for competitors, and utilizes an AI reasoning core to output a mathematically grounded business plan, target avatar, and pricing matrix.

This is not a conversational chatbot. It is an institutional-grade quantitative analysis terminal designed for zero hallucination.

## ✨ Core USPs & Architecture
* **Ground-Truth Market Integration:** Before AI processing begins, the engine retrieves live competitor pricing and target demographic data from HackerNews and related SaaS forums to establish a mathematical baseline.
* **Deterministic Asynchronous Swarm:** Hosted on the Next.js Edge Runtime, the system dispatches parallel agentic requests to calculate Monthly Recurring Revenue (MRR) and formulate monetization strategies simultaneously, streaming the JSON directly to the frontend.
* **Institutional UI/UX:** Built with a high-performance "Bento Box" CSS Grid, featuring an interactive `Recharts` data visualization and a responsive, hardware-accelerated `React-Three-Fiber` mathematical particle background.

## 🛠️ Technology Stack
* **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion
* **3D & Visualization:** Three.js, React Three Fiber, Recharts
* **Backend / Orchestration:** Next.js Edge API Routes, Vercel AI SDK
* **Agentic Core:** OpenRouter API (Claude 3 Haiku for ultra-low latency)
* **Data Validation:** Zod (Strict JSON Schema Enforcement)

---

## 📜 AI Bill of Materials (Disclosure)
In strict compliance with **VibeHack Fair Play Rules (Rule 5)**, our team fully discloses the use of AI in the development of this platform:

1. **Architecture & UI Scaffolding:** AI coding assistants (Claude 3.5 Sonnet / Antigravity) were utilized to rapidly prototype the Tailwind CSS Bento Box layouts, React state management, and the Three.js canvas integration.
2. **Reasoning Engine (Live Application):** The live application utilizes the OpenRouter API (running Anthropic's Claude 3 Haiku model) as the "Architect-Reviewer" reasoning core to process scraped data and deterministically generate the pricing tiers and MRR predictions.
3. **Prompt Engineering:** Strict XML-tagged system prompts and Zod JSON schemas are used to strip the AI of conversational freedom, forcing it into a data-processing role.

---

## 🚀 Local Deployment Instructions

To run the Apex Value Engine locally on your machine:

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_GITHUB_USERNAME/nonex.git](https://github.com/YOUR_GITHUB_USERNAME/nonex.git)
cd nonex
```
### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
```bash
## Create a .env.local file in the root directory. You will need an OpenRouter API key to run the reasoning engine.
OPENROUTER_API_KEY=your_openrouter_api_key_here
```
### 4. Run the Development Server
```bash
npm run dev
Open http://localhost:3000 with your browser to view the terminal.
```
## 🔮 Future Scope
The next iteration of the Apex Value Engine will deprecate cloud-based LLM APIs. The reasoning core will be transitioned to run locally via Ollama using quantized models (e.g., Llama 3 8B) on unified memory architectures to ensure 100% data privacy, zero recurring API costs, and absolute offline resilience.
