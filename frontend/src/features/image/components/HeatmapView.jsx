import React from "react";
import { MediaPipeOverlay } from "./MediaPipeOverlay";

export const HeatmapView = ({ imageUrl, faces = [], showMediaPipe = false }) => (
  <div style={{
    position: "relative", borderRadius: 2, overflow: "hidden",
    background: "#0a0d14", aspectRatio: "4/3", pointerEvents: "none",
  }}>
    {imageUrl ? (
      <img
        src={imageUrl}
        alt="uploaded"
        style={{
          width: "100%", height: "100%",
          display: "block", objectFit: "contain", pointerEvents: "none",
        }}
      />
    ) : (
      <svg viewBox="0 0 400 300" style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none" }}>
        <defs>
          <radialGradient id="faceGrad" cx="50%" cy="45%" r="40%">
            <stop offset="0%" stopColor="#c8a882" />
            <stop offset="100%" stopColor="#a07850" />
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill="#1a1f2e" />
        <ellipse cx="200" cy="145" rx="85" ry="105" fill="url(#faceGrad)" />
        <rect x="175" y="230" width="50" height="50" rx="4" fill="#a07850" />
        <ellipse cx="170" cy="120" rx="16" ry="10" fill="#2a1a0a" />
        <ellipse cx="230" cy="120" rx="16" ry="10" fill="#2a1a0a" />
        <circle cx="170" cy="120" r="6" fill="#111" />
        <circle cx="230" cy="120" r="6" fill="#111" />
        <circle cx="173" cy="117" r="2" fill="white" opacity="0.7" />
        <circle cx="233" cy="117" r="2" fill="white" opacity="0.7" />
        <ellipse cx="200" cy="155" rx="10" ry="14" fill="#956040" opacity="0.6" />
        <path d="M 180 185 Q 200 200 220 185" stroke="#6a3a20" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <ellipse cx="115" cy="145" rx="16" ry="24" fill="#a07850" />
        <ellipse cx="285" cy="145" rx="16" ry="24" fill="#a07850" />
        {Array.from({ length: 8 }).map((_, i) =>
          Array.from({ length: 6 }).map((_, j) => (
            <rect key={`${i}-${j}`} x={i * 50} y={j * 50} width="50" height="50"
              fill="none" stroke="rgba(0,229,255,0.04)" strokeWidth="0.5" />
          ))
        )}
      </svg>
    )}

    {showMediaPipe && (
      <MediaPipeOverlay
        faces={faces}
        imageUrl={imageUrl}
      />
    )}
  </div>
);