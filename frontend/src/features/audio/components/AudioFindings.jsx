const visionX = {
  cream:       '#F8F3E1',
  sage:        '#AEB784',
  sageDark:    '#8a9460',
  olive:       '#41431B',
  oliveMid:    '#6b6d3a',  
  oliveLight:  '#8a8c5a',  
  terracotta:  '#B84C3A',
  terracottaLight: '#d45f4b',
  parchment:   '#EDE8D4',
  sand:        '#C8B882',
  ink:         '#1e2008',
  warmGray:    '#7a7560',
  warmGrayLight: '#9a9680',
};

const verdictConfig = {
  fake: {
    bg:     'rgba(184, 76, 58, 0.08)',
    border: 'rgba(184, 76, 58, 0.35)',
    color:  '#d45f4b',
    glow:   'rgba(184, 76, 58, 0.15)',
    label:  'SYNTHETIC AUDIO DETECTED',
    dot:    '#B84C3A',
  },
  uncertain: {
    bg:     'rgba(86, 162, 78, 0.08)',
    border: 'rgba(200, 184, 130, 0.35)',
    color:  '#49463cff',
    glow:   'rgba(17, 183, 125, 0.12)',
    label:  'INCONCLUSIVE SIGNATURES',
    dot:    '#6b685aff',
  },
  real: {
    bg:     'rgba(174, 183, 132, 0.08)',
    border: 'rgba(174, 183, 132, 0.35)',
    color:  '#49463cff',
    glow:   'rgba(174, 183, 132, 0.15)',
    label:  'AUTHENTIC — NO MANIPULATION',
    dot:    '#6b685aff',
  },
};

export const AudioFindings = ({ findings, label }) => {
  if (!findings || findings.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px 0',
        fontFamily: "var(--font-sans)",
        fontSize: '10px',
        color: visionX.ink,
        letterSpacing: '0.1em',
      }}>
        NO FINDINGS AVAILABLE
      </div>
    );
  }

  const config = verdictConfig[label] || {
    bg: 'rgba(90, 92, 40, 0.1)',
    border: 'rgba(90, 92, 40, 0.3)',
    color: visionX.warmGray,
    glow: 'transparent',
    label: 'AWAITING CLASSIFICATION',
    dot: visionX.warmGray,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Verdict Pill */}
      {label && (
        <div style={{
          padding: '10px 14px',
          background: config.bg,
          border: `1px solid ${config.border}`,
          borderRadius: '5px',
          textAlign: 'center',
          boxShadow: `0 0 16px ${config.glow}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          {/* Pulsing status dot */}
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: config.dot,
            display: 'inline-block',
            boxShadow: `0 0 8px ${config.dot}`,
            animation: 'vx-pulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: '9px',
            fontWeight: '700',
            letterSpacing: '0.16em',
            color: config.color,
            textTransform: 'uppercase',
          }}>
            {config.label}
          </span>
        </div>
      )}

      {/* Findings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {findings.map((finding, idx) => (
          <div
            key={idx}
            style={{
              padding: '10px 12px',
              background: `linear-gradient(135deg, rgba(176, 177, 166, 0.8) 0%, rgba(213, 216, 158, 0.3) 100%)`,
              border: `1px solid ${visionX.oliveMid}`,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <span style={{
              color: visionX.sage,
              fontSize: '8px',
              marginTop: '2px',
              flexShrink: 0,
              fontFamily: 'monospace',
            }}>◆</span>
            <span style={{
              fontFamily: "var(--font-sans)",
              fontSize: '10px',
              color: visionX.ink,
              lineHeight: '1.6',
              letterSpacing: '0.03em',
            }}>
              {finding}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes vx-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
};