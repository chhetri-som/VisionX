export const ProcessingScreen = ({ progress, frameIndex }) => {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 2, padding: 24,
    }}>
      {/* Frame carousel */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, overflow: "hidden" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            flex: "0 0 80px", height: 54, borderRadius: 1,
            background: i === frameIndex % 8 ? "var(--bg-panel)" : "var(--bg-raised)",
            border: i === frameIndex % 8 ? "1px solid var(--cyan)" : "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)",
            transition: "all 0.15s",
          }}>
            {i === frameIndex % 8 ? (
              <span style={{ color: "var(--cyan)" }}>FRAME {128 * i + Math.floor(Math.random() * 30)}</span>
            ) : (
              <span>░░░</span>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", letterSpacing: "0.12em" }}>
            DECONSTRUCTING FRAMES (VLM INFERENCE)...
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
            {Math.floor(progress)}%
          </span>
        </div>
        <div style={{ height: 4, background: "var(--bg-panel)", borderRadius: 1, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "linear-gradient(90deg, var(--cyan-dim), var(--cyan))",
            boxShadow: "0 0 10px var(--cyan)",
            transition: "width 0.1s linear",
          }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
          Awaiting Qwen3-VL-4B sequence evaluation...
        </div>
      </div>
    </div>
  );
};