import { useState, useRef, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from "recharts";

// ─── Google Fonts + Global Styles ──────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Rajdhani:wght@400;500;600;700&family=Syne:wght@400;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-void: #070a0f;
      --bg-deep: #0c1018;
      --bg-surface: #111620;
      --bg-raised: #171e2c;
      --bg-panel: #1c2538;
      --cyan: #00e5ff;
      --cyan-dim: #00b8cc;
      --cyan-ghost: rgba(0,229,255,0.08);
      --red: #ff2d55;
      --red-dim: #cc2244;
      --red-ghost: rgba(255,45,85,0.1);
      --green: #00ff9d;
      --green-ghost: rgba(0,255,157,0.08);
      --amber: #ffb800;
      --text-primary: #e8edf5;
      --text-secondary: #7a8ba0;
      --text-dim: #3d4f65;
      --border: rgba(0,229,255,0.1);
      --border-strong: rgba(0,229,255,0.22);
      --font-mono: 'JetBrains Mono', monospace;
      --font-display: 'Syne', sans-serif;
      --font-ui: 'Rajdhani', sans-serif;
    }

    body { background: var(--bg-void); color: var(--text-primary); font-family: var(--font-ui); }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg-deep); }
    ::-webkit-scrollbar-thumb { background: var(--cyan-dim); border-radius: 2px; }

    @keyframes scanline {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }
    @keyframes pulse-cyan {
      0%, 100% { box-shadow: 0 0 0 0 rgba(0,229,255,0.4); }
      50% { box-shadow: 0 0 0 8px rgba(0,229,255,0); }
    }
    @keyframes flicker {
      0%, 100% { opacity: 1; }
      92% { opacity: 1; }
      93% { opacity: 0.8; }
      94% { opacity: 1; }
      96% { opacity: 0.9; }
      97% { opacity: 1; }
    }
    @keyframes drift-up {
      from { opacity: 0; transform: translateY(32px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes progress-fill {
      from { stroke-dashoffset: 251; }
      to { stroke-dashoffset: var(--target-offset); }
    }
    @keyframes blink-bar {
      0%, 100% { opacity: 1; } 50% { opacity: 0; }
    }
    @keyframes shimmer {
      from { background-position: -200% 0; }
      to { background-position: 200% 0; }
    }
    @keyframes heat-pulse {
      0%, 100% { opacity: 0.85; } 50% { opacity: 1; }
    }

    .drift-up { animation: drift-up 0.6s ease both; }
    .drift-up-1 { animation: drift-up 0.6s 0.1s ease both; }
    .drift-up-2 { animation: drift-up 0.6s 0.2s ease both; }
    .drift-up-3 { animation: drift-up 0.6s 0.3s ease both; }
    .drift-up-4 { animation: drift-up 0.6s 0.4s ease both; }
    .drift-up-5 { animation: drift-up 0.6s 0.5s ease both; }

    .scanline-container { position: relative; overflow: hidden; }
    .scanline-container::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent);
      animation: scanline 4s linear infinite;
      pointer-events: none;
    }

    .grid-bg {
      background-image:
        linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    .shimmer-loading {
      background: linear-gradient(90deg, var(--bg-raised) 0%, var(--bg-panel) 50%, var(--bg-raised) 100%);
      background-size: 200% 100%;
      animation: shimmer 1.8s infinite;
    }

    .glow-cyan { text-shadow: 0 0 20px rgba(0,229,255,0.5); }
    .glow-red { text-shadow: 0 0 20px rgba(255,45,85,0.6); }

    .btn-primary {
      background: transparent;
      border: 1px solid var(--cyan);
      color: var(--cyan);
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.1em;
      padding: 14px 36px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.2s;
      clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    }
    .btn-primary::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--cyan);
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      z-index: 0;
    }
    .btn-primary:hover::before { transform: translateX(0); }
    .btn-primary:hover { color: var(--bg-void); }
    .btn-primary span { position: relative; z-index: 1; }

    .panel {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 2px;
    }
    .panel-raised {
      background: var(--bg-raised);
      border: 1px solid var(--border);
    }

    .tag {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 1px;
    }
    .tag-cyan { background: var(--cyan-ghost); color: var(--cyan); border: 1px solid rgba(0,229,255,0.2); }
    .tag-red { background: var(--red-ghost); color: var(--red); border: 1px solid rgba(255,45,85,0.2); }
    .tag-green { background: var(--green-ghost); color: var(--green); border: 1px solid rgba(0,255,157,0.2); }
    .tag-amber { background: rgba(255,184,0,0.1); color: var(--amber); border: 1px solid rgba(255,184,0,0.2); }

    .section-label {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--cyan);
    }

    .comparison-slider { position: relative; overflow: hidden; cursor: col-resize; user-select: none; }
    .comparison-overlay { position: absolute; inset: 0; pointer-events: none; }

    .heat-segment { animation: heat-pulse 2s ease-in-out infinite; }

    .tab-btn {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.08em;
      padding: 10px 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
      color: var(--text-secondary);
    }
    .tab-btn.active {
      color: var(--cyan);
      border-bottom-color: var(--cyan);
    }
    .tab-btn:hover:not(.active) { color: var(--text-primary); }
  `}</style>
);

// ─── Radial Confidence Gauge ────────────────────────────────────────────────
const ConfidenceGauge = ({ value, label }) => {
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
            FORGERY
          </span>
        </div>
      </div>
      <div>
        <span className={`tag ${value > 70 ? "tag-red" : value > 40 ? "tag-amber" : "tag-green"}`}>{label2}</span>
      </div>
    </div>
  );
};

// ─── Tell Signs List ────────────────────────────────────────────────────────
const tellSigns = [
  { ok: true, label: "Natural Eye Refraction" },
  { ok: false, label: "Inconsistent Skin Texture (Forehead)" },
  { ok: false, label: "Asymmetric Ear Geometry" },
  { ok: true, label: "Consistent Lip-Sync Delta" },
  { ok: false, label: "GAN Checkerboard Artifacts" },
  { ok: true, label: "Biological Blink Cadence" },
];

const TellSigns = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {tellSigns.map((s, i) => (
      <div key={i} style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px",
        background: s.ok ? "var(--green-ghost)" : "var(--red-ghost)",
        border: `1px solid ${s.ok ? "rgba(0,255,157,0.12)" : "rgba(255,45,85,0.15)"}`,
        borderRadius: 1,
      }}>
        <span style={{ fontSize: 13 }}>{s.ok ? "✅" : "❌"}</span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: s.ok ? "var(--green)" : "var(--red)",
          fontWeight: 500, letterSpacing: "0.04em",
        }}>{s.label}</span>
      </div>
    ))}
  </div>
);

// ─── Heatmap Image with Overlay ─────────────────────────────────────────────
const HeatmapView = ({ showOverlay }) => (
  <div style={{ position: "relative", borderRadius: 2, overflow: "hidden", background: "#0a0d14", aspectRatio: "4/3" }}>
    {/* Face placeholder */}
    <svg viewBox="0 0 400 300" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <radialGradient id="faceGrad" cx="50%" cy="45%" r="40%">
          <stop offset="0%" stopColor="#c8a882" />
          <stop offset="100%" stopColor="#a07850" />
        </radialGradient>
        <radialGradient id="hotspot1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff2d55" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff2d55" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hotspot2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff6b00" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ff6b00" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hotspot3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb800" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffb800" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="300" fill="#1a1f2e" />

      {/* Simple face shape */}
      <ellipse cx="200" cy="145" rx="85" ry="105" fill="url(#faceGrad)" />
      {/* Neck */}
      <rect x="175" y="230" width="50" height="50" rx="4" fill="#a07850" />
      {/* Eyes */}
      <ellipse cx="170" cy="120" rx="16" ry="10" fill="#2a1a0a" />
      <ellipse cx="230" cy="120" rx="16" ry="10" fill="#2a1a0a" />
      <circle cx="170" cy="120" r="6" fill="#111" />
      <circle cx="230" cy="120" r="6" fill="#111" />
      <circle cx="173" cy="117" r="2" fill="white" opacity="0.7" />
      <circle cx="233" cy="117" r="2" fill="white" opacity="0.7" />
      {/* Nose */}
      <ellipse cx="200" cy="155" rx="10" ry="14" fill="#956040" opacity="0.6" />
      {/* Mouth */}
      <path d="M 180 185 Q 200 200 220 185" stroke="#6a3a20" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Ears */}
      <ellipse cx="115" cy="145" rx="16" ry="24" fill="#a07850" />
      <ellipse cx="285" cy="145" rx="16" ry="24" fill="#a07850" />

      {/* Grid overlay */}
      {Array.from({ length: 8 }).map((_, i) =>
        Array.from({ length: 6 }).map((_, j) => (
          <rect key={`${i}-${j}`} x={i * 50} y={j * 50} width="50" height="50"
            fill="none" stroke="rgba(0,229,255,0.04)" strokeWidth="0.5" />
        ))
      )}

      {/* Heatmap overlays */}
      {showOverlay && (
        <g style={{ mixBlendMode: "screen" }}>
          {/* Forehead hotspot - HIGH */}
          <ellipse cx="200" cy="90" rx="60" ry="35" fill="url(#hotspot1)" />
          {/* Left ear - MEDIUM */}
          <ellipse cx="118" cy="145" rx="30" ry="30" fill="url(#hotspot2)" />
          {/* Jawline right - MEDIUM */}
          <ellipse cx="270" cy="210" rx="35" ry="25" fill="url(#hotspot2)" />
          {/* Forehead fine border - LOW */}
          <ellipse cx="155" cy="105" rx="25" ry="20" fill="url(#hotspot3)" />
        </g>
      )}

      {/* Scan lines when overlay on */}
      {showOverlay && Array.from({ length: 30 }).map((_, i) => (
        <line key={i} x1="0" y1={i * 10} x2="400" y2={i * 10}
          stroke="rgba(0,229,255,0.015)" strokeWidth="1" />
      ))}
    </svg>

    {showOverlay && (
      <>
        {/* Corner markers */}
        {[
          { x: 8, y: 8, corners: "tl" }, { x: 392, y: 8, corners: "tr" },
          { x: 8, y: 292, corners: "bl" }, { x: 392, y: 292, corners: "br" }
        ].map((c, i) => (
          <div key={i} style={{
            position: "absolute",
            left: c.corners.includes("l") ? 8 : "auto",
            right: c.corners.includes("r") ? 8 : "auto",
            top: c.corners.includes("t") ? 8 : "auto",
            bottom: c.corners.includes("b") ? 8 : "auto",
            width: 16, height: 16,
            borderTop: c.corners.includes("t") ? "1px solid var(--cyan)" : "none",
            borderBottom: c.corners.includes("b") ? "1px solid var(--cyan)" : "none",
            borderLeft: c.corners.includes("l") ? "1px solid var(--cyan)" : "none",
            borderRight: c.corners.includes("r") ? "1px solid var(--cyan)" : "none",
          }} />
        ))}

        {/* Hotspot tooltip labels */}
        <div style={{
          position: "absolute", top: "18%", left: "50%", transform: "translateX(-50%)",
          background: "rgba(255,45,85,0.9)", backdropFilter: "blur(4px)",
          border: "1px solid var(--red)", borderRadius: 1,
          padding: "4px 8px",
          fontFamily: "var(--font-mono)", fontSize: 9, color: "white",
          whiteSpace: "nowrap", letterSpacing: "0.08em",
        }}>
          ⚠ GAN blending — Forehead boundary
        </div>
        <div style={{
          position: "absolute", bottom: "28%", right: "8%",
          background: "rgba(255,107,0,0.85)", backdropFilter: "blur(4px)",
          border: "1px solid #ff6b00", borderRadius: 1,
          padding: "4px 8px",
          fontFamily: "var(--font-mono)", fontSize: 9, color: "white",
          whiteSpace: "nowrap", letterSpacing: "0.08em",
        }}>
          ⚠ Asymmetric geometry
        </div>

        {/* XAI badge */}
        <div style={{
          position: "absolute", bottom: 8, left: 8,
          background: "rgba(0,229,255,0.12)",
          border: "1px solid rgba(0,229,255,0.3)",
          borderRadius: 1, padding: "3px 8px",
          fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)",
          letterSpacing: "0.12em",
        }}>
          GRAD-CAM XAI ACTIVE
        </div>
      </>
    )}
  </div>
);

// ─── Image Analysis Mode ─────────────────────────────────────────────────────
const ImageMode = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const sliderRef = useRef(null);
  const dragging = useRef(false);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setAnalyzed(false);
    setTimeout(() => { setAnalyzing(false); setAnalyzed(true); }, 2200);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderPos(x);
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
      {/* Left: Image */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Upload area / Image */}
        {!analyzed && !analyzing && (
          <div
            onClick={handleAnalyze}
            style={{
              border: "1px dashed rgba(0,229,255,0.2)",
              borderRadius: 2, background: "var(--bg-surface)",
              aspectRatio: "4/3", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
              cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"}
          >
            <div style={{ fontSize: 40, opacity: 0.5 }}>⬆</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--cyan)", marginBottom: 6 }}>
                DROP IMAGE FOR ANALYSIS
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
                Click to load demo
              </div>
            </div>
          </div>
        )}

        {analyzing && (
          <div style={{
            border: "1px solid var(--border)", borderRadius: 2,
            background: "var(--bg-surface)", aspectRatio: "4/3",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24
          }}>
            <div style={{ position: "relative", width: 64, height: 64 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                border: "2px solid rgba(0,229,255,0.1)",
                borderTop: "2px solid var(--cyan)",
                animation: "spin-slow 1s linear infinite",
              }} />
              <div style={{
                position: "absolute", inset: 8,
                borderRadius: "50%",
                border: "2px solid rgba(255,45,85,0.1)",
                borderBottom: "2px solid var(--red)",
                animation: "spin-slow 1.5s linear infinite reverse",
              }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", marginBottom: 6 }}>
                DECONSTRUCTING ARTIFACTS...
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.15em" }}>
                Spatial · Temporal · Biological
              </div>
            </div>
          </div>
        )}

        {analyzed && (
          <>
            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span className="section-label">SOURCE IMAGE</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="tag tag-cyan"
                  style={{ cursor: "pointer", border: "1px solid var(--border-strong)", padding: "6px 14px", fontFamily: "var(--font-mono)", fontSize: 10, background: showOverlay ? "var(--cyan)" : "var(--cyan-ghost)", color: showOverlay ? "var(--bg-void)" : "var(--cyan)" }}
                  onClick={() => setShowOverlay(!showOverlay)}
                >
                  {showOverlay ? "▶ XAI OVERLAY ON" : "○ XAI OVERLAY OFF"}
                </button>
              </div>
            </div>

            {/* Comparison Slider */}
            <div
              ref={sliderRef}
              className="comparison-slider"
              style={{ borderRadius: 2, aspectRatio: "4/3", background: "#0a0d14", cursor: "col-resize" }}
              onMouseDown={() => { dragging.current = true; }}
            >
              {/* Base image (always shown) */}
              <div style={{ position: "absolute", inset: 0 }}>
                <HeatmapView showOverlay={false} />
              </div>
              {/* Overlay (clipped) */}
              <div style={{
                position: "absolute", inset: 0,
                clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                transition: dragging.current ? "none" : "clip-path 0.05s",
              }}>
                <HeatmapView showOverlay={showOverlay} />
              </div>
              {/* Divider line */}
              <div style={{
                position: "absolute", top: 0, bottom: 0,
                left: `${sliderPos}%`,
                width: 2, background: "var(--cyan)",
                boxShadow: "0 0 12px var(--cyan)",
                pointerEvents: "none",
              }}>
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--cyan)", border: "2px solid var(--bg-void)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "var(--bg-void)", fontWeight: 700,
                }}>⇔</div>
              </div>
              {/* Labels */}
              <div style={{
                position: "absolute", bottom: 10, left: 10,
                fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em",
              }}>SOURCE</div>
              <div style={{
                position: "absolute", bottom: 10, right: 10,
                fontFamily: "var(--font-mono)", fontSize: 9, color: showOverlay ? "var(--cyan)" : "rgba(255,255,255,0.5)", letterSpacing: "0.12em",
              }}>EVIDENCE</div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textAlign: "center", letterSpacing: "0.12em" }}>
              DRAG TO REVEAL · TOGGLE GRAD-CAM TO ACTIVATE EVIDENCE VIEW
            </div>
          </>
        )}
      </div>

      {/* Right: Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Confidence */}
        <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="section-label">CONFIDENCE INDEX</span>
          <ConfidenceGauge value={analyzed ? 84 : 0} />
          {analyzed && (
            <div style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "center", letterSpacing: "0.08em" }}>
              WEIGHTED MULTI-SIGNAL SCORE
            </div>
          )}
        </div>

        {/* Signal breakdown */}
        {analyzed && (
          <div className="panel" style={{ padding: 16 }}>
            <div className="section-label" style={{ marginBottom: 12 }}>SIGNAL BREAKDOWN</div>
            {[
              { label: "Spatial CNN", value: 91, color: "var(--red)" },
              { label: "Temporal", value: 67, color: "var(--amber)" },
              { label: "Biological", value: 43, color: "var(--amber)" },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.06em" }}>{s.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: s.color, fontWeight: 600 }}>{s.value}%</span>
                </div>
                <div style={{ height: 3, background: "var(--bg-panel)", borderRadius: 1, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${s.value}%`,
                    background: `linear-gradient(90deg, ${s.color}88, ${s.color})`,
                    transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                    boxShadow: `0 0 6px ${s.color}`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tell Signs */}
        {analyzed && (
          <div className="panel" style={{ padding: 16 }}>
            <div className="section-label" style={{ marginBottom: 12 }}>SIGNATURE ANALYSIS</div>
            <TellSigns />
          </div>
        )}

        {!analyzed && (
          <div className="panel" style={{ padding: 20, textAlign: "center", opacity: 0.4 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
              Upload an image to begin forensic analysis
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Timeline data ───────────────────────────────────────────────────────────
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

// ─── Video Analysis Mode ─────────────────────────────────────────────────────
const VideoMode = () => {
  const [phase, setPhase] = useState("idle"); // idle | processing | done
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
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>HEATMAP PREVIEW</div>
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

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("image");
  const [view, setView] = useState("landing"); // landing | platform
  const workspaceRef = useRef(null);

  const handleLaunch = () => {
    setView("platform");
    setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>

        {/* ── NAV ── */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          borderBottom: "1px solid var(--border)",
          background: "rgba(7,10,15,0.85)", backdropFilter: "blur(12px)",
          padding: "0 40px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Logo */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#00e5ff" strokeWidth="1" opacity="0.4" />
              <circle cx="12" cy="12" r="6" stroke="#00e5ff" strokeWidth="1" opacity="0.6" />
              <circle cx="12" cy="12" r="2" fill="#00e5ff" />
              <line x1="12" y1="2" x2="12" y2="6" stroke="#00e5ff" strokeWidth="1" />
              <line x1="12" y1="18" x2="12" y2="22" stroke="#00e5ff" strokeWidth="1" />
              <line x1="2" y1="12" x2="6" y2="12" stroke="#00e5ff" strokeWidth="1" />
              <line x1="18" y1="12" x2="22" y2="12" stroke="#00e5ff" strokeWidth="1" />
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, letterSpacing: "0.04em", color: "white" }}>
              VISION<span style={{ color: "var(--cyan)" }}>X</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.15em" }}>
              EDGE-AI FORENSICS · v0.9.1
            </span>
            <span className="tag tag-cyan" style={{ animation: "pulse-cyan 3s infinite" }}>SYSTEM ONLINE</span>
          </div>
        </nav>

        {/* ── LANDING ── */}
        <div style={{ paddingTop: 56 }}>
          {/* Hero */}
          <section className="grid-bg scanline-container" style={{
            minHeight: "88vh", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "0 40px", position: "relative",
            background: "var(--bg-void)",
          }}>
            {/* Ambient glow */}
            <div style={{
              position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
              width: 600, height: 300, borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(0,229,255,0.04) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            <div className="drift-up" style={{ textAlign: "center", maxWidth: 760, position: "relative" }}>
              <div className="section-label drift-up" style={{ marginBottom: 24 }}>
                REAL-TIME FORENSIC DEEPFAKE DETECTION
              </div>
              <h1 style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(42px, 6vw, 80px)",
                fontWeight: 800, lineHeight: 1.05, marginBottom: 24,
                animation: "flicker 8s infinite",
              }}>
                <span style={{ color: "white" }}>The Truth, </span>
                <span style={{ color: "var(--cyan)" }} className="glow-cyan">Verified</span>
                <br />
                <span style={{ color: "white" }}>at the </span>
                <span style={{ color: "var(--cyan)" }} className="glow-cyan">Edge.</span>
              </h1>

              <p className="drift-up-1" style={{
                fontFamily: "var(--font-ui)", fontSize: 18, lineHeight: 1.7,
                color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto 40px",
                fontWeight: 400,
              }}>
                A privacy-first, local-inference deepfake detection platform. No data leaves your device. No server. No compromise.
              </p>

              <div className="drift-up-2" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={handleLaunch} style={{ fontSize: 13, padding: "16px 48px" }}>
                  <span>▶ LAUNCH ANALYZER</span>
                </button>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)",
                }}>
                  <span style={{ color: "var(--green)", fontSize: 16 }}>●</span>
                  INFERENCE: LOCAL · LATENCY: &lt;50ms
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="drift-up-3" style={{
              position: "absolute", bottom: 40, left: 40, right: 40,
              display: "flex", justifyContent: "center", gap: 60,
            }}>
              {[
                { val: "3-Signal", label: "Detection Matrix" },
                { val: "FP16", label: "Inference Precision" },
                { val: "ONNX", label: "Runtime Engine" },
                { val: "Grad-CAM", label: "Explainability Layer" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--cyan)", marginBottom: 4 }}>{s.val}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works */}
          <section style={{
            padding: "80px 60px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-deep)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div className="section-label" style={{ marginBottom: 12 }}>METHODOLOGY</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "white" }}>
                How It Works
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 960, margin: "0 auto" }}>
              {[
                {
                  icon: "🔐",
                  num: "01",
                  title: "Local Processing",
                  desc: "All inference runs entirely on your device via ONNX Runtime. Your face data never touches a server. Privacy is the architecture.",
                  color: "var(--cyan)",
                },
                {
                  icon: "🔬",
                  num: "02",
                  title: "Forensic Deep-Dive",
                  desc: "We don't just say \"Fake.\" Grad-CAM heatmaps reveal the exact pixel-level artifacts that triggered the detection — jawlines, eye rendering, texture seams.",
                  color: "var(--amber)",
                },
                {
                  icon: "📡",
                  num: "03",
                  title: "Multi-Signal Analysis",
                  desc: "Three independent signals: Spatial CNN for textures, Temporal consistency across frames, and Biological tracking of blink rates and head pose.",
                  color: "var(--red)",
                },
              ].map((c, i) => (
                <div
                  key={i}
                  className="panel"
                  style={{ padding: 28, position: "relative", overflow: "hidden" }}
                >
                  <div style={{
                    position: "absolute", top: -10, right: -10,
                    fontFamily: "var(--font-display)", fontSize: 72, fontWeight: 800,
                    color: c.color, opacity: 0.05, lineHeight: 1,
                  }}>{c.num}</div>
                  <div style={{ fontSize: 28, marginBottom: 16 }}>{c.icon}</div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, color: c.color,
                    letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10,
                  }}>{c.num}</div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white", marginBottom: 10 }}>{c.title}</h3>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Signal architecture strip */}
          <section style={{
            padding: "40px 60px",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-void)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
          }}>
            {["Spatial CNN", "→", "Temporal Diff", "→", "Biological Tracker", "→", "Multi-Signal Fusion", "→", "Forensic Output"].map((s, i) => (
              <div key={i} style={{
                fontFamily: s === "→" ? "monospace" : "var(--font-mono)",
                fontSize: s === "→" ? 20 : 11,
                color: s === "→" ? "var(--border-strong)" : i === 8 ? "var(--red)" : "var(--text-secondary)",
                letterSpacing: "0.1em",
                padding: s === "→" ? "0 12px" : "8px 18px",
                background: s !== "→" ? "var(--bg-surface)" : "transparent",
                border: s !== "→" ? "1px solid var(--border)" : "none",
                borderRadius: 1,
              }}>
                {s}
              </div>
            ))}
          </section>

          {/* CTA to platform */}
          <section style={{ padding: "80px 40px", textAlign: "center", background: "var(--bg-deep)" }}>
            <div className="section-label" style={{ marginBottom: 16 }}>READY TO ANALYZE</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
              Start Your Forensic Investigation
            </h2>
            <button className="btn-primary" onClick={handleLaunch} style={{ fontSize: 14, padding: "18px 56px" }}>
              <span>▶ LAUNCH ANALYZER</span>
            </button>
          </section>

          {/* ── FORENSIC WORKSPACE ── */}
          <section
            ref={workspaceRef}
            style={{
              background: "var(--bg-void)",
              borderTop: "2px solid var(--border-strong)",
              minHeight: "100vh",
              padding: "48px 40px",
            }}
          >
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              {/* Workspace header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
                <div>
                  <div className="section-label" style={{ marginBottom: 6 }}>FORENSIC WORKSPACE</div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "white" }}>
                    Analysis Engine
                  </h2>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.1em" }}>
                    MODEL: efficientnet-b4-ff++ · QUANT: INT8/FP16
                  </div>
                  <span className="tag tag-green">● READY</span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{
                borderBottom: "1px solid var(--border)",
                marginBottom: 28, display: "flex",
              }}>
                <button className={`tab-btn ${activeTab === "image" ? "active" : ""}`} onClick={() => setActiveTab("image")}>
                  🖼 IMAGE ANALYSIS
                </button>
                <button className={`tab-btn ${activeTab === "video" ? "active" : ""}`} onClick={() => setActiveTab("video")}>
                  ▶ VIDEO ANALYSIS
                </button>
              </div>

              {/* Tab content */}
              <div>
                {activeTab === "image" && <ImageMode />}
                {activeTab === "video" && <VideoMode />}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer style={{
            padding: "24px 40px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-void)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.12em" }}>
              VISIONX · FORENSIC DEEPFAKE DETECTION · EDGE-AI PLATFORM
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.12em" }}>
              ALL INFERENCE LOCAL · ZERO DATA TRANSMISSION
            </span>
          </footer>
        </div>
      </div>
    </>
  );
}
