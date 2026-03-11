import React, { useState, useEffect } from 'react';

// ─── Severity config — mapped to the earthy/olive theme ────────────────────
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
    pulseClass: 'animate-verdict-pulse',
  },
  amber: {
    bg: 'rgba(184, 134, 11, 0.07)',
    border: 'rgba(184, 134, 11, 0.3)',
    color: 'var(--amber)',
    dimColor: '#8a6300',
    pulseClass: 'animate-verdict-pulse amber',
  },
  red: {
    bg: 'var(--red-ghost)',
    border: 'rgba(184, 76, 58, 0.3)',
    color: 'var(--red)',
    dimColor: 'var(--accent-red-dim)',
    pulseClass: 'animate-verdict-pulse red',
  },
};

const SIGNAL_DESC = {
  metadata: 'Real cameras embed invisible metadata (make, model, lens, timestamp). AI generators usually strip this entirely or leave a software signature.',
  ela: 'Re-compresses the image and amplifies differences. Spliced faces compress differently from the original background — bright patches indicate manipulation.',
  noise: 'Every camera sensor has a unique, uniform noise fingerprint. AI-generated regions disrupt this pattern — highlighted cells mark statistical outliers.',
  frequency: 'AI generators (GANs, diffusion models) leave periodic grid artefacts in frequency space due to upsampling layers. Real photos have smooth distributions.',
};

// ─── Animated score counter ─────────────────────────────────────────────────
const AnimatedScore = ({ targetScore, color, delay = 0 }) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let animationFrameId;
    let startTime;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const duration = 1200; // 1.2s animation

      if (elapsed < duration) {
        const progress = elapsed / duration;
        // Easing function: cubic-out for natural deceleration
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const newScore = Math.round(easeProgress * targetScore);
        setDisplayScore(newScore);
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayScore(targetScore);
      }
    };

    const timeoutId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetScore, delay]);

  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 42,
        fontWeight: 700,
        color: color,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}
      className="animate-score-counter"
    >
      {displayScore}
    </div>
  );
};

// ─── Risk scale visualization ───────────────────────────────────────────────
const RiskScale = ({ score, color }) => {
  const percentage = Math.max(0, Math.min(100, score));
  
  // Calculate position along scale: 0 = left, 100 = right
  const position = percentage;

  return (
    <div
      style={{
        marginTop: 12,
        padding: '12px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          color: 'var(--text-dim)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        <span>Authentic</span>
        <span>Ambiguous</span>
        <span>AI / Deepfake</span>
      </div>

      {/* Risk scale bar */}
      <div
        style={{
          height: 6,
          background: 'linear-gradient(90deg, #5C8A3C 0%, #AEB784 50%, #B84C3A 100%)',
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 2px 4px rgba(65, 67, 27, 0.1)',
        }}
      >
        {/* Indicator dot */}
        <div
          style={{
            position: 'absolute',
            top: -3,
            left: `${position}%`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: color,
            border: '2px solid #F8F3E1',
            boxShadow: `0 2px 8px ${color}66`,
            transform: 'translateX(-50%)',
            transition: 'left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          className="animate-risk-indicator"
        />
      </div>

      {/* Score label */}
      <div
        style={{
          marginTop: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-secondary)',
          letterSpacing: '0.05em',
        }}
      >
        Score: <strong style={{ color }}>{score}</strong> / 100
      </div>
    </div>
  );
};

// ─── Confidence visualizer ─────────────────────────────────────────────────
const ConfidenceIndicator = ({ confidence, color }) => {
  const isHigh = confidence === 'high';
  const width = isHigh ? 85 : 55;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        padding: '8px 10px',
        background: 'rgba(248, 243, 225, 0.5)',
        borderRadius: 4,
        border: '1px solid var(--border-light)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          minWidth: 55,
        }}
      >
        Confidence
      </span>
      <div
        style={{
          flex: 1,
          height: 4,
          background: 'var(--bg-tertiary)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${width}%`,
            background: color,
            borderRadius: 2,
            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 600,
          color: color,
          textTransform: 'capitalize',
          minWidth: 45,
        }}
      >
        {confidence}
      </span>
    </div>
  );
};

// ─── Single signal row with expand/collapse ──────────────────────────────────
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
        animation: `signal-cascade 0.5s ease-out ${index * 0.08}s both`,
        transition: 'all 0.3s ease',
        cursor: canExpand ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = cfg.color;
        e.currentTarget.style.background = `${cfg.bg}dd`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = cfg.border;
        e.currentTarget.style.background = cfg.bg;
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

          {/* Raw EXIF data */}
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

// ─── Enhanced loading screen ────────────────────────────────────────────────
const EnhancedLoadingState = () => {
  const analyses = ['Metadata', 'Compression', 'Sensor Noise', 'Frequency'];

  return (
    <div style={{ padding: '40px 14px' }}>
      {/* Floating icons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {analyses.map((label, i) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: `rgba(107, 127, 58, ${0.05 + i * 0.03})`,
                border: '1px solid rgba(174, 183, 132, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                animation: `float-gentle 2s ${i * 0.15}s ease-in-out infinite`,
              }}
            >
              {['📊', '🔍', '🎯', '〰️'][i]}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                animation: `pulse-subtle 1.6s ${i * 0.22}s ease-in-out infinite`,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Status message */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--cyan)',
          letterSpacing: '0.1em',
          animation: 'pulse-subtle 1.2s ease-in-out infinite',
        }}
      >
        Scanning image signals...
      </div>

      {/* Progress bar */}
      <div
        style={{
          marginTop: 16,
          height: 2,
          background: 'var(--bg-tertiary)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--cyan) 0%, var(--accent-blue) 100%)',
            animation: 'loading-shimmer 2s infinite',
            backgroundSize: '1000px 100%',
          }}
        />
      </div>
    </div>
  );
};

// ─── Main panel ──────────────────────────────────────────────────────────────
const ForensicsPanel = ({ selectedFile, analysisResult }) => {
  const [forensicData, setForensicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runForensics = async () => {
    // DEBUG
    console.log('analysisResult:', analysisResult);
    console.log('faces:', analysisResult?.faces);
    console.log('bbox:', analysisResult?.faces?.[0]?.bbox);
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setForensicData(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const faces = analysisResult?.faces;
    if (faces && faces.length > 0 && faces[0].bbox) {
      const bbox = faces[0].bbox;
      const b = Array.isArray(bbox)
        ? { x1: bbox[0], y1: bbox[1], x2: bbox[2], y2: bbox[3] }
        : bbox;

      const img = new Image();
      const { width: imageWidth, height: imageHeight } = await new Promise((resolve) => {
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = URL.createObjectURL(selectedFile);
      });
      URL.revokeObjectURL(img.src);

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
      const API_BASE = 'http://127.0.0.1:8000';
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

        {/* Idle state */}
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

        {/* Loading state */}
        {loading && <EnhancedLoadingState />}

        {/* Error state */}
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

        {/* Results section */}
        {forensicData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Signal rows — cascading animation */}
            {forensicData.signals?.map((signal, i) => (
              <SignalRow key={signal.id} signal={signal} index={i} />
            ))}

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: 'var(--border-light)',
                margin: '8px 0',
              }}
            />

            {/* Enhanced verdict block — HERO SECTION */}
            {verdict && (
              <div
                style={{
                  borderRadius: 8,
                  border: `2px solid ${vcfg.border}`,
                  background: vcfg.bg,
                  padding: '20px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  animation: `fadeIn 0.6s 0.35s ease-out both`,
                }}
                className={vcfg.pulseClass}
              >
                {/* Header */}
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Forensic Verdict
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 18,
                      fontWeight: 700,
                      color: vcfg.color,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.3,
                    }}
                  >
                    {verdict.label}
                  </div>
                </div>

                {/* Composite score with animation */}
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    Risk Score
                  </div>
                  <AnimatedScore
                    targetScore={verdict.composite_score}
                    color={vcfg.color}
                    delay={100}
                  />
                </div>

                {/* Risk scale visualization */}
                <RiskScale score={verdict.composite_score} color={vcfg.color} />

                {/* Confidence indicator */}
                <ConfidenceIndicator confidence={verdict.confidence} color={vcfg.color} />

                {/* Signal summary */}
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(248, 243, 225, 0.7)',
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                  }}
                >
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
                    Signals
                  </div>
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

                {/* Flagged count */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 6,
                    borderTop: `1px solid ${vcfg.border}`,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>Signals Flagged</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: vcfg.color,
                    }}
                  >
                    {verdict.signals_flagged} / {verdict.signals_total}
                  </span>
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