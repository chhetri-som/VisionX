import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{
      background: "var(--bg-panel)", border: "1px solid var(--border)",
      padding: "6px 10px", borderRadius: 1,
      fontFamily: "var(--font-mono)", fontSize: 10,
    }}>
      <div style={{ color: "var(--text-secondary)" }}>t={payload[0].payload.t}s</div>
      <div style={{ color: val > 50 ? "var(--red)" : "var(--green)" }}>
        Score: {val.toFixed(0)}%
      </div>
    </div>
  );
};

export const ForensicTimeline = ({ timelineData }) => {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="section-label" style={{ marginBottom: 10 }}>FORENSIC TIMELINE</div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={timelineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff2d55" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ff2d55" stopOpacity="0" />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" tick={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "#3d4f65" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis hide domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="score" stroke="none" fill="url(#heatGrad)" />
          <Area type="monotone" dataKey={() => 60} stroke="rgba(0,229,255,0.15)" strokeDasharray="4 4" fill="none" strokeWidth={1} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Heat bar */}
      <div style={{ height: 10, borderRadius: 1, overflow: "hidden", display: "flex", marginTop: 4 }}>
        {timelineData.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: d.score > 60
                ? `rgba(255,45,85,${Math.min(1, d.score / 100 + 0.2)})`
                : `rgba(0,255,157,${Math.min(0.8, (100 - d.score) / 100 + 0.1)})`,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--green)" }}>■ AUTHENTIC</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--red)" }}>■ MANIPULATED</span>
      </div>
    </div>
  );
};