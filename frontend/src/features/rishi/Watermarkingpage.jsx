import { useState } from "react";

/* ─────────────────────────────────────────────
   Tab content components
───────────────────────────────────────────── */

function TabProblem() {
  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>

      {/* Hero statement */}
      <div className="panel" style={{
        padding: "36px 40px", marginBottom: 32,
        borderLeft: "3px solid var(--red)",
        background: "rgba(220,80,60,0.04)",
      }}>
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700,
          color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 16,
        }}>
          You can't tell a fake video just by watching it anymore.
        </div>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8, margin: 0 }}>
          AI video generation has become so advanced that even trained experts struggle to spot synthetic content.
          This creates real problems for journalism, courtrooms, elections, and social media.
        </p>
      </div>

      {/* Three scenarios */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 40 }}>
        {[
          {
            icon: "⚖️",
            title: "Legal Evidence",
            body: "A video submitted to court looks real. Is it? Without a provenance trail, there's no way to know — and the stakes couldn't be higher.",
            color: "var(--amber)",
          },
          {
            icon: "🗳️",
            title: "Election Integrity",
            body: "A clip of a politician doing something they never did spreads in hours. By the time it's debunked, the damage is done.",
            color: "var(--red)",
          },
          {
            icon: "📰",
            title: "Journalism",
            body: "A reporter receives footage of a breaking event. Is it real? Existing tools can say \"probably fake\" — but can't prove who made it.",
            color: "var(--cyan)",
          },
        ].map((s, i) => (
          <div key={i} className="panel hover-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
            <h3 style={{
              fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700,
              color: s.color, marginBottom: 8,
            }}>{s.title}</h3>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>

      {/* Current approaches & why they fail */}
      <div style={{ marginBottom: 32 }}>
        <div className="section-label" style={{ marginBottom: 20 }}>WHY CURRENT SOLUTIONS FALL SHORT</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            {
              approach: "Per-frame watermarking",
              problem: "Stamps every frame individually. An attacker just needs to find and erase the stamp from one frame — then do the same to every other frame. Completely removable.",
            },
            {
              approach: "Metadata tags (e.g. C2PA)",
              problem: "Stores provenance info in the file's metadata, like a Post-It note attached to a document. Re-saving or re-encoding the video strips the note entirely.",
            },
          ].map((item, i) => (
            <div key={i} className="panel" style={{ padding: 20, borderLeft: "2px solid var(--red)" }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--red)",
                letterSpacing: "0.12em", marginBottom: 10,
              }}>APPROACH {i + 1}</div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700,
                color: "var(--text-primary)", marginBottom: 8,
              }}>{item.approach}</div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                <span style={{ color: "var(--red)" }}>✕ </span>{item.problem}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ padding: 24, textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          This paper proposes a <strong style={{ color: "var(--cyan)" }}>third approach</strong> — one that makes the watermark
          impossible to find without a secret key, and impossible to remove without destroying the video itself.
        </span>
      </div>
    </div>
  );
}

function TabSolution() {
  const [active, setActive] = useState(null);

  const layers = [
    {
      num: "01",
      icon: "⏱",
      color: "var(--cyan)",
      title: "Temporal Split",
      tagline: "No frame holds the full secret",
      simple: "Imagine tearing a letter into 100 pieces and hiding one piece per page in a book. You need most of the pages to reassemble the letter.",
      detail: "The watermark (your identity stamp) is mathematically split into N pieces using Shamir's Secret Sharing. Each piece is hidden in exactly one video frame. Any attacker who gets just a few frames learns absolutely nothing. You need at least 60% of all frames to reconstruct the stamp.",
    },
    {
      num: "02",
      icon: "🗝️",
      color: "var(--amber)",
      title: "Secret Key",
      tagline: "Hidden in plain sight",
      simple: "The stamp is hidden in specific pixels — but which pixels? Only someone with the secret key knows where to look.",
      detail: "The exact pixel locations used to store each piece of the watermark are determined by a secret cryptographic key. Without that key, the pixel values look like normal image noise. An attacker scanning billions of pixels has no way to know which ones to check — mathematically equivalent to breaking 128-bit encryption.",
    },
    {
      num: "03",
      icon: "🔐",
      color: "var(--green)",
      title: "Encryption",
      tagline: "Even if found, it's unreadable",
      simple: "Even if someone somehow found all the pieces and assembled them, the result is scrambled text they can't decode.",
      detail: "The identity payload is encrypted with AES-256-GCM before being split into shares. This is the same encryption standard used by banks and governments. Even a perfect reconstruction of all shares without the decryption key produces meaningless ciphertext.",
    },
    {
      num: "04",
      icon: "✍️",
      color: "var(--red)",
      title: "Digital Signature",
      tagline: "Proof of who created it",
      simple: "Once decoded, the stamp contains a digital signature — like a notarized ID that can't be forged.",
      detail: "The payload is signed with ECDSA-P256, an asymmetric digital signature scheme. The creator signs with their private key; anyone can verify with the public key. This means even if someone reconstructed the watermark, they could not forge a different creator's identity without breaking elliptic-curve cryptography.",
    },
  ];

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <div style={{
        fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--text-secondary)",
        lineHeight: 1.8, marginBottom: 36, maxWidth: 640,
      }}>
        The framework stacks <strong style={{ color: "var(--text-primary)" }}>four independent security layers</strong>.
        Each one independently defeats a different type of attack. Click any layer to learn more.
      </div>

      {/* Layers */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
        {layers.map((l, i) => {
          const isOpen = active === i;
          return (
            <div
              key={i}
              className="panel"
              onClick={() => setActive(isOpen ? null : i)}
              style={{
                padding: isOpen ? "24px 28px" : "20px 28px",
                borderLeft: `3px solid ${l.color}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 24 }}>{l.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 2 }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 9, color: l.color,
                      letterSpacing: "0.15em",
                    }}>LAYER {l.num}</span>
                    <span style={{
                      fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700,
                      color: "var(--text-primary)",
                    }}>{l.title}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-tertiary)" }}>
                    {l.tagline}
                  </div>
                </div>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)",
                  transform: isOpen ? "rotate(90deg)" : "none",
                  transition: "transform 0.2s ease",
                }}>›</span>
              </div>

              {isOpen && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                  <div className="panel" style={{
                    padding: "14px 18px", marginBottom: 14,
                    background: `rgba(0,0,0,0.03)`,
                    borderLeft: `2px solid ${l.color}`,
                  }}>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: 9, color: l.color,
                      letterSpacing: "0.12em", marginBottom: 6,
                    }}>SIMPLE ANALOGY</div>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                      {l.simple}
                    </p>
                  </div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
                    {l.detail}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 28 }}>🧩</span>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
          Each layer is independent — defeating one doesn't help with the others. An attacker must overcome all four simultaneously, which is computationally infeasible.
        </p>
      </div>
    </div>
  );
}

function TabHowItWorks() {
  const steps = [
    {
      phase: "EMBEDDING",
      color: "var(--cyan)",
      icon: "📥",
      title: "Stamping the Video",
      steps: [
        { n: "1", text: "A creator identifier, timestamp, and a hash of the raw video are bundled into a small payload — like a digital birth certificate." },
        { n: "2", text: "The payload is cryptographically signed (\"I, the creator, certify this\") and then encrypted so it looks like random noise." },
        { n: "3", text: "The encrypted payload is mathematically split into N shares using Shamir's algorithm. Each share is worthless alone." },
        { n: "4", text: "Each share is embedded into specific pixels in one frame of the video — pixels chosen by the secret key, invisible to the naked eye." },
      ],
    },
    {
      phase: "DETECTION",
      color: "var(--amber)",
      icon: "🔍",
      title: "Verifying Authenticity",
      steps: [
        { n: "1", text: "The detector uses the secret key to know exactly which pixels to look at in each frame." },
        { n: "2", text: "It collects at least 60% of the total frames' shares (the threshold) and runs Lagrange interpolation to reconstruct the encrypted payload." },
        { n: "3", text: "The payload is decrypted and the digital signature is verified against the creator's public key." },
        { n: "4", text: "Result: confirmed creator ID, model version, and exact timestamp — or a clear rejection if tampered with." },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>
        {steps.map((phase, pi) => (
          <div key={pi}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
              paddingBottom: 12, borderBottom: `2px solid ${phase.color}`,
            }}>
              <span style={{ fontSize: 20 }}>{phase.icon}</span>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: phase.color, letterSpacing: "0.15em" }}>
                  PHASE: {phase.phase}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  {phase.title}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {phase.steps.map((s, si) => (
                <div key={si} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    border: `1px solid ${phase.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-mono)", fontSize: 10, color: phase.color,
                  }}>{s.n}</div>
                  <p style={{
                    fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)",
                    lineHeight: 1.7, margin: 0, paddingTop: 2,
                  }}>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Key insight callout */}
      <div className="panel" style={{
        padding: "28px 32px",
        borderLeft: "3px solid var(--cyan)",
        background: "rgba(100,200,220,0.04)",
        marginBottom: 24,
      }}>
        <div className="section-label" style={{ marginBottom: 10 }}>THE KEY INSIGHT</div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-primary)", lineHeight: 1.5, margin: "0 0 12px" }}>
          The same secret key that lets the detector find the watermark in milliseconds is the exact reason an attacker can't locate or remove it.
        </p>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
          It's not just a convenience — it's a single cryptographic guarantee that serves two opposite purposes simultaneously.
          The security doesn't rely on obscurity; it has a formal mathematical proof.
        </p>
      </div>

      {/* Threshold explainer */}
      <div className="panel" style={{ padding: 24 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>THE THRESHOLD: WHY 60%?</div>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
              The system requires at least 60% of frames to reconstruct the watermark. To prevent detection,
              an attacker must delete or corrupt more than 40% of all frames. At that point, the video is
              visually unwatchable — making the attack self-defeating.
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} style={{
                width: 12, height: 48,
                borderRadius: 3,
                background: i < 6 ? "var(--cyan)" : "var(--red)",
                opacity: i < 6 ? 0.8 : 0.4,
              }} />
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.1em" }}>
            <div style={{ color: "var(--cyan)", marginBottom: 4 }}>■ 6/10 needed to decode</div>
            <div style={{ color: "var(--red)" }}>■ Must destroy 4/10 to block</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabWhyItMatters() {
  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>

      {/* Novelty comparison */}
      <div style={{ marginBottom: 40 }}>
        <div className="section-label" style={{ marginBottom: 20 }}>HOW IT COMPARES TO EXISTING SYSTEMS</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%", borderCollapse: "collapse",
            fontFamily: "var(--font-mono)", fontSize: 11,
          }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-strong)" }}>
                {["System", "Temporal Split", "Threshold Shares", "Secret Key", "All 4 Together"].map((h, i) => (
                  <th key={i} style={{
                    padding: "10px 16px", textAlign: i === 0 ? "left" : "center",
                    color: "var(--text-tertiary)", letterSpacing: "0.1em", fontSize: 9,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Video Seal (Meta)", tmp: true, thr: false, key: false, all: false },
                { name: "VideoShield", tmp: true, thr: false, key: "partial", all: false },
                { name: "SynthID (Google)", tmp: "partial", thr: false, key: false, all: false },
                { name: "Christ-Gunn (CRYPTO '24)", tmp: false, thr: false, key: true, all: false },
                { name: "This Paper", tmp: true, thr: true, key: true, all: true, highlight: true },
              ].map((row, i) => {
                const cell = (val) => {
                  if (val === true) return <span style={{ color: "var(--green)" }}>✓</span>;
                  if (val === false) return <span style={{ color: "var(--red)", opacity: 0.5 }}>✗</span>;
                  if (val === "partial") return <span style={{ color: "var(--amber)" }}>~</span>;
                  return val;
                };
                return (
                  <tr key={i} style={{
                    borderBottom: "1px solid var(--border)",
                    background: row.highlight ? "rgba(100,200,200,0.05)" : "transparent",
                  }}>
                    <td style={{
                      padding: "12px 16px",
                      color: row.highlight ? "var(--cyan)" : "var(--text-primary)",
                      fontWeight: row.highlight ? 700 : 400,
                      fontFamily: row.highlight ? "var(--font-display)" : "var(--font-mono)",
                      fontSize: row.highlight ? 13 : 11,
                    }}>{row.name}</td>
                    {[row.tmp, row.thr, row.key, row.all].map((v, j) => (
                      <td key={j} style={{ padding: "12px 16px", textAlign: "center", fontSize: 16 }}>
                        {cell(v)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-tertiary)", marginTop: 12, lineHeight: 1.6 }}>
          As of early 2026, no published system combines all four properties into a unified framework. This paper defines that architecture for the first time.
        </p>
      </div>

      {/* Real-world impact */}
      <div style={{ marginBottom: 32 }}>
        <div className="section-label" style={{ marginBottom: 20 }}>REAL-WORLD IMPACT</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            {
              icon: "🇪🇺",
              title: "EU AI Act Compliance",
              body: "Article 50 of the EU AI Act requires machine-readable watermarks on all AI-generated audio-visual content. This framework is designed to meet that standard.",
              color: "var(--cyan)",
            },
            {
              icon: "🛡️",
              title: "Survives Re-encoding",
              body: "Unlike metadata tags, this watermark survives standard video re-encoding (H.264/H.265) because it's embedded in pixel data itself — not file headers.",
              color: "var(--green)",
            },
            {
              icon: "🔏",
              title: "Privacy-Preserving",
              body: "The watermark only reveals creator identity to an authorized detector. Nobody else — not even the video viewer — can read it.",
              color: "var(--amber)",
            },
            {
              icon: "⚡",
              title: "Fast Detection",
              body: "With the secret key, detection completes in under 2 seconds for a 40-frame clip. For a 5-minute 1080p video: under 10 seconds.",
              color: "var(--red)",
            },
          ].map((c, i) => (
            <div key={i} className="panel hover-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 24 }}>{c.icon}</span>
                <div>
                  <div style={{
                    fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
                    color: c.color, marginBottom: 6,
                  }}>{c.title}</div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>{c.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open problems */}
      <div className="panel" style={{ padding: 24, borderLeft: "3px solid var(--amber)" }}>
        <div className="section-label" style={{ marginBottom: 14 }}>OPEN PROBLEMS (WHAT'S STILL UNSOLVED)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "A formal mathematical proof that the pixel-level embedding is statistically undetectable (the text equivalent already exists).",
            "Optimal combination of Shamir shares + Tardos fingerprinting to maximize collusion resistance while preserving payload capacity.",
            "Quantifying how much a screen-recording (\"analog hole\") degrades the watermark across different recording hardware.",
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ color: "var(--amber)", fontFamily: "var(--font-mono)", fontSize: 11, flexShrink: 0, paddingTop: 2 }}>?{i + 1}</span>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>{p}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main WatermarkingPage
───────────────────────────────────────────── */

export function WatermarkingPage({ onBack, onLaunchTool }) {
  const [activeTab, setActiveTab] = useState("problem");

  const tabs = [
    { id: "problem", label: "The Problem", icon: "⚠️" },
    { id: "solution", label: "The Solution", icon: "💡" },
    { id: "howitworks", label: "How It Works", icon: "⚙️" },
    { id: "matters", label: "Why It Matters", icon: "🌍" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>

      {/* Page nav */}
      <nav style={{
        position: "sticky", top: 56, zIndex: 90,
        borderBottom: "1px solid var(--border-strong)",
        background: "rgba(248,243,225,0.95)", backdropFilter: "blur(12px)",
        padding: "0 40px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={onBack}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em",
            color: "var(--text-secondary)", background: "none", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            padding: "4px 0",
          }}
        >
          ← BACK TO VISIONX
        </button>

        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--amber)",
          letterSpacing: "0.12em",
        }}>
          RESEARCH EXPLAINER
        </div>
      </nav>

      {/* Page hero */}
      <div style={{
        padding: "56px 60px 48px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
      }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div className="section-label" style={{ marginBottom: 12 }}>RESEARCH BREAKDOWN</div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 52px)",
            fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: 16,
          }}>
            Threshold-Secured Temporal<br />
            <span style={{ color: "var(--cyan)" }}>Watermarking for AI Video</span>
          </h1>
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--text-secondary)",
            lineHeight: 1.8, maxWidth: 580, margin: 0,
          }}>
            A plain-language breakdown of the cryptographic provenance framework that makes AI-generated video traceable,
            tamper-evident, and identity-verified — without any visible mark.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        padding: "0 60px",
      }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "flex" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
              style={{ gap: 8 }}
            >
              <span>{t.icon}</span>
              <span>{t.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: "48px 60px 80px" }}>
        {activeTab === "problem"    && <TabProblem />}
        {activeTab === "solution"   && <TabSolution />}
        {activeTab === "howitworks" && <TabHowItWorks />}
        {activeTab === "matters"    && <TabWhyItMatters />}
      </div>

      {/* CTA Section */}
      <div style={{
        padding: "60px 60px 80px",
        borderTop: "2px solid var(--border-strong)",
        background: "var(--bg-secondary)",
      }}>
        <div style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700,
            color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 16,
          }}>
            Ready to embed or detect?
          </div>
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--text-secondary)",
            lineHeight: 1.8, marginBottom: 32, maxWidth: 640, margin: "0 auto 32px",
          }}>
            Use the watermarking tool to embed invisible forensic watermarks into your videos
            or verify the authenticity of existing content.
          </p>
          <button
            onClick={onLaunchTool}
            className="btn-primary btn-glow"
            style={{ fontSize: 13, padding: "16px 48px", marginBottom: 24 }}
          >
            <span>▶ LAUNCH WATERMARK TOOL</span>
          </button>
        </div>
      </div>
    </div>
  );
}