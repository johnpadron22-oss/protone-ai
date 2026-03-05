import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic();

const REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    rewritten: {
      type: 'string',
      description: 'The fully rewritten email in the requested tone'
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Observations about changes made and why'
    },
    tone: {
      type: 'string',
      description: 'The tone applied to the rewritten email'
    },
    subject_lines: {
      type: 'array',
      items: { type: 'string' },
      description: 'Two or three alternative subject line suggestions'
    },
    risk_flags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Potential issues in the original draft (e.g. "Overpromises timeline", "Missing CTA", "Unclear ask")'
    },
    cta: {
      type: 'string',
      description: 'A concise call-to-action suggestion for the email'
    }
  },
  required: ['rewritten', 'notes', 'tone', 'subject_lines', 'risk_flags', 'cta'],
  additionalProperties: false
};

app.post('/api/rewrite', async (req, res) => {
  const { draft, tone } = req.body;

  if (!draft || typeof draft !== 'string' || draft.trim().length === 0) {
    return res.status(400).json({ error: 'draft is required' });
  }
  if (!tone || typeof tone !== 'string') {
    return res.status(400).json({ error: 'tone is required' });
  }

  const systemPrompt = `You are an expert business writing coach. Your job is to rewrite email drafts to match a specific professional tone while preserving the core message and intent.

Available tones:
- Manager: Direct, authoritative, yet supportive. Focuses on action items and clear expectations.
- Support: Empathetic, clear, and solution-oriented. Warm but professional.
- Sales: Persuasive, energetic, and action-driven. Focuses on value and next steps.
- Executive: Brief, strategic, and high-level. No fluff — every word counts.
- Formal Client: Strictly professional, structured, and polished. Formal salutations and closings.
- Simple Client: Warm, accessible, and jargon-free. Friendly and approachable.

Always respond with a valid JSON object matching the provided schema.`;

  const userPrompt = `Rewrite the following email draft in the "${tone}" tone.

Original draft:
"""
${draft.trim()}
"""

Return a JSON object with:
- rewritten: the polished email
- notes: 2-4 bullet observations about what you changed and why
- tone: the tone label you applied (e.g. "${tone}")
- subject_lines: 2-3 alternative subject line options
- risk_flags: any issues in the ORIGINAL draft (e.g. "Missing clear ask", "Overpromises timeline", "Missing CTA", "Unprofessional language")
- cta: a concise call-to-action recommendation`;

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: {
          type: 'json_schema',
          name: 'email_rewrite',
          schema: REWRITE_SCHEMA
        }
      }
    });

    const message = await stream.finalMessage();
    const textBlock = message.content.find(b => b.type === 'text');

    if (!textBlock) {
      return res.status(500).json({ error: 'No text response from model' });
    }

    const result = JSON.parse(textBlock.text);
    res.json(result);
  } catch (err) {
    console.error('Claude API error:', err);
    if (err instanceof Anthropic.AuthenticationError) {
      res.status(401).json({ error: 'Invalid API key. Set ANTHROPIC_API_KEY in your .env file.' });
    } else if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'Rate limited. Please try again shortly.' });
    } else {
      res.status(500).json({ error: 'Failed to rewrite email. Please try again.' });
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ProTone API server running on http://localhost:${PORT}`);
});
