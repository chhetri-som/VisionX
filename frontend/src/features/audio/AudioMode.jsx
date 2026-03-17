import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ConfidenceGauge } from "../image/components/ConfidenceGauge";

const generateWaveformData = () =>
  Array.from({ length: 100 }, (_, i) => {
    const t = i * 0.1;
    const isHot = (t >= 2 && t <= 4.5) || (t >= 7 && t <= 8.5) || (t >= 12 && t <= 14);
    const base = isHot ? 60 + Math.random() * 35 : Math.random() * 25;
    return { t: t.toFixed(1), score: Math.min(100, base + Math.random() * 10) };
  });

const keySegments = [
  { segment: "0:12-0:18", time: "0:15", reason: "Spectral inconsistency in vocal formants", score: 89 },
  { segment: "0:34-0:41", time: "0:37", reason: "Unnatural pitch modulation detected", score: 84 },
  { segment: "1:02-1:08", time: "1:05", reason: "Phase coherence anomaly", score: 76 },
  { segment: "1:23-1:29", time: "1:26", reason: "Synthetic artifact in high frequencies", score: 91 },
  { segment: "1:45-1:52", time: "1:48", reason: "Breathing pattern mismatch", score: 81 },
];

export const AudioMode = () => {
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [waveformIndex, setWaveformIndex] = useState(0);
  const waveformData = useRef(generateWaveformData()).current;

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
        setWaveformIndex(i => (i + 1) % 10);
      }, 150);
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
          <div style={{ fontSize: 40, opacity: 0.4 }}>🎵</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--cyan)", marginBottom: 6 }}>
              DROP AUDIO FOR FORENSIC ANALYSIS
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
              Click to run demo · 2:00 clip · 44.1kHz · Stereo
            </div>
          </div>
        </div>
      )}

      {phase === "processing" && (
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 2, padding: 24,
        }}>
          {/* Waveform visualization */}
          <div style={{ display: "flex", gap: 2, marginBottom: 20, alignItems: "center", height: 60 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, borderRadius: 1,
                background: i === waveformIndex % 10 ? "var(--cyan)" : "var(--bg-panel)",
                height: i === waveformIndex % 10 ? "100%" : `${20 + Math.random() * 60}%`,
                transition: "all 0.15s",
              }} />
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", letterSpacing: "0.12em" }}>
                ANALYZING SPECTRAL SIGNATURES...
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
            {["Spectral FFT", "Phase Analysis", "Formant Track", "Noise Floor"].map((s, i) => (
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
            {/* Audio waveform preview */}
            <div style={{
              background: "#0a0d14", border: "1px solid var(--border)",
              borderRadius: 2, height: 200,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.12em" }}>
                🎵 DEMO.WAV — 2:00 · 44.1kHz · Stereo · 16-bit
              </span>
              <div style={{
                position: "absolute", top: 8, right: 8,
              }}>
                <span className="tag tag-red">⚠ SYNTHETIC DETECTED</span>
              </div>
            </div>

            {/* Spectral timeline */}
            <div className="panel" style={{ padding: 16 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>SPECTRAL TIMELINE — 2:00 MINUTES</div>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={waveformData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
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
                {waveformData.map((d, i) => (
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
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--red)" }}>■ SYNTHETIC</span>
              </div>
            </div>

            {/* Key segments */}
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>KEY EVIDENCE SEGMENTS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {keySegments.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedSegment(s)}
                    style={{
                      background: "var(--bg-surface)",
                      border: `1px solid ${selectedSegment?.segment === s.segment ? "var(--red)" : "var(--border)"}`,
                      borderRadius: 1, padding: 10, cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--red)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = selectedSegment?.segment === s.segment ? "var(--red)" : "var(--border)"}
                  >
                    <div style={{ height: 50, background: "var(--bg-raised)", borderRadius: 1, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)" }}>{s.segment}</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)" }}>{s.time}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)", marginTop: 2 }}>{s.score}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <span className="section-label">OVERALL VERDICT</span>
              <ConfidenceGauge value={82} />
              <div style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "center" }}>
                4 of 6 signals positive
              </div>
            </div>

            <div className="panel" style={{ padding: 16 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>DETECTION EVENTS</div>
              {[
                { t: "0:15", label: "Formant inconsistency", severity: "HIGH" },
                { t: "0:37", label: "Pitch modulation", severity: "HIGH" },
                { t: "1:05", label: "Phase coherence", severity: "MED" },
                { t: "1:26", label: "High frequency artifact", severity: "HIGH" },
                { t: "1:48", label: "Breathing pattern", severity: "MED" },
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

      {/* Segment Detail Modal */}
      {selectedSegment && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(7,10,15,0.92)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedSegment(null)}
        >
          <div
            className="panel scanline-container"
            style={{ width: 480, padding: 28 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span className="section-label">SEGMENT EVIDENCE</span>
              <button
                onClick={() => setSelectedSegment(null)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12 }}
              >✕ CLOSE</button>
            </div>

            <div style={{ height: 180, background: "var(--bg-raised)", borderRadius: 1, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--red)", marginBottom: 8 }}>{selectedSegment.segment}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>SPECTRAL ANALYSIS</div>
              </div>
            </div>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.06em", marginBottom: 8 }}>
              <span style={{ color: "var(--cyan)" }}>t={selectedSegment.time}</span> · SEGMENT {selectedSegment.segment}
            </div>
            <div style={{
              background: "var(--red-ghost)", border: "1px solid rgba(255,45,85,0.2)",
              borderRadius: 1, padding: "12px 14px",
              fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)",
              marginBottom: 16, lineHeight: 1.5,
            }}>
              ⚠ {selectedSegment.reason}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, background: "var(--bg-raised)", padding: "10px 12px", borderRadius: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--red)", fontWeight: 700 }}>{selectedSegment.score}%</div>
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