import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const REWRITE_SCHEMA = {
  type: "object" as const,
  properties: {
    rewritten: {
      type: "string" as const,
      description: "The fully rewritten email in the requested tone",
    },
    notes: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Observations about changes made and why",
    },
    tone: {
      type: "string" as const,
      description: "The tone applied to the rewritten email",
    },
    subject_lines: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Two or three alternative subject line suggestions",
    },
    risk_flags: {
      type: "array" as const,
      items: { type: "string" as const },
      description:
        'Potential issues in the original draft (e.g. "Overpromises timeline", "Missing CTA", "Unclear ask", "Too informal")',
    },
    cta: {
      type: "string" as const,
      description: "A concise call-to-action suggestion for the email",
    },
  },
  required: [
    "rewritten",
    "notes",
    "tone",
    "subject_lines",
    "risk_flags",
    "cta",
  ] as const,
  additionalProperties: false as const,
};

export async function POST(req: NextRequest) {
  let body: { draft?: string; context?: string; tone?: string; length?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { draft, context, tone, length } = body;

  if (!draft || typeof draft !== "string" || draft.trim().length === 0) {
    return NextResponse.json({ error: "draft is required" }, { status: 400 });
  }

  const toneLabel = tone ?? "Professional";
  const contextLabel = context ?? "Client Email";
  const lengthPref = length ?? "Keep";

  const systemPrompt = `You are an expert business writing coach. Your job is to rewrite email and message drafts to match a specific professional tone while preserving the core message and intent.

Context types:
- Client Email: External-facing, polished, professional
- Internal Email: Collegial but clear, direct
- Slack/Teams Message: Informal but professional, concise
- Sales Follow-up: Persuasive, value-driven, action-oriented
- Customer Support Response: Empathetic, solution-focused, clear

Tones:
- Professional: Polished, confident, courteous
- Concise: Stripped to essentials, no filler
- Executive: Brief, strategic, high-level
- Friendly: Warm, approachable, personable
- Firm: Direct, assertive, no-nonsense

Length preference:
- Keep: Maintain roughly the same length
- Shorter: Cut unnecessary words, be more concise
- Slightly longer: Add helpful context or smoother transitions

Always respond with valid JSON matching the provided schema.`;

  const userPrompt = `Rewrite the following draft.

Context: ${contextLabel}
Tone: ${toneLabel}
Length: ${lengthPref}

Original draft:
"""
${draft.trim()}
"""

Return a JSON object with:
- rewritten: the polished version
- notes: 2-4 observations about what you changed and why
- tone: "${toneLabel}"
- subject_lines: 2-3 alternative subject line options
- risk_flags: any issues in the ORIGINAL draft (e.g. "Missing clear ask", "Overpromises timeline", "Missing CTA", "Unprofessional language", "Too vague")
- cta: a concise call-to-action recommendation`;

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-6" as any,
      max_tokens: 2048,
      thinking: { type: "adaptive" } as any,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema",
          name: "email_rewrite",
          schema: REWRITE_SCHEMA,
        },
      },
    } as any);

    const message = await stream.finalMessage();
    const textBlock = message.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );

    if (!textBlock) {
      return NextResponse.json(
        { error: "No text response from model" },
        { status: 500 }
      );
    }

    const result = JSON.parse(textBlock.text);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Claude API error:", err);

    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Invalid API key. Set ANTHROPIC_API_KEY environment variable." },
        { status: 401 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited. Please try again shortly." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Failed to rewrite email. Please try again." },
      { status: 500 }
    );
  }
}
