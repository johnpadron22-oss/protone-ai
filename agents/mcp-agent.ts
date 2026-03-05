/**
 * MCP Agent — "Aiden"
 *
 * An in-process MCP server that exposes ProTone-specific developer tools,
 * plus an AgentDefinition that the orchestrator can dispatch work to.
 *
 * In-process tools (no separate process required):
 *   • probe_env       – check which env vars are present
 *   • validate_schema – validate a JSON payload against the API contract
 *   • build_check     – run `next build` and return pass/fail + errors
 *   • rewrite_preview – call POST /api/rewrite locally and return the result
 *
 * External MCP servers (require the target binary to be installed):
 *   • Filesystem MCP  – deep file read/write via @modelcontextprotocol/server-filesystem
 *   • Playwright MCP  – browser automation via @playwright/mcp (optional)
 */

import {
  tool,
  createSdkMcpServer,
  query,
  type AgentDefinition,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// In-process MCP tools
// ---------------------------------------------------------------------------

const probeEnvTool = tool(
  "probe_env",
  "Check which environment variables required by ProTone AI are present (values are hidden).",
  {
    vars: z
      .array(z.string())
      .default(["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "NODE_ENV"])
      .describe("List of env var names to probe"),
  },
  async ({ vars }) => {
    const report = vars.map((name) => ({
      name,
      present: Boolean(process.env[name]),
    }));
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  }
);

const validateSchemaTool = tool(
  "validate_schema",
  "Validate a JSON payload against the ProTone /api/rewrite input or output schema. " +
    "Returns a list of validation errors or an empty array if valid.",
  {
    schema_type: z
      .enum(["input", "output"])
      .describe("Which schema to validate against"),
    payload: z.string().describe("JSON string to validate"),
  },
  async ({ schema_type, payload }) => {
    const InputSchema = z.object({
      draft: z.string().min(1),
      context: z.string().min(1),
      tone: z.string().min(1),
      length: z.enum(["Keep", "Shorter", "Slightly longer"]).default("Keep"),
    });

    const OutputSchema = z.object({
      rewritten: z.string(),
      notes: z.array(z.string()).default([]),
      tone: z.string(),
      subject_lines: z.array(z.string()).optional(),
      risk_flags: z.array(z.string()).optional(),
      cta: z.string().optional(),
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ error: "Invalid JSON" }) },
        ],
      };
    }

    const schema = schema_type === "input" ? InputSchema : OutputSchema;
    const result = schema.safeParse(parsed);

    const out = result.success
      ? { valid: true, errors: [] }
      : {
          valid: false,
          errors: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }],
    };
  }
);

const buildCheckTool = tool(
  "build_check",
  "Run `next build` in the ProTone project root and return whether it succeeded, " +
    "plus any TypeScript or compilation errors.",
  {
    cwd: z
      .string()
      .default(process.cwd())
      .describe("Project root directory (defaults to cwd)"),
  },
  async ({ cwd }) => {
    try {
      const output = execSync("npx next build 2>&1", {
        cwd,
        timeout: 120_000,
        encoding: "utf8",
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, output: output.slice(-3000) }),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              output: (err.stdout ?? err.message ?? "").slice(-3000),
            }),
          },
        ],
      };
    }
  }
);

const rewritePreviewTool = tool(
  "rewrite_preview",
  "Call the running ProTone /api/rewrite endpoint and return the full JSON response. " +
    "The dev server must be running on the specified port.",
  {
    draft: z.string().min(1).describe("Email draft to rewrite"),
    context: z
      .string()
      .default("Client Email")
      .describe("Context type (e.g. Client Email, Slack/Teams Message)"),
    tone: z
      .string()
      .default("Professional")
      .describe("Desired tone (e.g. Professional, Concise, Firm)"),
    length: z
      .enum(["Keep", "Shorter", "Slightly longer"])
      .default("Keep"),
    port: z.number().default(3000).describe("Port the dev server is on"),
  },
  async ({ draft, context, tone, length, port }) => {
    try {
      const res = await fetch(`http://localhost:${port}/api/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, context, tone, length }),
        signal: AbortSignal.timeout(30_000),
      });
      const body = res.ok ? await res.json() : await res.text();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ status: res.status, body }, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: err.message }),
          },
        ],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// In-process MCP server factory
// ---------------------------------------------------------------------------

export function createAidenMcpServer() {
  return createSdkMcpServer({
    name: "aiden-protone",
    tools: [probeEnvTool, validateSchemaTool, buildCheckTool, rewritePreviewTool],
  });
}

// ---------------------------------------------------------------------------
// External MCP server configs (require the binaries to be installed)
// ---------------------------------------------------------------------------

/** Filesystem MCP server — gives Aiden deep read/write access to the project. */
export const filesystemMcpServer = {
  command: "npx",
  args: [
    "@modelcontextprotocol/server-filesystem",
    path.resolve(process.cwd()),
  ],
};

/** Playwright MCP server — optional, for browser-based testing/scraping. */
export const playwrightMcpServer = {
  command: "npx",
  args: ["@playwright/mcp@latest"],
};

// ---------------------------------------------------------------------------
// Aiden — AgentDefinition for orchestrator use
// ---------------------------------------------------------------------------

export const aidenAgent: AgentDefinition = {
  description:
    "Aiden: ProTone's MCP-powered DevOps agent. " +
    "Validates schemas, checks builds, probes env vars, and previews rewrite output. " +
    "Use Aiden for diagnostics, QA, and cross-cutting developer tasks.",

  prompt: `
You are Aiden, the MCP-powered developer assistant for ProTone AI.

## Your capabilities (via MCP tools)
- probe_env        – verify which API keys and env vars are set
- validate_schema  – check that a JSON payload matches the /api/rewrite contract
- build_check      – run \`next build\` and report errors
- rewrite_preview  – call the running API to preview actual rewrite output

## When to use each tool
| Task                               | Tool              |
|------------------------------------|-------------------|
| "Is OPENAI_API_KEY set?"           | probe_env         |
| "Does this payload match schema?"  | validate_schema   |
| "Does the project build?"          | build_check       |
| "What does the API return for X?"  | rewrite_preview   |

## Guidelines
- Always run probe_env first when diagnosing API or auth errors
- Run build_check after any backend change to confirm no regressions
- Use validate_schema before suggesting the user send a payload to the API
- Report results clearly: include the raw tool output and a plain-language summary
`.trim(),

  // Aiden's tools are provided via the in-process MCP server;
  // the orchestrator wires them up via mcpServers.
  tools: ["Read", "Glob"],
};

// ---------------------------------------------------------------------------
// Standalone runner (for direct use outside the orchestrator)
// ---------------------------------------------------------------------------

export async function runAiden(prompt: string): Promise<void> {
  const server = createAidenMcpServer();

  for await (const message of query({
    prompt,
    options: {
      cwd: process.cwd(),
      allowedTools: ["Read", "Glob", "Grep"],
      mcpServers: {
        aiden: server,
      },
      systemPrompt: aidenAgent.prompt,
      maxTurns: 20,
    },
  })) {
    if ("result" in message) {
      console.log("\n[Aiden]\n" + message.result);
    }
  }
}
