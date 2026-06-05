import { useState, useRef, useCallback } from "react";

const API_BASE = "http://localhost:8000";

/* ─────────────────────────────────────────────
   Shared sub-components
───────────────────────────────────────────── */

function DropZone({ label, accept, hint, file, onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }, [onFile]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDrag}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "var(--cyan)" : file ? "var(--green)" : "var(--border)"}`,
        borderRadius: 4,
        padding: "32px 24px",
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color 0.2s ease, background 0.2s ease",
        background: dragging
          ? "rgba(100,200,220,0.04)"
          : file
          ? "rgba(80,180,100,0.03)"
          : "transparent",
        position: "relative",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />

      {file ? (
        <div>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📹</div>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
            color: "var(--green)", marginBottom: 4,
          }}>
            {file.name}
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)",
            letterSpacing: "0.1em",
          }}>
            {(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>↑</div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)",
            letterSpacing: "0.12em", marginBottom: 6,
          }}>
            {label}
          </div>
          <div style={{
            fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-tertiary)",
          }}>
            {hint}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)",
        letterSpacing: "0.15em", marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
      {hint && (
        <div style={{
          fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-tertiary)",
          marginTop: 4, lineHeight: 1.5,
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "var(--bg-primary)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)", fontSize: 12,
  padding: "10px 14px", borderRadius: 3,
  outline: "none",
};

function StatusBadge({ status }) {
  const map = {
    idle:      { dot: "var(--text-tertiary)", label: "IDLE" },
    loading:   { dot: "var(--amber)",         label: "PROCESSING…", pulse: true },
    success:   { dot: "var(--green)",          label: "COMPLETE" },
    error:     { dot: "var(--red)",            label: "ERROR" },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)",
      letterSpacing: "0.14em",
    }}>
      <span style={{
        color: s.dot, fontSize: 12,
        animation: s.pulse ? "pulse-cyan 1.5s infinite" : "none",
      }}>●</span>
      {s.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   EMBED PANEL
───────────────────────────────────────────── */

function EmbedPanel() {
  const [file, setFile]             = useState(null);
  const [creatorId, setCreatorId]   = useState("visionx_system");
  const [modelId, setModelId]       = useState("visionx_local_inference");
  const [strength, setStrength]     = useState(1.0);
  const [showAdvanced, setShowAdv]  = useState(false);
  const [status, setStatus]         = useState("idle");
  const [error, setError]           = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadName, setDownloadName] = useState(null);

  const handleEmbed = async () => {
    if (!file) return;
    setStatus("loading");
    setError(null);
    setDownloadUrl(null);

    const form = new FormData();
    form.append("file", file);
    form.append("creator_id", creatorId);
    form.append("model_id", modelId);
    form.append("strength", String(strength));

    try {
      const res = await fetch(`${API_BASE}/watermark/embed`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(json.detail || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition") || "";
      const nameMatch = disposition.match(/filename="?([^"]+)"?/);
      const fname = nameMatch ? nameMatch[1] : `watermarked_${file.name}.mkv`;

      setDownloadUrl(url);
      setDownloadName(fname);
      setStatus("success");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null); setStatus("idle"); setError(null);
    setDownloadUrl(null); setDownloadName(null);
  };

  return (
    <div>
      {/* Upload */}
      <div className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)",
          letterSpacing: "0.15em", marginBottom: 14,
        }}>STEP 01 · UPLOAD VIDEO</div>
        <DropZone
          label="DROP VIDEO FILE OR CLICK TO BROWSE"
          accept=".mp4,.avi,.mov,.mkv"
          hint="Accepted: .mp4 · .avi · .mov · .mkv"
          file={file}
          onFile={setFile}
        />
      </div>

      {/* Advanced settings toggle */}
      <div className="panel" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
        <button
          onClick={() => setShowAdv(!showAdvanced)}
          style={{
            width: "100%", padding: "14px 24px",
            background: "none", border: "none", cursor: "pointer",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
        >
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)",
            letterSpacing: "0.15em",
          }}>
            STEP 02 · ADVANCED OPTIONS (OPTIONAL)
          </span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-tertiary)",
            transform: showAdvanced ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
          }}>›</span>
        </button>

        {showAdvanced && (
          <div style={{ padding: "0 24px 24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ height: 20 }} />

            <FieldRow
              label="CREATOR ID"
              hint="Identifies who generated this video. Embedded invisibly into the watermark."
            >
              <input
                style={inputStyle}
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
                placeholder="visionx_system"
              />
            </FieldRow>

            <FieldRow
              label="MODEL ID"
              hint="The model or pipeline that produced the video."
            >
              <input
                style={inputStyle}
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="visionx_local_inference"
              />
            </FieldRow>

            <FieldRow
              label={`EMBEDDING STRENGTH · ${strength.toFixed(1)}`}
              hint="Higher values are more robust but may introduce slight visual noise. Recommended: 1.0"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range" min="0.1" max="3.0" step="0.1"
                  value={strength}
                  onChange={(e) => setStrength(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--cyan)" }}
                />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 12,
                  color: "var(--cyan)", minWidth: 32, textAlign: "right",
                }}>
                  {strength.toFixed(1)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                {["0.1\nSubtle", "1.0\nBalanced", "3.0\nStrong"].map((t, i) => (
                  <span key={i} style={{
                    fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-tertiary)",
                    letterSpacing: "0.1em", whiteSpace: "pre-line", textAlign: "center",
                  }}>{t}</span>
                ))}
              </div>
            </FieldRow>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)",
          letterSpacing: "0.15em", marginBottom: 14,
        }}>STEP 03 · EMBED & DOWNLOAD</div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            onClick={handleEmbed}
            disabled={!file || status === "loading"}
            style={{
              fontSize: 11, padding: "12px 28px",
              opacity: !file || status === "loading" ? 0.45 : 1,
              cursor: !file || status === "loading" ? "not-allowed" : "pointer",
            }}
          >
            {status === "loading" ? "⟳ EMBEDDING…" : "▶ EMBED WATERMARK"}
          </button>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Result */}
      {status === "success" && downloadUrl && (
        <div className="panel" style={{
          padding: 24, borderLeft: "3px solid var(--green)",
          background: "rgba(80,180,100,0.04)",
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--green)",
            letterSpacing: "0.15em", marginBottom: 14,
          }}>✓ WATERMARK EMBEDDED SUCCESSFULLY</div>

          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <a
              href={downloadUrl}
              download={downloadName}
              className="btn-primary"
              style={{
                textDecoration: "none", fontSize: 11, padding: "12px 28px",
                display: "inline-block",
              }}
            >
              ↓ DOWNLOAD WATERMARKED VIDEO
            </a>

            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-secondary)" }}>
              <div style={{ marginBottom: 2 }}>
                <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 9 }}>FORMAT · </span>
                Lossless MKV container
              </div>
              <div>
                <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 9 }}>NOTE · </span>
                Keep the .wm_meta.json file for robust detection
              </div>
            </div>
          </div>

          <button
            onClick={reset}
            style={{
              marginTop: 16, background: "none", border: "none",
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)",
              letterSpacing: "0.12em", cursor: "pointer", padding: 0,
            }}
          >
            ← EMBED ANOTHER VIDEO
          </button>
        </div>
      )}

      {status === "error" && error && (
        <div className="panel" style={{
          padding: 20, borderLeft: "3px solid var(--red)",
          background: "rgba(220,80,60,0.04)",
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)",
            letterSpacing: "0.15em", marginBottom: 8,
          }}>✕ PIPELINE ERROR</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)" }}>
            {error}
          </div>
          <button
            onClick={reset}
            style={{
              marginTop: 12, background: "none", border: "none",
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)",
              letterSpacing: "0.12em", cursor: "pointer", padding: 0,
            }}
          >
            ← TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DETECT PANEL
───────────────────────────────────────────── */

function DetectPanel() {
  const [file, setFile]       = useState(null);
  const [metaFile, setMeta]   = useState(null);
  const [status, setStatus]   = useState("idle");
  const [error, setError]     = useState(null);
  const [result, setResult]   = useState(null);
  const metaRef               = useRef(null);

  const handleDetect = async () => {
    if (!file) return;
    setStatus("loading");
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    if (metaFile) form.append("meta_file", metaFile);

    try {
      const res = await fetch(`${API_BASE}/watermark/detect`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(json.detail || `HTTP ${res.status}`);
      }

      const json = await res.json();
      setResult(json);
      setStatus("success");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null); setMeta(null);
    setStatus("idle"); setError(null); setResult(null);
  };

  const isVerified = result?.status === "verified";

  return (
    <div>
      {/* Primary upload */}
      <div className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)",
          letterSpacing: "0.15em", marginBottom: 14,
        }}>STEP 01 · UPLOAD VIDEO TO SCAN</div>
        <DropZone
          label="DROP VIDEO FILE OR CLICK TO BROWSE"
          accept=".mp4,.avi,.mov,.mkv"
          hint="Accepted: .mp4 · .avi · .mov · .mkv"
          file={file}
          onFile={setFile}
        />
      </div>

      {/* Optional meta file */}
      <div className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--amber)",
            letterSpacing: "0.15em",
          }}>STEP 02 · METADATA FILE (OPTIONAL BUT RECOMMENDED)</div>
          <span className="tag" style={{
            fontFamily: "var(--font-mono)", fontSize: 8, padding: "2px 8px",
            border: "1px solid var(--border)", color: "var(--text-tertiary)",
          }}>
            .wm_meta.json
          </span>
        </div>

        <p style={{
          fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-tertiary)",
          lineHeight: 1.6, marginBottom: 14,
        }}>
          The metadata file is generated alongside the watermarked video during embedding.
          Providing it enables dynamic threshold detection — without it, strict config defaults apply.
        </p>

        {metaFile ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            border: "1px solid var(--green)", borderRadius: 3,
            background: "rgba(80,180,100,0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)" }}>
                {metaFile.name}
              </span>
            </div>
            <button
              onClick={() => setMeta(null)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)",
              }}
            >✕ REMOVE</button>
          </div>
        ) : (
          <button
            onClick={() => metaRef.current?.click()}
            style={{
              background: "none",
              border: "1px dashed var(--border)",
              borderRadius: 3, padding: "10px 18px",
              fontFamily: "var(--font-mono)", fontSize: 9,
              color: "var(--text-secondary)", letterSpacing: "0.12em",
              cursor: "pointer",
            }}
          >
            + ATTACH .wm_meta.json
          </button>
        )}
        <input
          ref={metaRef} type="file" accept=".json"
          style={{ display: "none" }}
          onChange={(e) => e.target.files[0] && setMeta(e.target.files[0])}
        />
      </div>

      {/* Submit */}
      <div className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)",
          letterSpacing: "0.15em", marginBottom: 14,
        }}>STEP 03 · RUN DETECTION</div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            onClick={handleDetect}
            disabled={!file || status === "loading"}
            style={{
              fontSize: 11, padding: "12px 28px",
              opacity: !file || status === "loading" ? 0.45 : 1,
              cursor: !file || status === "loading" ? "not-allowed" : "pointer",
            }}
          >
            {status === "loading" ? "⟳ SCANNING FRAMES…" : "🔍 DETECT WATERMARK"}
          </button>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Verified result */}
      {status === "success" && result && isVerified && (
        <div className="panel" style={{
          padding: 28, borderLeft: "3px solid var(--green)",
          background: "rgba(80,180,100,0.04)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--green)",
                letterSpacing: "0.15em", marginBottom: 2,
              }}>WATERMARK VERIFIED</div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700,
                color: "var(--text-primary)",
              }}>Authentic · Identity Confirmed</div>
            </div>
          </div>

          {/* Metadata grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20,
          }}>
            {[
              { key: "CREATOR ID",     val: result.metadata?.creator_id,  color: "var(--cyan)" },
              { key: "MODEL ID",       val: result.metadata?.model_id,    color: "var(--amber)" },
              { key: "TIMESTAMP",      val: result.metadata?.timestamp
                ? new Date(result.metadata.timestamp).toLocaleString()
                : "—",                                                    color: "var(--text-secondary)" },
              { key: "FRAMES USED",    val: result.frames_analyzed,       color: "var(--green)" },
            ].map((row, i) => (
              <div key={i} style={{
                padding: "14px 16px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: 3,
              }}>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-tertiary)",
                  letterSpacing: "0.15em", marginBottom: 6,
                }}>{row.key}</div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 12, color: row.color,
                  wordBreak: "break-all",
                }}>{row.val || "—"}</div>
              </div>
            ))}
          </div>

          {/* Video hash */}
          {result.metadata?.video_hash && (
            <div style={{
              padding: "12px 16px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 3, marginBottom: 16,
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-tertiary)",
                letterSpacing: "0.15em", marginBottom: 6,
              }}>VIDEO HASH (SHA-256)</div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)",
                wordBreak: "break-all", lineHeight: 1.5,
              }}>{result.metadata.video_hash}</div>
            </div>
          )}

          <button
            onClick={reset}
            style={{
              background: "none", border: "none",
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)",
              letterSpacing: "0.12em", cursor: "pointer", padding: 0,
            }}
          >
            ← SCAN ANOTHER VIDEO
          </button>
        </div>
      )}

      {/* Unverified result */}
      {status === "success" && result && !isVerified && (
        <div className="panel" style={{
          padding: 28, borderLeft: "3px solid var(--red)",
          background: "rgba(220,80,60,0.04)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
          }}>
            <span style={{ fontSize: 24 }}>🚫</span>
            <div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)",
                letterSpacing: "0.15em", marginBottom: 2,
              }}>VERIFICATION FAILED</div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700,
                color: "var(--text-primary)",
              }}>No Valid Watermark Found</div>
            </div>
          </div>

          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)",
            lineHeight: 1.7, marginBottom: 16,
          }}>
            {result.message || "Watermark missing, corrupted, or forged."}
          </p>

          <div style={{
            padding: "12px 16px",
            background: "var(--bg-primary)", border: "1px solid var(--border)",
            borderRadius: 3, marginBottom: 16,
          }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-tertiary)",
              letterSpacing: "0.15em", marginBottom: 8,
            }}>POSSIBLE CAUSES</div>
            {[
              "Video was not watermarked by this system.",
              "Too many frames were removed or corrupted (below reconstruction threshold).",
              "The watermark was tampered with or the video was heavily re-encoded.",
            ].map((c, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6,
              }}>
                <span style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 10, flexShrink: 0 }}>—</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>{c}</span>
              </div>
            ))}
          </div>

          <button
            onClick={reset}
            style={{
              background: "none", border: "none",
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)",
              letterSpacing: "0.12em", cursor: "pointer", padding: 0,
            }}
          >
            ← SCAN ANOTHER VIDEO
          </button>
        </div>
      )}

      {/* API error */}
      {status === "error" && error && (
        <div className="panel" style={{
          padding: 20, borderLeft: "3px solid var(--red)",
          background: "rgba(220,80,60,0.04)",
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--red)",
            letterSpacing: "0.15em", marginBottom: 8,
          }}>✕ API ERROR</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-secondary)" }}>
            {error}
          </div>
          <button
            onClick={reset}
            style={{
              marginTop: 12, background: "none", border: "none",
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)",
              letterSpacing: "0.12em", cursor: "pointer", padding: 0,
            }}
          >
            ← TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main WatermarkTool page
───────────────────────────────────────────── */

export function WatermarkTool({ onBack }) {
  const [mode, setMode] = useState("embed"); // "embed" | "detect"

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>

      {/* Sub-nav */}
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
          ← BACK TO RESEARCH
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)",
            letterSpacing: "0.12em",
          }}>
            API · {API_BASE}
          </span>
          <span className="tag tag-green">● READY</span>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        padding: "56px 60px 48px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
      }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div className="section-label" style={{ marginBottom: 12 }}>LIVE TOOL · TEMPORAL WATERMARKING</div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: 16,
          }}>
            Watermark <span style={{ color: "var(--cyan)" }}>Embed</span> &amp;{" "}
            <span style={{ color: "var(--amber)" }}>Detect</span>
          </h1>
          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--text-secondary)",
            lineHeight: 1.8, maxWidth: 560, margin: 0,
          }}>
            Stamp an invisible cryptographic identity into any AI-generated video,
            or scan a video to verify its provenance and creator metadata.
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        padding: "0 60px",
      }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "flex" }}>
          {[
            { id: "embed",  icon: "📥", label: "EMBED WATERMARK",  color: "var(--cyan)"  },
            { id: "detect", icon: "🔍", label: "DETECT WATERMARK", color: "var(--amber)" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`tab-btn ${mode === m.id ? "active" : ""}`}
              style={{ gap: 8 }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tool content */}
      <div style={{ padding: "48px 60px 80px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>

          {/* Context strip */}
          <div style={{
            display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap",
          }}>
            {mode === "embed" ? (
              <>
                <div style={{
                  padding: "8px 14px", border: "1px solid var(--border)",
                  borderRadius: 3, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ color: "var(--cyan)", fontSize: 10 }}>●</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.12em" }}>
                    OUTPUT: LOSSLESS .MKV + .WM_META.JSON
                  </span>
                </div>
                <div style={{
                  padding: "8px 14px", border: "1px solid var(--border)",
                  borderRadius: 3, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ color: "var(--amber)", fontSize: 10 }}>●</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.12em" }}>
                    4-LAYER CRYPTOGRAPHIC EMBEDDING
                  </span>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  padding: "8px 14px", border: "1px solid var(--border)",
                  borderRadius: 3, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ color: "var(--amber)", fontSize: 10 }}>●</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.12em" }}>
                    ECDSA SIGNATURE VERIFICATION
                  </span>
                </div>
                <div style={{
                  padding: "8px 14px", border: "1px solid var(--border)",
                  borderRadius: 3, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ color: "var(--green)", fontSize: 10 }}>●</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.12em" }}>
                    SHAMIR SHARE RECONSTRUCTION
                  </span>
                </div>
              </>
            )}
          </div>

          {mode === "embed"  && <EmbedPanel />}
          {mode === "detect" && <DetectPanel />}
        </div>
      </div>
    </div>
  );
}