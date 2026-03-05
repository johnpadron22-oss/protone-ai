/**
 * ProTone AI — Multi-Agent Orchestrator
 *
 * Routes developer tasks to the right specialist subagent:
 *
 *   Frontend agent  – React/Next.js UI work (app/page.tsx, app/layout.tsx)
 *   Backend agent   – API routes & OpenAI integration (app/api/**)
 *   Aiden (MCP)     – Diagnostics, schema validation, build checks, API preview
 *
 * The orchestrator itself reads the task, decides which agent(s) to call via
 * the built-in `Agent` tool, and synthesises a final answer.
 *
 * Usage:
 *   import { runOrchestrator } from "./orchestrator";
 *   await runOrchestrator("Add a character counter to the draft textarea");
 */

import { query, type HookCallback } from "@anthropic-ai/claude-agent-sdk";
import { frontendAgent } from "./frontend-agent";
import { backendAgent } from "./backend-agent";
import { aidenAgent, createAidenMcpServer } from "./mcp-agent";

// ---------------------------------------------------------------------------
// Logging hook — records which subagent is invoked and when
// ---------------------------------------------------------------------------

const logAgentCall: HookCallback = async (input: any) => {
  const toolName: string = input?.tool_name ?? "";
  if (toolName === "Agent") {
    const agentName: string = input?.tool_input?.agent ?? "unknown";
    const subPrompt: string = (input?.tool_input?.prompt ?? "").slice(0, 120);
    console.log(`\n[orchestrator] → dispatching to "${agentName}": ${subPrompt}…`);
  }
  return {};
};

// ---------------------------------------------------------------------------
// Orchestrator system prompt
// ---------------------------------------------------------------------------

const ORCHESTRATOR_SYSTEM = `
You are the ProTone AI development orchestrator. You receive developer tasks and
delegate them to the right specialist subagent.

## Available agents

| Agent          | When to use                                                          |
|----------------|----------------------------------------------------------------------|
| frontend       | React components, styling, client-side state, UX improvements        |
| backend        | API routes, OpenAI SDK changes, Zod schemas, server-side error handling |
| aiden          | Build checks, env var probing, schema validation, live API preview   |

## Routing rules
1. If a task clearly belongs to one agent, dispatch it directly.
2. If a task spans frontend + backend (e.g. "add a new field end-to-end"),
   call backend first, then frontend.
3. After any code change, call aiden's build_check to confirm the build passes.
4. Summarise what each agent did and the final outcome.

## Response format
- Be concise. No filler.
- If the task is ambiguous, state your interpretation before delegating.
- After all agents finish, give a 2-3 sentence summary of what was done.
`.trim();

// ---------------------------------------------------------------------------
// Main orchestrator runner
// ---------------------------------------------------------------------------

export async function runOrchestrator(task: string): Promise<void> {
  const aidenServer = createAidenMcpServer();

  console.log(`\n[orchestrator] Task: ${task}\n${"─".repeat(60)}`);

  for await (const message of query({
    prompt: task,
    options: {
      cwd: process.cwd(),

      // The orchestrator itself only needs to read files and spawn subagents
      allowedTools: ["Read", "Glob", "Grep", "Agent"],

      // Wire up Aiden's in-process MCP server so subagent tools work
      mcpServers: {
        aiden: aidenServer,
      },

      systemPrompt: ORCHESTRATOR_SYSTEM,

      // Subagent definitions — the orchestrator can call these via the Agent tool
      agents: {
        frontend: frontendAgent,
        backend: backendAgent,
        aiden: aidenAgent,
      },

      // Hooks
      hooks: {
        PreToolUse: [{ matcher: "Agent", hooks: [logAgentCall] }],
      },

      // Reasonable ceiling; complex tasks may need more turns
      maxTurns: 40,

      // Use Opus 4.6 for the orchestrator layer
      model: "claude-opus-4-6",
    },
  })) {
    if ("result" in message) {
      console.log(`\n[orchestrator] Done:\n${message.result}`);
    }
  }
}
