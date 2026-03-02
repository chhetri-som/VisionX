import { useState, useRef, useEffect } from "react";
import { HeatmapView } from "./components/HeatmapView";
import { ConfidenceGauge } from "./components/ConfidenceGauge";
import { TellSigns } from "./components/TellSigns";
import { FacialAnalysis } from "./components/FacialAnalysis";
import ForensicsPanel from "./components/ForensicsPanel"; 

export const ImageMode = () => {
  const [showMediaPipe, setShowMediaPipe] = useState(false);
  const [analyzed,      setAnalyzed]      = useState(false);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [result,        setResult]        = useState(null);
  const [previewUrl,    setPreviewUrl]    = useState(null);
  const [selectedFace,  setSelectedFace]  = useState(0);
  const [selectedFile,  setSelectedFile]  = useState(null); 
  const fileInputRef = useRef(null);

  const analyzeFile = async (file) => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    setAnalyzing(true);
    setAnalyzed(false);
    setResult(null);
    setShowMediaPipe(false);
    setSelectedFace(0);

    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch(`${API_BASE}/analyze/image`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        let detail = "Request failed";
        try { detail = (await res.json())?.detail || detail; } catch { /* ignore */ }
        throw new Error(`${detail} (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
      setAnalyzed(true);
    } catch (e) {
      setResult({ face_detected: false, error: e?.message || "Failed to analyze image." });
      setAnalyzed(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file); 
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    analyzeFile(file);
  };

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const faces      = result?.faces ?? [];
  const face       = faces[selectedFace] ?? null;
  const multiface  = faces.length > 1;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>

      {/* ── Left: Image viewer ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* Upload prompt */}
        {!analyzed && !analyzing && (
          <div
            onClick={handlePickFile}
            style={{
              border: "1px dashed rgba(0,229,255,0.2)", borderRadius: 2,
              background: "var(--bg-surface)", aspectRatio: "4/3",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
              cursor: "pointer", transition: "border-color 0.2s",
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
                Click to upload (JPG / PNG)
              </div>
            </div>
          </div>
        )}

        {/* Analysing spinner */}
        {analyzing && (
          <div style={{
            border: "1px solid var(--border)", borderRadius: 2,
            background: "var(--bg-surface)", aspectRatio: "4/3",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 24,
          }}>
            <div style={{ position: "relative", width: 64, height: 64 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                border: "2px solid rgba(0,229,255,0.1)",
                borderTop: "2px solid var(--cyan)",
                animation: "spin-slow 1s linear infinite",
              }} />
              <div style={{
                position: "absolute", inset: 8, borderRadius: "50%",
                border: "2px solid rgba(255,45,85,0.1)",
                borderBottom: "2px solid var(--red)",
                animation: "spin-slow 1.5s linear infinite reverse",
              }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", marginBottom: 6 }}>
                ANALYSING IMAGE...
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.15em" }}>
                Face Detection · Classification · Mesh Mapping
              </div>
            </div>
          </div>
        )}

        {/* Analysed view */}
        {analyzed && (
          <>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="section-label">SOURCE IMAGE</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="tag tag-cyan"
                  style={{ cursor: "pointer", border: "1px solid var(--border-strong)", padding: "6px 14px", fontFamily: "var(--font-mono)", fontSize: 10, background: "var(--cyan-ghost)", color: "var(--cyan)" }}
                  onClick={handlePickFile}
                >
                  ⟳ NEW IMAGE
                </button>
                <button
                  className="tag tag-amber"
                  style={{
                    cursor: "pointer", border: "1px solid var(--border-strong)",
                    padding: "6px 14px", fontFamily: "var(--font-mono)", fontSize: 10,
                    background: showMediaPipe ? "var(--amber)" : "var(--amber-ghost)",
                    color:      showMediaPipe ? "var(--bg-void)" : "var(--amber)",
                  }}
                  onClick={() => setShowMediaPipe(v => !v)}
                >
                  {showMediaPipe ? "◉ FACIAL MESH ON" : "○ FACIAL MESH OFF"}
                </button>
              </div>
            </div>

            {/* API error banner */}
            {result?.error && (
              <div className="panel" style={{ padding: 14, borderColor: "rgba(255,45,85,0.25)", background: "rgba(255,45,85,0.06)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--red)", letterSpacing: "0.12em" }}>ERROR</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                  {result.error}
                </div>
              </div>
            )}

            {/* Image + mesh overlay */}
            <div style={{ position: "relative", borderRadius: 2, aspectRatio: "4/3", background: "#0a0d14", overflow: "hidden" }}>
              <HeatmapView
                imageUrl={previewUrl}
                faces={faces}
                showMediaPipe={showMediaPipe}
              />
            </div>

            {/* 4. Deep Forensic Panel */}
            <ForensicsPanel selectedFile={selectedFile} analysisResult={result} />
          </>
        )}
      </div>

      {/* ── Right: Sidebar ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Face selector tabs — only shown when 2+ faces */}
        {analyzed && multiface && (
          <div className="panel" style={{ padding: "10px 12px" }}>
            <div className="section-label" style={{ marginBottom: 8 }}>SELECT FACE</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {faces.map((f, idx) => {
                const isActive = idx === selectedFace;
                const tabColor =
                  f.label === "fake"      ? "var(--red)"   :
                  f.label === "uncertain" ? "var(--amber)" :
                                            "var(--cyan)";
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedFace(idx)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      padding: "5px 10px",
                      borderRadius: 3,
                      cursor: "pointer",
                      border: `1px solid ${tabColor}`,
                      background: isActive ? tabColor : "transparent",
                      color: isActive ? "var(--bg-void)" : tabColor,
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    FACE {idx + 1} · {(f.label ?? "—").toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Confidence gauge */}
        <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="section-label">CLASSIFIER SCORE</span>
          <ConfidenceGauge value={analyzed && face ? Math.round((Number(face.confidence) || 0) * 100) : 0} />
          {analyzed && face && (
            <div style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-dim)", textAlign: "center", letterSpacing: "0.08em" }}>
              EfficientNet-B0{multiface ? ` · Face ${selectedFace + 1} of ${faces.length}` : ""}
            </div>
          )}
        </div>

        {/* Classifier verdict */}
        {analyzed && face && (
          <div className="panel" style={{ padding: 16 }}>
            <div className="section-label" style={{ marginBottom: 12 }}>CLASSIFIER VERDICT</div>
            <TellSigns findings={face.findings} label={face.label} />
          </div>
        )}

        {/* Structural metrics */}
        {analyzed && face && (
          <FacialAnalysis
            landmarks={face.landmarks}
            face_confidence={face.face_confidence}
            bbox={face.bbox}
            landmarkerData={face.landmarker_data}
          />
        )}

        {/* Execution time */}
        {analyzed && result?.execution_time_ms != null && (
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-dim)", letterSpacing: "0.08em" }}>
            Analysed in {result.execution_time_ms} ms
          </div>
        )}

        {!analyzed && (
          <div className="panel" style={{ padding: 20, textAlign: "center", opacity: 0.4 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
              Upload an image to begin analysis
            </div>
          </div>
        )}
      </div>
    </div>
  );
};