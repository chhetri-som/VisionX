import { useState, useRef } from "react";

export const FileUploader = ({ 
  onFileAccepted, 
  acceptString,     // For the HTML input e.g., "image/png,image/jpeg"
  allowedTypes,     // Array for JS validation e.g., ['image/png', 'image/jpeg']
  title = "DROP FILE FOR ANALYSIS", 
  subtitle = "Click to upload",
  icon = "⬆",
  height = "220px"
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState("");
  const fileInputRef = useRef(null);

  const handleValidateAndPass = (file) => {
    setLocalError("");
    if (!file) return;

    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      setLocalError(`Invalid format. Received: ${file.type || "unknown"}.`);
      return;
    }

    onFileAccepted(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleValidateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleValidateAndPass(e.target.files[0]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
        style={{ display: "none" }}
        onChange={handleChange}
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: `1px dashed ${dragActive ? "var(--cyan)" : "rgba(0,229,255,0.2)"}`,
          borderRadius: 2,
          background: dragActive ? "rgba(0,229,255,0.05)" : "var(--bg-surface)",
          height: height || "auto",
          aspectRatio: height ? "auto": "4/3",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = dragActive ? "var(--cyan)" : "rgba(0,229,255,0.2)"}
      >
        <div style={{ fontSize: 40, opacity: dragActive ? 0.8 : 0.5, color: dragActive ? "var(--cyan)" : "inherit" }}>
          {icon}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--cyan)", marginBottom: 6 }}>
            {title}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
            {subtitle}
          </div>
        </div>
      </div>

      {localError && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--red)", textAlign: "center" }}>
          {localError}
        </div>
      )}
    </div>
  );
};