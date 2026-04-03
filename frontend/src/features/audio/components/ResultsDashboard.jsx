import { useRef, useEffect, useState } from 'react';
import { ConfidenceGauge } from '../../../common/ConfidenceGauge';
import { AudioFindings } from './AudioFindings';
import { SegmentTimeline } from './SegmentTimeline';
import { ForensicsPanel } from './ForensicsPanel';

const visionX = {
  cream:       '#F8F3E1',
  sage:        '#AEB784',
  sageDark:    '#8a9460',
  olive:       '#41431B',
  oliveMid:    '#5a5c28',
  terracotta:  '#B84C3A',
  parchment:   '#EDE8D4',
  sand:        '#C8B882',
  ink:         '#1e2008',
  inkLight:    '#252810',
  warmGray:    '#7a7560',
  warmGrayLight: '#9a9680',
};

/* Reusable section card */
const Card = ({ children, style = {} }) => (
  <div style={{
    background: `linear-gradient(145deg, ${visionX.sage} 0%, rgba(171, 175, 124, 0.9) 100%)`,
    border: `1px solid ${visionX.oliveMid}`,
    borderRadius: '10px',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    ...style,
  }}>
    {/* Subtle top-edge highlight */}
    <div style={{
      position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px',
      background: `linear-gradient(90deg, transparent, rgba(174, 183, 132, 0.15), transparent)`,
    }} />
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
    <div style={{ width: '2px', height: '12px', background: visionX.sage, borderRadius: '2px', flexShrink: 0 }} />
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: '12.5px',
      fontWeight: '700',
      color: visionX.olive,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
    }}>{children}</span>
  </div>
);

export const ResultsDashboard = ({ file, basicResults, forensicResults, onRunForensics, isForensicsLoading }) => {
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState('');

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleSeek = (startTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
  };

  const gaugeValue = Math.round(basicResults.confidence * 100);

  return (
    <>
      <style>{`

        .vx-audio::-webkit-media-controls-panel {
          background: #252810 !important;
        }
        .vx-forensics-btn {
          padding: 9px 18px;
          background: linear-gradient(135deg, #5a5c28, #41431B);
          border: 1px solid #AEB784;
          border-radius: 5px;
          color: #AEB784;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 0 rgba(174,183,132,0);
        }
        .vx-forensics-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #6b6e30, #4e5020);
          box-shadow: 0 0 14px rgba(174,183,132,0.25);
          color: #F8F3E1;
        }
        .vx-forensics-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '20px',
        fontFamily: "var(--font-sans)",
      }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Gauge Card */}
          <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px' }}>
            <SectionLabel>Forensic Verdict</SectionLabel>
            <ConfidenceGauge value={gaugeValue} label={basicResults.label} subLabel="AUDIO" />
          </Card>

          {/* Playback Card */}
          <Card>
            <SectionLabel>Audio Playback</SectionLabel>
            {audioUrl && (
              <audio
                ref={audioRef}
                controls
                className="vx-audio"
                style={{
                  width: '100%',
                  height: '36px',
                  outline: 'none',
                  borderRadius: '4px',
                  filter: 'sepia(30%)',
                }}
              >
                <source src={audioUrl} type={file.type} />
              </audio>
            )}
            <div style={{
              marginTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: '9px',
                color: visionX.warmGray,
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {basicResults.filename}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: '9px',
                color: visionX.sand,
                background: 'rgba(200,184,130,0.1)',
                border: '1px solid rgba(200,184,130,0.2)',
                padding: '2px 7px',
                borderRadius: '3px',
              }}>
                {basicResults.duration_seconds.toFixed(2)}s
              </span>
            </div>
          </Card>

          {/* Basic Findings Card */}
          <Card>
            <SectionLabel>Signal Findings</SectionLabel>
            <AudioFindings findings={basicResults.findings} label={basicResults.label} />
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Segment Timeline Card */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <SectionLabel>Segment Strata Analysis</SectionLabel>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: '8px',
                color: visionX.warmGray,
                letterSpacing: '0.1em',
                paddingTop: '2px',
              }}>
                ↗ CLICK SEGMENT TO SEEK
              </span>
            </div>
            <SegmentTimeline segments={basicResults.segments} onSegmentClick={handleSeek} />
          </Card>

          {/* Advanced Forensics Card */}
          <Card>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <SectionLabel>Deep Forensic Signals</SectionLabel>
              {!forensicResults && (
                <button
                  onClick={onRunForensics}
                  disabled={isForensicsLoading}
                  className="vx-forensics-btn"
                >
                  {isForensicsLoading ? '⟳  Processing...' : '⬡  Run Forensic Analysis'}
                </button>
              )}
            </div>

            {!forensicResults && !isForensicsLoading && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                border: `1px dashed ${visionX.oliveMid}`,
                borderRadius: '8px',
                gap: '8px',
              }}>
                <span style={{ fontSize: '24px', opacity: 0.4 }}>◈</span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: '10px',
                  color: visionX.warmGray,
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                  lineHeight: '1.7',
                }}>
                  Spectral analysis · Prosody signals<br />Phase coherence · Artifact detection
                </span>
              </div>
            )}

            {isForensicsLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                gap: '12px',
              }}>
                <div style={{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  background: visionX.sage,
                  animation: 'vx-blink 1.2s ease-in-out infinite',
                }} />
                <div style={{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  background: visionX.sand,
                  animation: 'vx-blink 1.2s ease-in-out 0.4s infinite',
                }} />
                <div style={{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  background: visionX.terracotta,
                  animation: 'vx-blink 1.2s ease-in-out 0.8s infinite',
                }} />
              </div>
            )}

            {forensicResults && <ForensicsPanel data={forensicResults} />}
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes vx-blink {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); box-shadow: 0 0 8px currentColor; }
        }
      `}</style>
    </>
  );
};