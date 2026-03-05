"use client";
import { useMemo, useState } from "react";
type RewriteResult = {
  rewritten: string;
  notes: string[];
  tone: string;
  subject_lines?: string[];
  risk_flags?: string[];
  cta?: string;
};
const CONTEXTS = [
  "Client Email",
  "Internal Email",
  "Slack/Teams Message",
  "Sales Follow-up",
  "Customer Support Response",
] as const;
const TONES = ["Professional", "Concise", "Executive", "Friendly", "Firm"] as const;
const LENGTHS = ["Keep", "Shorter", "Slightly longer"] as const;
export default function Page() {
  const [draft, setDraft] = useState(
    "Good afternoon Mitchell,\n\nThank you for the explanation. We were actually hoping to see if we are able to accept payment for the change order via credit card instead.\n\nPlease let me know if you would like to proceed.\n\nSincerely,\nJonathan"
  );
  const [context, setContext] = useState<(typeof CONTEXTS)[number]>("Client Email");
  const [tone, setTone] = useState<(typeof TONES)[number]>("Professional");
  const [length, setLength] = useState<(typeof LENGTHS)[number]>("Keep");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canRewrite = useMemo(() => draft.trim().length > 0, [draft]);
  async function onRewrite() {
    if (!canRewrite) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, context, tone, length }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed: ${res.status}`);
      }
      const data = (await res.json()) as RewriteResult;
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>ProTone MVP</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Grammarly-style rewrites optimized for business tone, clarity, and next steps.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 18,
        }}
      >
        {/* LEFT */}
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Your Draft</h2>
            <button
              onClick={onRewrite}
              disabled={!canRewrite || loading}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #111827",
                background: loading ? "#f3f4f6" : "#111827",
                color: loading ? "#111827" : "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Rewriting..." : "Rewrite"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Context</span>
              <select value={context} onChange={(e) => setContext(e.target.value as any)} style={selectStyle}>
                {CONTEXTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Tone</span>
              <select value={tone} onChange={(e) => setTone(e.target.value as any)} style={selectStyle}>
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Length</span>
              <select value={length} onChange={(e) => setLength(e.target.value as any)} style={selectStyle}>
                {LENGTHS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste your email / Slack message here..."
            style={{
              width: "100%",
              marginTop: 12,
              minHeight: 330,
              resize: "vertical",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          />
          {error ? (
            <p style={{ marginTop: 10, color: "#b91c1c", whiteSpace: "pre-wrap" }}>{error}</p>
          ) : null}
        </section>
        {/* RIGHT */}
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>ProTone Output</h2>
            {result?.rewritten ? (
              <button onClick={() => copy(result.rewritten)} style={ghostButtonStyle}>
                Copy rewrite
              </button>
            ) : null}
          </div>
          {!result ? (
            <div style={{ marginTop: 18, opacity: 0.7 }}>
              <p>Pick context + tone, then click <b>Rewrite</b>.</p>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                <li>Clarifies your ask</li>
                <li>Fixes tone</li>
                <li>Makes next steps obvious</li>
              </ul>
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <h3 style={cardTitleStyle}>Rewrite</h3>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Tone: {result.tone}</span>
                </div>
                <pre style={preStyle}>{result.rewritten}</pre>
              </div>
              {result.subject_lines?.length ? (
                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <h3 style={cardTitleStyle}>Subject lines</h3>
                    <button onClick={() => copy(result.subject_lines!.join("\n"))} style={ghostButtonStyle}>
                      Copy
                    </button>
                  </div>
                  <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                    {result.subject_lines.map((s, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.notes?.length ? (
                <div style={cardStyle}>
                  <h3 style={cardTitleStyle}>What improved</h3>
                  <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                    {result.notes.map((n, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.cta ? (
                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <h3 style={cardTitleStyle}>Suggested CTA</h3>
                    <button onClick={() => copy(result.cta!)} style={ghostButtonStyle}>
                      Copy
                    </button>
                  </div>
                  <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{result.cta}</p>
                </div>
              ) : null}
              {result.risk_flags?.length ? (
                <div style={cardStyle}>
                  <h3 style={cardTitleStyle}>Risk flags</h3>
                  <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                    {result.risk_flags.map((r, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
      <footer style={{ marginTop: 18, fontSize: 12, opacity: 0.65 }}>
        Tip: Start with &quot;Concise + Client Email&quot; for sales follow-ups.
      </footer>
    </main>
  );
}
const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "white",
};
const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
};
const cardTitleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700 };
const preStyle: React.CSSProperties = {
  marginTop: 10,
  whiteSpace: "pre-wrap",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  fontSize: 13,
  lineHeight: 1.4,
};
const ghostButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
  fontSize: 12,
};
