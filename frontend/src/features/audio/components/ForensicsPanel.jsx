const visionX = {
  cream:       '#F8F3E1',
  sage:        '#AEB784',
  sageDark:    '#8a9460',
  olive:       '#41431B',
  oliveMid:    '#5a5c28',
  terracotta:  '#B84C3A',
  terracottaLight: '#c85542',
  parchment:   '#EDE8D4',
  sand:        '#C8B882',
  ink:         '#1e2008',
  inkLight:    '#252810',
  warmGray:    '#7a7560',
  warmGrayLight: '#9a9680',
};

const severityConfig = {
  anomalous: {
    text:   '#d45f4b',
    bg:     'rgba(184, 76, 58, 0.08)',
    border: 'rgba(184, 76, 58, 0.3)',
    bar:    '#B84C3A',
  },
  suspicious: {
    text:   '#C8B882',
    bg:     'rgba(200, 184, 130, 0.08)',
    border: 'rgba(200, 184, 130, 0.3)',
    bar:    '#C8B882',
  },
  clean: {
    text:   '#AEB784',
    bg:     'rgba(174, 183, 132, 0.08)',
    border: 'rgba(174, 183, 132, 0.3)',
    bar:    '#AEB784',
  },
  acceptable: {
    text:   '#AEB784',
    bg:     'rgba(174, 183, 132, 0.08)',
    border: 'rgba(174, 183, 132, 0.3)',
    bar:    '#AEB784',
  },
};

const getSeverity = (s) => severityConfig[s?.toLowerCase()] || {
  text: visionX.warmGray,
  bg: 'rgba(90, 92, 40, 0.1)',
  border: 'rgba(90, 92, 40, 0.3)',
  bar: visionX.warmGray,
};

export const ForensicsPanel = ({ data }) => {
  if (!data || !data.signals) return null;

  const scorePercent = Math.min(100, Math.max(0, data.verdict.composite_score));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Composite Score Header */}
      <div style={{
        padding: '16px 20px',
        background: `linear-gradient(135deg, ${visionX.inkLight} 0%, rgba(65, 67, 27, 0.4) 100%)`,
        border: `1px solid ${visionX.oliveMid}`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(ellipse at 10% 50%, rgba(174, 183, 132, 0.04) 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: '9px',
            color: visionX.warmGray,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>Composite Forensic Score</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: '32px',
              fontWeight: '800',
              color: visionX.cream,
              lineHeight: 1,
            }}>{data.verdict.composite_score}</span>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: '13px',
              color: visionX.warmGray,
            }}>/100</span>
          </div>
          {/* Score bar */}
          <div style={{
            marginTop: '6px',
            width: '160px',
            height: '3px',
            background: visionX.oliveMid,
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${scorePercent}%`,
              height: '100%',
              background: scorePercent > 70
                ? `linear-gradient(90deg, ${visionX.sand}, ${visionX.terracotta})`
                : `linear-gradient(90deg, ${visionX.sage}, ${visionX.sand})`,
              borderRadius: '2px',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: '9px',
            color: visionX.warmGray,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>Signals Triggered</span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: '18px',
            fontWeight: '700',
            color: visionX.sand,
          }}>
            {data.verdict.signals_flagged}
            <span style={{ fontSize: '11px', color: visionX.warmGray, fontWeight: '400' }}>
              {' '}/ {data.verdict.signals_total}
            </span>
          </span>
        </div>
      </div>

      {/* Individual Signals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.signals.map((signal) => {
          const sev = getSeverity(signal.severity);
          return (
            <div key={signal.id} style={{
              border: `1px solid ${visionX.oliveMid}`,
              borderRadius: '8px',
              overflow: 'hidden',
              background: visionX.inkLight,
            }}>

              {/* Signal Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: `1px solid ${visionX.oliveMid}`,
                background: 'rgba(65, 67, 27, 0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Severity color bar */}
                  <div style={{
                    width: '3px',
                    height: '14px',
                    background: sev.bar,
                    borderRadius: '2px',
                    boxShadow: `0 0 6px ${sev.bar}50`,
                  }} />
                  <h4 style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: '10px',
                    fontWeight: '700',
                    color: visionX.parchment,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    margin: 0,
                  }}>
                    {signal.label}
                  </h4>
                </div>

                <span style={{
                  padding: '3px 8px',
                  background: sev.bg,
                  border: `1px solid ${sev.border}`,
                  borderRadius: '3px',
                  fontFamily: "var(--font-mono)",
                  fontSize: '8px',
                  fontWeight: '700',
                  color: sev.text,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}>
                  {signal.severity}
                </span>
              </div>

              {/* Signal Body */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{
                  fontFamily: "var(--font-display)",
                  fontSize: '13px',
                  fontWeight: '600',
                  color: visionX.cream,
                  margin: 0,
                  lineHeight: '1.4',
                }}>
                  {signal.summary}
                </p>
                <p style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: '10px',
                  color: visionX.warmGrayLight,
                  margin: 0,
                  lineHeight: '1.65',
                  letterSpacing: '0.02em',
                }}>
                  {signal.detail}
                </p>

                {signal.visualization && (
                  <div style={{
                    marginTop: '8px',
                    border: `1px solid ${visionX.oliveMid}`,
                    borderRadius: '5px',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.35)',
                    display: 'flex',
                    justifyContent: 'center',
                  }}>
                    <img
                      src={`data:image/png;base64,${signal.visualization}`}
                      alt={`${signal.label} visualization`}
                      style={{
                        maxHeight: '180px',
                        width: 'auto',
                        objectFit: 'contain',
                        borderRadius: '3px',
                        mixBlendMode: 'screen',
                        filter: 'sepia(20%) hue-rotate(10deg)',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};