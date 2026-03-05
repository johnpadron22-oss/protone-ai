#!/usr/bin/env tsx
/**
 * CLI entry point for the ProTone AI multi-agent system.
 *
 * Usage:
 *   npm run agents -- "Add a character counter to the draft textarea"
 *   npm run agents:frontend -- "Make the Rewrite button pulse while loading"
 *   npm run agents:backend  -- "Add a /api/health route"
 *   npm run agents:aiden    -- "Check if OPENAI_API_KEY is set and run a build check"
 */

import { runOrchestrator } from "./orchestrator";
import { runAiden } from "./mcp-agent";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { frontendAgent } from "./frontend-agent";
import { backendAgent } from "./backend-agent";

const [, , mode, ...rest] = process.argv;

// When invoked as `npm run agents:frontend -- "..."` the mode is the script name;
// strip it out if it was injected by npm.
function getPrompt(args: string[]): string {
  const prompt = args.join(" ").trim();
  if (!prompt) {
    console.error("Usage: npm run agents -- \"<task description>\"");
    process.exit(1);
  }
  return prompt;
}

async function runSingleAgent(
  agentDef: ReturnType<typeof frontendAgent extends infer T ? () => T : never>,
  prompt: string,
  label: string
): Promise<void> {
  console.log(`\n[${label}] Task: ${prompt}\n${"─".repeat(60)}`);
  for await (const message of query({
    prompt,
    options: {
      cwd: process.cwd(),
      allowedTools: agentDef.tools ?? ["Read", "Write", "Edit", "Glob", "Grep"],
      systemPrompt: agentDef.prompt,
      model: "claude-opus-4-6",
      maxTurns: 30,
    },
  })) {
    if ("result" in message) {
      console.log(`\n[${label}] Done:\n${message.result}`);
    }
  }
}

const task = getPrompt(rest.length ? rest : [mode]);

switch (mode) {
  case "frontend":
    await runSingleAgent(frontendAgent as any, task, "frontend");
    break;

  case "backend":
    await runSingleAgent(backendAgent as any, task, "backend");
    break;

  case "aiden":
    await runAiden(task);
    break;

  default:
    // No mode flag — run the full orchestrator
    await runOrchestrator(mode ? [mode, ...rest].join(" ") : task);
    break;
}
