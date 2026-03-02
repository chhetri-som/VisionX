import React, { useState } from 'react';

// ─── Severity config — mapped to the earthy/olive theme from index.css ───────
const SEV = {
  clean: {
    icon: '✓',
    label: 'CLEAN',
    color: 'var(--green)',
    bg: 'var(--green-ghost)',
    border: 'rgba(92, 138, 60, 0.35)',
    bar: 'var(--green)',
  },
  suspicious: {
    icon: '⚠',
    label: 'SUSPICIOUS',
    color: 'var(--amber)',
    bg: 'rgba(184, 134, 11, 0.08)',
    border: 'rgba(184, 134, 11, 0.35)',
    bar: 'var(--amber)',
  },
  anomalous: {
    icon: '✕',
    label: 'ANOMALOUS',
    color: 'var(--red)',
    bg: 'var(--red-ghost)',
    border: 'rgba(184, 76, 58, 0.35)',
    bar: 'var(--red)',
  },
};

const VERDICT_CFG = {
  green: {
    bg: 'rgba(92, 138, 60, 0.07)',
    border: 'rgba(92, 138, 60, 0.3)',
    color: 'var(--green)',
    dimColor: 'var(--accent-green-dim)',
  },
  amber: {
    bg: 'rgba(184, 134, 11, 0.07)',
    border: 'rgba(184, 134, 11, 0.3)',
    color: 'var(--amber)',
    dimColor: '#8a6300',
  },
  red: {
    bg: 'var(--red-ghost)',
    border: 'rgba(184, 76, 58, 0.3)',
    color: 'var(--red)',
    dimColor: 'var(--accent-red-dim)',
  },
};

// ─── Descriptions shown to user per signal type ───────────────────────────────
const SIGNAL_DESC = {
  metadata: 'Real cameras embed invisible metadata (make, model, lens, timestamp). AI generators usually strip this entirely or leave a software signature.',
  ela: 'Re-compresses the image and amplifies differences. Spliced faces compress differently from the original background — bright patches in the face region indicate manipulation.',
  noise: 'Every camera sensor has a unique, uniform noise fingerprint. AI-generated regions or spliced content disrupt this pattern — highlighted cells mark statistical outliers.',
  frequency: 'AI generators (GANs, diffusion models) leave periodic grid artefacts in frequency space due to their upsampling layers. Real photos have smooth frequency distributions.',
};

// ─── Single signal row with expand/collapse ───────────────────────────────────
const SignalRow = ({ signal, index }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEV[signal.severity] || SEV.suspicious;
  const canExpand = !!(signal.visualization || signal.detail || signal.raw);

  return (
    <div
      style={{
        borderRadius: 6,
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        overflow: 'hidden',
        animation: `fadeIn 0.35s ${index * 0.07}s ease-out both`,
      }}
    >
      {/* ── Header row ── */}
      <div
        onClick={() => canExpand && setExpanded(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 14px',
          cursor: canExpand ? 'pointer' : 'default',
        }}
      >
        {/* Severity badge */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: `1.5px solid ${cfg.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: cfg.color,
            flexShrink: 0,
          }}
        >
          {cfg.icon}
        </div>

        {/* Label + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: 2,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {signal.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                letterSpacing: '0.08em',
                color: cfg.color,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 3,
                padding: '1px 5px',
              }}
            >
              {cfg.label}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}
          >
            {signal.summary}
          </div>
        </div>

        {/* Score */}
        <div style={{ width: 52, flexShrink: 0, textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              fontWeight: 700,
              color: cfg.color,
              lineHeight: 1,
              marginBottom: 5,
            }}
          >
            {signal.score}
          </div>
          <div
            style={{
              height: 3,
              background: 'var(--bg-tertiary)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${signal.score}%`,
                background: cfg.bar,
                borderRadius: 2,
                transition: 'width 0.7s ease',
              }}
            />
          </div>
        </div>

        {/* Chevron */}
        {canExpand && (
          <div
            style={{
              color: 'var(--text-dim)',
              fontSize: 9,
              flexShrink: 0,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.18s',
              marginLeft: 2,
            }}
          >
            ▼
          </div>
        )}
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${cfg.border}`,
            padding: '12px 14px',
            background: 'rgba(248, 243, 225, 0.55)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* How-to-read description */}
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: 'var(--text-tertiary)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            <strong style={{ color: 'var(--text-secondary)' }}>What this checks: </strong>
            {SIGNAL_DESC[signal.id] || ''}
          </p>

          {/* Technical detail */}
          {signal.detail && (
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-dim)',
                lineHeight: 1.6,
                margin: 0,
                padding: '8px 10px',
                background: 'var(--bg-inset)',
                borderRadius: 4,
                border: '1px solid var(--border-light)',
              }}
            >
              {signal.detail}
            </p>
          )}

          {/* Visualisation image */}
          {signal.visualization && (
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Visualisation
              </div>
              <img
                src={signal.visualization}
                alt={`${signal.label} visualisation`}
                style={{
                  width: '100%',
                  maxWidth: 420,
                  borderRadius: 4,
                  border: '1px solid var(--border-medium)',
                  display: 'block',
                }}
              />
            </div>
          )}

          {/* Raw EXIF data for metadata signal */}
          {signal.id === 'metadata' && signal.raw && Object.keys(signal.raw).length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Raw EXIF fields
              </div>
              <div
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 4,
                  padding: '8px 10px',
                  maxHeight: 150,
                  overflowY: 'auto',
                }}
              >
                {Object.entries(signal.raw)
                  .slice(0, 24)
                  .map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: 'flex',
                        gap: 8,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        lineHeight: 1.75,
                        color: 'var(--text-dim)',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--text-tertiary)',
                          minWidth: 130,
                          flexShrink: 0,
                        }}
                      >
                        {k}
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────
const ForensicsPanel = ({ selectedFile, analysisResult }) => {
  const [forensicData, setForensicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runForensics = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setForensicData(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Pass face bounding box from the ML model result if available.
    // IMPORTANT: Your ML model bbox must be normalised to 0–1 before sending.
    // If your model returns pixel coordinates, divide x values by image width
    // and y values by image height first (see note in image_route_addition.py).
    const faces = analysisResult?.faces;
    if (faces && faces.length > 0 && faces[0].bbox) {
      const bbox = faces[0].bbox;
      const b = Array.isArray(bbox)
        ? { x1: bbox[0], y1: bbox[1], x2: bbox[2], y2: bbox[3] }
        : bbox;

      // Get image dimensions for normalisation
      const img = new Image();
      const { width: imageWidth, height: imageHeight } = await new Promise((resolve) => {
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = URL.createObjectURL(selectedFile);
      });
      URL.revokeObjectURL(img.src);

      // Normalise pixel coordinates to 0-1 range
      const normX1 = (b.x1 ?? 0) / imageWidth;
      const normY1 = (b.y1 ?? 0) / imageHeight;
      const normX2 = (b.x2 ?? imageWidth) / imageWidth;
      const normY2 = (b.y2 ?? imageHeight) / imageHeight;

      formData.append('has_face', 'true');
      formData.append('face_x1', String(normX1));
      formData.append('face_y1', String(normY1));
      formData.append('face_x2', String(normX2));
      formData.append('face_y2', String(normY2));
    } else {
      formData.append('has_face', 'false');
    }

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${API_BASE}/image/forensics`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        let msg = `Server error ${res.status}`;
        try { msg = (await res.json())?.detail || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      setForensicData(await res.json());
    } catch (err) {
      setError(err.message || 'Forensic analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const verdict = forensicData?.verdict;
  const vcfg = verdict ? (VERDICT_CFG[verdict.color] || VERDICT_CFG.amber) : null;

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* ── Panel header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 16px',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--bg-panel)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            Digital Forensics
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Advanced Image Analysis
          </div>
        </div>

        <button
          onClick={runForensics}
          disabled={loading || !selectedFile}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: loading || !selectedFile ? 'default' : 'pointer',
            border: `1px solid ${loading || !selectedFile ? 'var(--border)' : 'var(--border-strong)'}`,
            background: loading || !selectedFile
              ? 'var(--bg-tertiary)'
              : 'var(--accent-blue)',
            color: loading || !selectedFile ? 'var(--text-dim)' : '#F8F3E1',
            transition: 'all 0.2s',
          }}
        >
          {loading ? '● Scanning...' : '▶ Run Forensics'}
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '14px 16px' }}>

        {/* Idle */}
        {!loading && !forensicData && !error && (
          <div
            style={{
              textAlign: 'center',
              padding: '20px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-dim)',
              letterSpacing: '0.08em',
              lineHeight: 1.8,
            }}
          >
            Metadata · Compression · Noise · Frequency
            <br />
            <span style={{ fontSize: 9, opacity: 0.7 }}>
              Click "Run Forensics" to analyse this image
            </span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 20,
                marginBottom: 14,
              }}
            >
              {['Metadata', 'Compression', 'Noise', 'Frequency'].map((lbl, i) => (
                <div
                  key={lbl}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    animation: `pulse-subtle 1.6s ${i * 0.22}s ease-in-out infinite`,
                  }}
                >
                  {lbl}
                </div>
              ))}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--cyan)',
                letterSpacing: '0.1em',
                animation: 'pulse-subtle 1.2s ease-in-out infinite',
              }}
            >
              Analysing signals...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 4,
              background: 'var(--red-ghost)',
              border: '1px solid rgba(184, 76, 58, 0.25)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--red)',
            }}
          >
            ✕ {error}
          </div>
        )}

        {/* Results */}
        {forensicData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

            {/* Signal rows */}
            {forensicData.signals?.map((signal, i) => (
              <SignalRow key={signal.id} signal={signal} index={i} />
            ))}

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: 'var(--border-light)',
                margin: '6px 0',
              }}
            />

            {/* Verdict block */}
            {verdict && (
              <div
                style={{
                  borderRadius: 6,
                  border: `1.5px solid ${vcfg.border}`,
                  background: vcfg.bg,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  animation: 'fadeIn 0.4s 0.3s ease-out both',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: 5,
                    }}
                  >
                    Forensic Verdict
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: vcfg.color,
                      letterSpacing: '0.01em',
                      marginBottom: 5,
                    }}
                  >
                    {verdict.label}
                  </div>
                  {/* Signal pills */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {forensicData.signals?.map(s => {
                      const sc = SEV[s.severity] || SEV.suspicious;
                      return (
                        <span
                          key={s.id}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 8,
                            letterSpacing: '0.07em',
                            color: sc.color,
                            background: sc.bg,
                            border: `1px solid ${sc.border}`,
                            borderRadius: 3,
                            padding: '2px 6px',
                          }}
                        >
                          {sc.icon} {s.label.split('(')[0].trim()}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Composite score */}
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 32,
                      fontWeight: 700,
                      color: vcfg.color,
                      lineHeight: 1,
                      marginBottom: 3,
                    }}
                  >
                    {verdict.composite_score}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 8,
                      color: 'var(--text-dim)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Risk Score
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--text-tertiary)',
                      marginTop: 3,
                    }}
                  >
                    {verdict.signals_flagged}/{verdict.signals_total} flagged
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForensicsPanel;