import { ConfidenceGauge } from "../../../common/ConfidenceGauge";

export const ResultsSidebar = ({ verdict, frameStats, events }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span className="section-label">OVERALL VERDICT</span>
        <ConfidenceGauge value={verdict.score} />
        <div style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "center", textTransform: "uppercase" }}>
          {verdict.label}
        </div>
        <div style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "center" }}>
          {frameStats.suspicious} of {frameStats.total} frames flagged
        </div>
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <div className="section-label" style={{ marginBottom: 10 }}>DETECTION EVENTS</div>
        {events.map((e, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-primary)" }}>
              {e.label}
            </span>
            <span className={`tag ${e.severity === "HIGH" ? "tag-red" : e.severity === "MED" ? "tag-amber" : "tag-green"}`}>
              {e.severity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};