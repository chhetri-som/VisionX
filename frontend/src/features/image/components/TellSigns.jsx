const STRIP_RE = /^[\s]*[✅❌⚠️ℹ️🟢🔴🟡]+[\s]*/u;

const parseFindings = (findings) =>
  findings.map((text) => {
    const t    = String(text || "");
    const ok   = /✅|🟢/.test(t);
    const bad  = /❌|🔴/.test(t);
    const warn = /⚠️/.test(t);
    return {
      ok,
      bad,
      warn,
      neutral: !ok && !bad && !warn,
      label: t.replace(STRIP_RE, "").trim(),
    };
  });

export const TellSigns = ({ findings, label }) => {
  // If no findings yet, show an empty state rather than dummy data
  if (!Array.isArray(findings) || findings.length === 0) {
    return (
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--text-dim)",
        textAlign: "center",
        padding: "12px 0",
      }}>
        No classifier output available
      </div>
    );
  }

  const items = parseFindings(findings);

  // Derive accent from label prop for the verdict pill
  const labelColor = label === "fake"
    ? { bg: "var(--red-ghost)",   border: "rgba(184,76,58,0.2)",   text: "var(--red)"   }
    : label === "uncertain"
    ? { bg: "rgba(184,134,11,0.08)", border: "rgba(184,134,11,0.2)", text: "var(--amber)" }
    : { bg: "var(--green-ghost)", border: "rgba(92,138,60,0.2)",   text: "var(--green)" };

  const labelText = label === "fake"
    ? "SYNTHETIC ORIGIN LIKELY"
    : label === "uncertain"
    ? "RESULT INCONCLUSIVE"
    : "NO MANIPULATION DETECTED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

      {/* Verdict pill */}
      {label && (
        <div style={{
          padding: "8px 12px",
          background: labelColor.bg,
          border: `1px solid ${labelColor.border}`,
          borderRadius: 3,
          marginBottom: 4,
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            color: labelColor.text,
            letterSpacing: "0.1em",
          }}>
            {labelText}
          </span>
        </div>
      )}

      {/* Individual finding rows */}
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            padding: "8px 12px",
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: 3,
          }}
        >
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            letterSpacing: "0.02em",
          }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};