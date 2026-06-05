export const FrameEvidenceModal = ({ selectedFrame, onClose }) => {
  if (!selectedFrame) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(7,10,15,0.92)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="panel scanline-container"
        style={{ width: 480, padding: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span className="section-label">FRAME EVIDENCE</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12 }}
          >✕ CLOSE</button>
        </div>

        <div style={{ height: 220, background: "var(--bg-raised)", borderRadius: 1, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", overflow: "hidden" }}>
          {selectedFrame.image_base64 ? (
            <img 
                src={selectedFrame.image_base64} 
                alt={`Frame ${selectedFrame.frame}`} 
                style={{ width: "100%", height: "100%", objectFit: "contain" }} 
            />
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--red)", marginBottom: 8 }}>F{selectedFrame.frame}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>FACIAL MESH PREVIEW</div>
            </div>
          )}
        </div>

        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.06em", marginBottom: 8 }}>
          <span style={{ color: "var(--cyan)" }}>t={selectedFrame.t}s</span> · FRAME #{selectedFrame.frame}
        </div>
        
        <div style={{
          background: selectedFrame.score > 60 ? "var(--red-ghost)" : "var(--bg-raised)", 
          border: `1px solid ${selectedFrame.score > 60 ? "rgba(255,45,85,0.2)" : "var(--border)"}`,
          borderRadius: 1, padding: "12px 14px",
          fontFamily: "var(--font-mono)", fontSize: 12, 
          color: selectedFrame.score > 60 ? "var(--red)" : "var(--text-primary)",
          marginBottom: 16, lineHeight: 1.5,
        }}>
          {selectedFrame.score > 60 ? "⚠ " : ""}{selectedFrame.reason}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, background: "var(--bg-raised)", padding: "10px 12px", borderRadius: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: selectedFrame.score > 60 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>
              {selectedFrame.score.toFixed(0)}%
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.1em", marginTop: 2 }}>CONFIDENCE</div>
          </div>
          <div style={{ flex: 1, background: "var(--bg-raised)", padding: "10px 12px", borderRadius: 1, textAlign: "center" }}>
            <span className={`tag ${selectedFrame.score > 60 ? "tag-red" : "tag-green"}`} style={{ fontSize: 11 }}>
              {selectedFrame.score > 60 ? "HIGH RISK" : "CLEAN"}
            </span>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.1em", marginTop: 8 }}>SEVERITY</div>
          </div>
        </div>
      </div>
    </div>
  );
};