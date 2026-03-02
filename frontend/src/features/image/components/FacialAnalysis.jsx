import React from "react";

// ── Small metric card ────────────────────────────────────────────────────────
const MetricCard = ({ label, value, sub }) => (
  <div style={{
    padding: "10px 12px",
    background: "var(--bg-inset)",
    border: "1px solid var(--border)",
    borderRadius: 4,
  }}>
    <div style={{
      fontFamily: "var(--font-mono)",
      fontSize: 8,
      color: "var(--text-dim)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginBottom: 6,
    }}>
      {label}
    </div>
    <div style={{
      fontFamily: "var(--font-mono)",
      fontSize: 15,
      fontWeight: 600,
      color: "var(--text-primary)",
      lineHeight: 1,
    }}>
      {value}
    </div>
    {sub && (
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 8,
        color: "var(--text-dim)",
        marginTop: 4,
        letterSpacing: "0.04em",
      }}>
        {sub}
      </div>
    )}
  </div>
);

// ── Divider row ───────────────────────────────────────────────────────────────
const SectionHead = ({ label }) => (
  <div style={{
    fontFamily: "var(--font-mono)",
    fontSize: 8,
    color: "var(--text-dim)",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 2,
    paddingBottom: 4,
    borderBottom: "1px solid var(--border)",
  }}>
    {label}
  </div>
);

// ── Component ────────────────────────────────────────────────────────────────
export const FacialAnalysis = ({ landmarks, face_confidence, bbox, landmarkerData }) => {
  if (!landmarks || landmarks.length === 0) {
    return (
      <div className="panel" style={{ padding: 16, opacity: 0.5 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>STRUCTURAL METRICS</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "center" }}>
          No landmark data available
        </div>
      </div>
    );
  }

  const eye   = landmarkerData?.eye_analysis   ?? {};
  const mouth = landmarkerData?.mouth_analysis ?? {};
  const qual  = landmarkerData?.face_quality   ?? {};

  const fmtPx  = (v) => v != null ? `${Number(v).toFixed(1)} px` : "—";
  const fmtPct = (v) => v != null ? `${Number(v).toFixed(1)} %`  : "—";
  const fmtRat = (v) => v != null ? Number(v).toFixed(3)          : "—";

  // Bounding-box dimensions as a quick size reference
  const bboxW = bbox ? bbox[2] - bbox[0] : null;
  const bboxH = bbox ? bbox[3] - bbox[1] : null;

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="section-label" style={{ marginBottom: 12 }}>STRUCTURAL METRICS</div>

      {/* ── Detection region ── */}
      <SectionHead label="Detection Region" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <MetricCard
          label="Region Width"
          value={bboxW != null ? `${bboxW} px` : "—"}
          sub="Padded bounding box"
        />
        <MetricCard
          label="Region Height"
          value={bboxH != null ? `${bboxH} px` : "—"}
          sub="Padded bounding box"
        />
        <MetricCard
          label="MP Confidence"
          value={face_confidence != null ? fmtPct(face_confidence * 100) : "—"}
          sub="MediaPipe detection score"
        />
        <MetricCard
          label="Landmark Coverage"
          value={fmtPct(qual.completeness_percent)}
          sub={`${qual.landmark_count ?? "—"} / ${qual.total_expected ?? 468} pts`}
        />
      </div>

      {/* ── Eye geometry ── */}
      <SectionHead label="Eye Geometry" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <MetricCard
          label="Inter-Eye Distance"
          value={fmtPx(eye.eye_distance_px)}
          sub="Horizontal centre-to-centre"
        />
        <MetricCard
          label="Vertical Offset"
          value={fmtPx(eye.eye_vertical_offset_px)}
          sub="Height difference between centres"
        />
        <MetricCard
          label="Asymmetry Index"
          value={fmtPct(eye.eye_asymmetry_percent)}
          sub="Offset / distance × 100"
        />
      </div>

      {/* ── Mouth geometry ── */}
      <SectionHead label="Mouth Geometry" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <MetricCard
          label="Width"
          value={fmtPx(mouth.mouth_width_px)}
          sub="Outer lip span"
        />
        <MetricCard
          label="Height"
          value={fmtPx(mouth.mouth_height_px)}
          sub="Outer lip span"
        />
        <MetricCard
          label="Aspect Ratio"
          value={fmtRat(mouth.mouth_ratio)}
          sub="Height / Width"
        />
      </div>

      {/* ── Spread ── */}
      <SectionHead label="Landmark Spread" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        <MetricCard
          label="Spatial Variance"
          value={qual.landmark_variance != null ? Number(qual.landmark_variance).toFixed(0) : "—"}
          sub="Pixel² variance across all 468 points"
        />
      </div>

      {/* ── Footer note ── */}
      <div style={{
        marginTop: 12,
        padding: "8px 10px",
        background: "var(--bg-inset)",
        border: "1px solid var(--border)",
        borderRadius: 3,
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-dim)", letterSpacing: "0.06em", lineHeight: 1.5 }}>
          Measurements are derived from MediaPipe's 468-point facial mesh.
          These figures describe face geometry — they do not indicate manipulation.
        </div>
      </div>
    </div>
  );
};