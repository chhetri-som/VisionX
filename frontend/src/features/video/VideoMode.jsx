import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ConfidenceGauge } from "../../common/ConfidenceGauge";

const generateTimelineData = () =>
  Array.from({ length: 60 }, (_, i) => {
    const t = i * 0.5;
    const isHot = (t >= 4 && t <= 6.5) || (t >= 11 && t <= 13) || (t >= 22 && t <= 24.5);
    const base = isHot ? 60 + Math.random() * 35 : Math.random() * 25;
    return { t: t.toFixed(1), score: Math.min(100, base + Math.random() * 10) };
  });

const keyFrames = [
  { frame: 128, time: "4.3s", reason: "Lip-sync delta exceeds 15% threshold", score: 92 },
  { frame: 340, time: "11.3s", reason: "GAN checkerboard artifact detected", score: 87 },
  { frame: 452, time: "15.1s", reason: "Temporal flicker — frame inconsistency", score: 78 },
  { frame: 668, time: "22.3s", reason: "Skin texture boundary dissolved", score: 95 },
  { frame: 724, time: "24.1s", reason: "Asymmetric blink — right eye lag 80ms", score: 83 },
];

export const VideoMode = () => {
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const timelineData = useRef(generateTimelineData()).current;

  const handleStart = () => {
    setPhase("processing");
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 3.5 + 0.5;
      if (p >= 100) { p = 100; clearInterval(interval); setTimeout(() => setPhase("done"), 400); }
      setProgress(p);
    }, 80);
  };

  useEffect(() => {
    if (phase === "processing") {
      const t = setInterval(() => {
        setFrameIndex(i => (i + 1) % 12);
      }, 120);
      return () => clearInterval(t);
    }
  }, [phase]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Upload / Processing */}
      {phase === "idle" && (
        <div
          onClick={handleStart}
          style={{
            border: "1px dashed rgba(0,229,255,0.2)", borderRadius: 2,
            background: "var(--bg-surface)", height: 220,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16, cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"}
        >
          <div style={{ fontSize: 40, opacity: 0.4 }}>▶</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--cyan)", marginBottom: 6 }}>
              DROP VIDEO FOR FORENSIC ANALYSIS
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
              Click to run demo · 30s clip · 897 frames
            </div>
          </div>
        </div>
      )}

      {phase === "processing" && (
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
                DECONSTRUCTING FRAMES...
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
            {["Spatial CNN", "Temporal Diff", "Blink Track", "FFT Probe"].map((s, i) => (
              <div key={i} style={{
                fontFamily: "var(--font-mono)", fontSize: 9,
                color: progress > 25 * (i + 1) ? "var(--green)" : "var(--text-dim)",
                letterSpacing: "0.08em", transition: "color 0.3s",
              }}>
                {progress > 25 * (i + 1) ? "✓" : "○"} {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
          {/* Left */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Video preview placeholder */}
            <div style={{
              background: "#0a0d14", border: "1px solid var(--border)",
              borderRadius: 2, height: 200,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.12em" }}>
                ▶ DEMO.MP4 — 30s · 29.97fps · 897 frames
              </span>
              <div style={{
                position: "absolute", top: 8, right: 8,
              }}>
                <span className="tag tag-red">⚠ FORGERY DETECTED</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="panel" style={{ padding: 16 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>FORENSIC TIMELINE — 30 SECONDS</div>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={timelineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff2d55" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#ff2d55" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="safeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#00ff9d" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "#3d4f65" }} tickLine={false} axisLine={false} interval={9} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone" dataKey="score"
                    stroke="none"
                    fill="url(#heatGrad)"
                  />
                  {/* Threshold line */}
                  <Area
                    type="monotone" dataKey={() => 50}
                    stroke="rgba(0,229,255,0.15)" strokeDasharray="4 4"
                    fill="none" strokeWidth={1}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Heat bar */}
              <div style={{ height: 10, borderRadius: 1, overflow: "hidden", display: "flex", marginTop: 4 }}>
                {timelineData.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: d.score > 50
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

            {/* Key frames */}
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>KEY EVIDENCE FRAMES</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {keyFrames.map((f, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedFrame(f)}
                    style={{
                      background: "var(--bg-surface)",
                      border: `1px solid ${selectedFrame?.frame === f.frame ? "var(--red)" : "var(--border)"}`,
                      borderRadius: 1, padding: 10, cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--red)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = selectedFrame?.frame === f.frame ? "var(--red)" : "var(--border)"}
                  >
                    <div style={{ height: 50, background: "var(--bg-raised)", borderRadius: 1, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)" }}>F{f.frame}</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)" }}>{f.time}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)", marginTop: 2 }}>{f.score}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <span className="section-label">OVERALL VERDICT</span>
              <ConfidenceGauge value={78} />
              <div style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "center" }}>
                3 of 5 signals positive
              </div>
            </div>

            <div className="panel" style={{ padding: 16 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>DETECTION EVENTS</div>
              {[
                { t: "4.3s", label: "Lip-sync drift", severity: "HIGH" },
                { t: "11.3s", label: "GAN artifact", severity: "HIGH" },
                { t: "15.1s", label: "Temporal flicker", severity: "MED" },
                { t: "22.3s", label: "Texture dissolve", severity: "HIGH" },
                { t: "24.1s", label: "Blink anomaly", severity: "MED" },
              ].map((e, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)" }}>{e.t}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-primary)", marginLeft: 8 }}>{e.label}</span>
                  </div>
                  <span className={`tag ${e.severity === "HIGH" ? "tag-red" : "tag-amber"}`}>{e.severity}</span>
                </div>
              ))}
            </div>

            <button className="btn-primary" style={{ width: "100%", textAlign: "center" }}>
              <span>⬇ EXPORT FORENSIC PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Frame Detail Modal */}
      {selectedFrame && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(7,10,15,0.92)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedFrame(null)}
        >
          <div
            className="panel scanline-container"
            style={{ width: 480, padding: 28 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span className="section-label">FRAME EVIDENCE</span>
              <button
                onClick={() => setSelectedFrame(null)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12 }}
              >✕ CLOSE</button>
            </div>

            <div style={{ height: 180, background: "var(--bg-raised)", borderRadius: 1, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--red)", marginBottom: 8 }}>F{selectedFrame.frame}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>FACIAL MESH PREVIEW</div>
              </div>
            </div>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.06em", marginBottom: 8 }}>
              <span style={{ color: "var(--cyan)" }}>t={selectedFrame.time}</span> · FRAME #{selectedFrame.frame}
            </div>
            <div style={{
              background: "var(--red-ghost)", border: "1px solid rgba(255,45,85,0.2)",
              borderRadius: 1, padding: "12px 14px",
              fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)",
              marginBottom: 16, lineHeight: 1.5,
            }}>
              ⚠ {selectedFrame.reason}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, background: "var(--bg-raised)", padding: "10px 12px", borderRadius: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--red)", fontWeight: 700 }}>{selectedFrame.score}%</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.1em", marginTop: 2 }}>CONFIDENCE</div>
              </div>
              <div style={{ flex: 1, background: "var(--bg-raised)", padding: "10px 12px", borderRadius: 1, textAlign: "center" }}>
                <span className="tag tag-red" style={{ fontSize: 11 }}>HIGH RISK</span>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.1em", marginTop: 8 }}>SEVERITY</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};