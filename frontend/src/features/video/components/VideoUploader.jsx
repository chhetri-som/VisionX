export const VideoUploader = ({ onFileSelect, fileInputRef }) => {
  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        accept="video/mp4,video/webm,video/mov"
        ref={fileInputRef}
        onChange={onFileSelect}
        style={{ display: "none" }}
      />
      <div
        onClick={handleBoxClick}
        style={{
          border: "1px dashed rgba(0,229,255,0.2)", borderRadius: 2,
          background: "var(--bg-surface)", height: 220,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16, cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"}
      >
        <div style={{ fontSize: 40, opacity: 0.4 }}>▶</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--cyan)", marginBottom: 6 }}>
            DROP VIDEO FOR FORENSIC ANALYSIS
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
            Click to upload · Max 10s clip evaluated at 2 FPS
          </div>
        </div>
      </div>
    </>
  );
};