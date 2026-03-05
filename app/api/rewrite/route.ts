import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const BodySchema = z.object({
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

function systemPrompt() {
  return `
You are ProTone: a business writing assistant.

GOAL:
Rewrite user text to be clear, professional, and appropriate for business communication.
Preserve meaning. Do NOT invent facts, pricing, timelines, or policies.

STYLE RULES:
- Make the ask/next-step explicit (CTA).
- Reduce fluff. Prefer clarity.
- Keep a respectful business tone.
- Use short paragraphs and readable formatting.
- If the user text is an email, keep greeting/sign-off if present.
- If the user text is a Slack message, keep it shorter and more direct.
- If missing key info, don't guess; add a neutral placeholder like [confirm date] only if necessary.

OUTPUT:
Return ONLY valid JSON with this shape:
{
  "rewritten": string,
  "notes": string[],
  "tone": string,
  "subject_lines"?: string[],
  "risk_flags"?: string[],
  "cta"?: string
}

RISK FLAGS examples:
- "Missing clear ask"
- "Too passive"
- "Too blunt"
- "Overly wordy"
- "Could be interpreted as accusatory"
`.trim();
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const input = `
CONTEXT: ${body.context}
DESIRED_TONE: ${body.tone}
LENGTH: ${body.length}

DRAFT:
${body.draft}
`.trim();

    const response = await getClient().responses.create({
      model: "gpt-5.2",
      input: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: input },
      ],
    });

    const text = response.output_text?.trim() ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return new Response(
        `Model returned non-JSON output. Got:\n\n${text}`,
        { status: 500 }
      );
    }

    const out = OutputSchema.parse(parsed);
    return Response.json(out);
  } catch (err: any) {
    const msg =
      err?.issues ? JSON.stringify(err.issues, null, 2) : (err?.message ?? "Unknown error");
    return new Response(msg, { status: 400 });
  }
}
