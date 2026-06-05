export const KeyFramesGrid = ({ keyFrames, selectedFrame, onSelectFrame }) => {
  return (
    <div>
      <div className="section-label" style={{ marginBottom: 10 }}>KEY EVIDENCE FRAMES</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {keyFrames.map((f, i) => (
          <div
            key={i}
            onClick={() => onSelectFrame(f)}
            style={{
              background: "var(--bg-surface)",
              border: `1px solid ${selectedFrame?.frame === f.frame ? "var(--red)" : "var(--border)"}`,
              borderRadius: 1, padding: 10, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--red)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = selectedFrame?.frame === f.frame ? "var(--red)" : "var(--border)"}
          >
            <div style={{ height: 50, background: "var(--bg-raised)", borderRadius: 1, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {f.image_base64 ? (
                  <img 
                    src={f.image_base64} 
                    alt={`Frame ${f.frame}`} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
              ) : (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)" }}>F{f.frame}</span>
              )}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)" }}>{f.t}s</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)", marginTop: 2 }}>{f.score.toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};