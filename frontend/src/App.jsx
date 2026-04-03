import { useState, useRef } from "react";
import { ImageMode } from "./features/image";
import { VideoMode } from "./features/video";
import { AudioMode } from "./features/audio";

export default function App() {
  const [activeTab, setActiveTab] = useState("image");
  const [view, setView] = useState("landing"); // landing | platform
  const workspaceRef = useRef(null);

  const handleLaunch = () => {
    setView("platform");
    setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>

        {/* ── NAV ── */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          borderBottom: "1px solid var(--border)",
          background: "rgba(248,243,225,0.92)", backdropFilter: "blur(12px)",
          padding: "0 40px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div className="nav-logo" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Logo */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <g className="logo-ring">
                <circle cx="12" cy="12" r="10" stroke="#AEB784" strokeWidth="1" opacity="0.5" />
                <circle cx="12" cy="12" r="6"  stroke="#AEB784" strokeWidth="1" opacity="0.7" />
              </g>
              <circle cx="12" cy="12" r="2"  fill="#AEB784" />
              <line x1="12" y1="2"  x2="12" y2="6"  stroke="#AEB784" strokeWidth="1" />
              <line x1="12" y1="18" x2="12" y2="22" stroke="#AEB784" strokeWidth="1" />
              <line x1="2"  y1="12" x2="6"  y2="12" stroke="#AEB784" strokeWidth="1" />
              <line x1="18" y1="12" x2="22" y2="12" stroke="#AEB784" strokeWidth="1" />
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, letterSpacing: "0.04em", color: "var(--text-primary)" }}>
              VISION<span style={{ color: "var(--cyan)" }}>X</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.15em" }}>
              EDGE-AI FORENSICS · v1.0.0
            </span>
            <span className="tag tag-cyan" style={{ animation: "pulse-cyan 3s infinite" }}>SYSTEM ONLINE</span>
          </div>
        </nav>

        {/* ── LANDING ── */}
        <div style={{ paddingTop: 56 }}>
          {/* Hero */}
          <section className="grid-bg" style={{
            minHeight: "88vh", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "0 40px", position: "relative",
            background: "var(--bg-primary)",
          }}>
            {/* Ambient glow */}
            <div style={{
              position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
              width: 600, height: 300, borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(174,183,132,0.10) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            <div className="drift-up" style={{ textAlign: "center", maxWidth: 760, position: "relative" }}>
              <div className="section-label drift-up" style={{ marginBottom: 24 }}>
                REAL-TIME FORENSIC DEEPFAKE DETECTION PLATFORM
              </div>
              <h1 className="text-gradient-breathe" style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(42px, 6vw, 80px)",
                fontWeight: 800, lineHeight: 1.05, marginBottom: 24, paddingBottom: "0.15em"
              }}>
                <span>The Truth, </span>
                <span>Verified</span>
                <br />
                <span>at the </span>
                <span>Edge.</span>
              </h1>

              <p className="drift-up-1" style={{
                fontFamily: "var(--font-ui)", fontSize: 18, lineHeight: 1.7,
                color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto 40px",
                fontWeight: 400,
              }}>
                A privacy-first, local-inference platform, capable of multi-modal detection - audio, video and image analysis.
              </p>

              <div className="drift-up-2" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn-primary btn-glow" onClick={handleLaunch} style={{ fontSize: 13, padding: "16px 48px" }}>
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
                { val: "FP32",     label: "Inference Precision" },
                { val: "ONNX",     label: "Runtime Engine" },
                { val: "MediaPipe", label: "Geometric Analysis" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--cyan)", marginBottom: 4 }}>{s.val}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works */}
          <section style={{
            padding: "80px 60px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div className="section-label" style={{ marginBottom: 12 }}>METHODOLOGY</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--text-primary)" }}>
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
                  desc: "We don't just say \"Fake.\" Each modal platform contains unique forensic analysis methods independent of the ML prediction. This provides us with a second truth to verify the analysis of the media provided.",
                  color: "var(--amber)",
                },
                {
                  icon: "📡",
                  num: "03",
                  title: "Multi-Modal Analysis",
                  desc: "Each media - audio, image and video contains separate ML models and analysis methodologies created specifically for the given media.",
                  color: "var(--red)",
                },
              ].map((c, i) => (
                <div
                  key={i}
                  className="panel hover-card"
                  style={{ padding: 28, position: "relative", overflow: "hidden" }}
                >
                  <div className="card-num" style={{
                    position: "absolute", top: -10, right: -10,
                    fontFamily: "var(--font-display)", fontSize: 72, fontWeight: 800,
                    color: c.color, opacity: 0.07, lineHeight: 1,
                  }}>{c.num}</div>
                  <div style={{ fontSize: 28, marginBottom: 16, position: "relative" }}>{c.icon}</div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, color: c.color,
                    letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10,
                    position: "relative"
                  }}>{c.num}</div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10, position: "relative" }}>{c.title}</h3>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, position: "relative" }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── FORENSIC WORKSPACE ── */}
          <section
            ref={workspaceRef}
            style={{
              background: "var(--bg-primary)",
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
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
                    Analysis Engine
                  </h2>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.1em" }}>
                    MODEL: Fine-Tuned EfficientNet-B0 · PRECISION: FP32
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
                <button className={`tab-btn ${activeTab === "audio" ? "active" : ""}`} onClick={() => setActiveTab("audio")}>
                  🎵 AUDIO ANALYSIS
                </button>
              </div>

              {/* Tab content */}
              <div>
                {activeTab === "image" && <ImageMode />}
                {activeTab === "video" && <VideoMode />}
                {activeTab === "audio" && <AudioMode />}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer style={{
            padding: "24px 40px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-secondary)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.12em" }}>
              VISIONX · FORENSIC DEEPFAKE DETECTION · EDGE-AI PLATFORM
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.12em" }}>
              ALL INFERENCE LOCAL · ZERO DATA TRANSMISSION
            </span>
          </footer>
        </div>
      </div>
  );
}