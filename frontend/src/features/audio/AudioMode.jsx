// src/features/audio/AudioMode.jsx
import { useState } from 'react';
import { FileUploader } from '../../common/FileUploader';
import { ResultsDashboard } from './components/ResultsDashboard';

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

export const AudioMode = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [basicResults, setBasicResults] = useState(null);
  const [forensicResults, setForensicResults] = useState(null);

  const handleUpload = async (uploadedFile) => {
    setFile(uploadedFile);
    setStatus('processing_basic');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze/audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to analyze audio');
      }

      const data = await response.json();
      setBasicResults(data);
      setStatus('basic_done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleRunForensics = async () => {
    setStatus('processing_forensics');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/audio/forensics', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Forensics analysis failed');
      }

      const data = await response.json();
      setForensicResults(data);
      setStatus('forensics_done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const resetWorkspace = () => {
    setFile(null);
    setBasicResults(null);
    setForensicResults(null);
    setStatus('idle');
  };

  const isProcessing = status === 'processing_basic' || status === 'processing_forensics';
  const hasResults = status === 'basic_done' || status === 'forensics_done';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@600;800&display=swap');

        .vx-clear-btn {
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${visionX.warmGray};
          background: none;
          border: 1px solid transparent;
          padding: 5px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .vx-clear-btn:hover {
          color: ${visionX.cream};
          border-color: ${visionX.oliveMid};
          background: rgba(90, 92, 40, 0.15);
        }

        @keyframes vx-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes vx-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes vx-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100%',
        fontFamily: "var(--font-sans)",
        animation: 'vx-fade-in 0.4s ease',
      }}>

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {file && (
            <button onClick={resetWorkspace} className="vx-clear-btn">
              ✕ Clear Workspace
            </button>
          )}
        </div>

        {/* ── Error State ── */}
        {status === 'error' && (
          <div style={{
            padding: '14px 18px',
            background: 'rgba(184, 76, 58, 0.08)',
            border: `1px solid rgba(184, 76, 58, 0.4)`,
            borderLeft: `3px solid ${visionX.terracotta}`,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}>
            <span style={{ color: visionX.terracotta, fontSize: '12px', marginTop: '1px' }}>⚠</span>
            <div>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: '9px',
                fontWeight: '700',
                letterSpacing: '0.14em',
                color: visionX.terracotta,
                display: 'block',
                marginBottom: '4px',
              }}>
                ANALYSIS FAILED
              </span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: '10px',
                color: '#c07060',
              }}>
                {errorMsg}
              </span>
            </div>
          </div>
        )}

        {/* ── Idle: File Upload ── */}
        {status === 'idle' && (
          <FileUploader
            onFileAccepted={handleUpload}
            acceptString=".mp3,.wav,audio/mpeg,audio/wav"
            allowedTypes={['audio/mpeg', 'audio/wav']}
            title="DROP AUDIO FOR ANALYSIS"
            subtitle="Click to upload (MP3 / WAV / M4A)"
            icon="🎵"
          />
        )}

        {/* ── Processing Spinner ── */}
        {isProcessing && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            gap: '20px',
            animation: 'vx-fade-in 0.3s ease',
          }}>
            {/* Organic spinner */}
            <div style={{
              width: '40px', height: '40px',
              borderRadius: '50%',
              border: `2px solid ${visionX.oliveMid}`,
              borderTopColor: visionX.sage,
              borderRightColor: visionX.sand,
              animation: 'vx-spin 1s linear infinite',
            }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.18em',
                color: visionX.sage,
                textTransform: 'uppercase',
                marginBottom: '6px',
                /* shimmer effect */
                background: `linear-gradient(90deg, ${visionX.sage}, ${visionX.sand}, ${visionX.sage})`,
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'vx-shimmer 2.5s linear infinite',
              }}>
                {status === 'processing_basic'
                  ? 'Analyzing Audio Strata...'
                  : 'Running Deep Forensic Signals...'}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: '9px',
                color: visionX.warmGray,
                letterSpacing: '0.1em',
              }}>
                {status === 'processing_basic'
                  ? 'Extracting spectral signatures and vocal patterns'
                  : 'Mapping prosody anomalies and phase artifacts'}
              </div>
            </div>
          </div>
        )}

        {/* ── Results Dashboard ── */}
        {hasResults && basicResults && (
          <div style={{ animation: 'vx-fade-in 0.5s ease' }}>
            <ResultsDashboard
              file={file}
              basicResults={basicResults}
              forensicResults={forensicResults}
              onRunForensics={handleRunForensics}
              isForensicsLoading={status === 'processing_forensics'}
            />
          </div>
        )}
      </div>
    </>
  );
};