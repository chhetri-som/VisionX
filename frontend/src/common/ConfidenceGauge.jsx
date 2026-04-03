export const ConfidenceGauge = ({ value, label, subLabel = "FORGERY" }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value > 70 ? "#ff2d55" : value > 40 ? "#ffb800" : "#00ff9d";
  const label2 = value > 70 ? "HIGH RISK" : value > 40 ? "MODERATE" : "LOW RISK";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 140, height: 140 }}>
        <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle
            cx="70" cy="70" r={radius} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.3s" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center"
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>
            {value}%
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.1em", marginTop: 4 }}>
            {subLabel}
          </span>
        </div>
      </div>
      <div>
        <span className={`tag ${value > 70 ? "tag-red" : value > 40 ? "tag-amber" : "tag-green"}`}>{label2}</span>
      </div>
    </div>
  );
};