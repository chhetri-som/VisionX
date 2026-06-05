export function WatermarkingIntro({ onExplore }) {
  return (
    <section style={{
      padding: "80px 60px",
      borderTop: "1px solid var(--border)",
      background: "var(--bg-primary)",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Background accent */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 500, height: 500,
        background: "radial-gradient(ellipse at top right, rgba(174,183,132,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 48, flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em",
              color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 12,
              border: "1px solid var(--border)", padding: "4px 10px",
            }}>
              <span style={{ color: "var(--amber)", fontSize: 10 }}>◆</span>
              RESEARCH · PREPRINT 2026
            </div>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800,
              color: "var(--text-primary)", lineHeight: 1.1, marginBottom: 0,
            }}>
              Invisible Stamps for<br />
              <span style={{ color: "var(--cyan)" }}>AI-Generated Video</span>
            </h2>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>

          {/* Left: explainer */}
          <div>
            <p style={{
              fontFamily: "var(--font-ui)", fontSize: 16, color: "var(--text-secondary)",
              lineHeight: 1.8, marginBottom: 24,
            }}>
              How do you prove a video was made by AI — even after someone tries to hide that fact?
              This research proposes hiding an invisible, encrypted "signature" inside AI-generated videos,
              split across hundreds of frames like pieces of a puzzle.
            </p>
            <p style={{
              fontFamily: "var(--font-ui)", fontSize: 16, color: "var(--text-secondary)",
              lineHeight: 1.8, marginBottom: 36,
            }}>
              No single frame gives anything away. Only a trusted detector with the right secret key
              can reassemble the pieces and verify the video's true origin.
            </p>

            <button
              onClick={onExplore}
              className="btn-primary"
              style={{ fontSize: 12, padding: "14px 36px", letterSpacing: "0.12em" }}
            >
              EXPLORE MORE →
            </button>
          </div>

          {/* Right: 4 pillars preview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { icon: "⏱", label: "Temporal Split", desc: "Signal spread across all frames", color: "var(--cyan)" },
              { icon: "🔑", label: "Secret Key", desc: "Only auth. detectors can read it", color: "var(--amber)" },
              { icon: "🔐", label: "Encrypted", desc: "AES-256 military-grade cipher", color: "var(--green)" },
              { icon: "✍️", label: "Signed", desc: "Cryptographic identity proof", color: "var(--red)" },
            ].map((p, i) => (
              <div key={i} className="panel" style={{
                padding: "16px 18px",
                borderLeft: `2px solid ${p.color}`,
              }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{p.icon}</div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 9,
                  color: p.color, letterSpacing: "0.12em", marginBottom: 4,
                }}>{p.label}</div>
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 12,
                  color: "var(--text-tertiary)", lineHeight: 1.5,
                }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div style={{
          marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 12,
          fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)",
          letterSpacing: "0.1em",
        }}>
          <span style={{ color: "var(--cyan)", fontSize: 14 }}>●</span>
          This research directly informs VisionX's video provenance pipeline · Click Explore More for a full breakdown
        </div>

      </div>
    </section>
  );
}