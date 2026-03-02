import React, { useRef, useEffect, useCallback } from "react";

// ── MediaPipe mesh paths ──────────────────────────────────────────────────────
const FACE_OVAL   = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10];
const RIGHT_EYE   = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,33];
const LEFT_EYE    = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398,362];
const RIGHT_BROW  = [46,53,52,65,55,70,63,105,66,107];
const LEFT_BROW   = [276,283,282,295,285,300,293,334,296,336];
const NOSE_BRIDGE = [168,6,197,195,5,4];
const NOSE_BASE   = [98,97,2,326,327];
const LIPS_OUTER  = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185,61];
const LIPS_INNER  = [78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191,78];

const ALL_PATHS = [
  FACE_OVAL, RIGHT_EYE, LEFT_EYE,
  RIGHT_BROW, LEFT_BROW,
  NOSE_BRIDGE, NOSE_BASE,
  LIPS_OUTER, LIPS_INNER,
];

// ── Per-verdict colour palettes ───────────────────────────────────────────────
const PALETTE = {
  fake: {
    dim:    "rgba(255,45,85,0.10)",
    mid:    "rgba(255,45,85,0.35)",
    scan:   "rgba(255,45,85,0.55)",
    brkt:   "rgba(255,45,85,0.70)",
    hud:    "rgba(255,45,85,0.90)",
    glow:   "rgba(255,45,85,0.6)",
    glowMd: "rgba(255,45,85,0.25)",
    brow:   "rgba(255,45,85,0.28)",
    nose:   "rgba(255,45,85,0.22)",
    noseB:  "rgba(255,45,85,0.20)",
  },
  uncertain: {
    dim:    "rgba(255,193,7,0.10)",
    mid:    "rgba(255,193,7,0.35)",
    scan:   "rgba(255,193,7,0.55)",
    brkt:   "rgba(255,193,7,0.70)",
    hud:    "rgba(255,193,7,0.90)",
    glow:   "rgba(255,193,7,0.6)",
    glowMd: "rgba(255,193,7,0.25)",
    brow:   "rgba(255,193,7,0.28)",
    nose:   "rgba(255,193,7,0.22)",
    noseB:  "rgba(255,193,7,0.20)",
  },
  real: {
    dim:    "rgba(0,229,255,0.10)",
    mid:    "rgba(0,229,255,0.35)",
    scan:   "rgba(0,229,255,0.55)",
    brkt:   "rgba(0,229,255,0.70)",
    hud:    "rgba(0,229,255,0.85)",
    glow:   "rgba(0,229,255,0.6)",
    glowMd: "rgba(0,229,255,0.25)",
    brow:   "rgba(0,229,255,0.28)",
    nose:   "rgba(0,229,255,0.22)",
    noseB:  "rgba(0,229,255,0.20)",
  },
};

const getPalette = (label) => PALETTE[label] ?? PALETTE.real;

// ── Component ─────────────────────────────────────────────────────────────────
export const MediaPipeOverlay = ({ faces = [], imageUrl }) => {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const natRef    = useRef(null);
  // Per-face independent scanline positions
  const scanRefs  = useRef([]);

  // Resolve natural image size from blob URL
  useEffect(() => {
    if (!imageUrl) return;
    const img  = new Image();
    img.onload = () => { natRef.current = { w: img.naturalWidth, h: img.naturalHeight }; };
    img.src    = imageUrl;
  }, [imageUrl]);

  // Sync canvas pixel size to CSS display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sync = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    const ro   = new ResizeObserver(sync);
    ro.observe(canvas);
    sync();
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const nat    = natRef.current;

    if (!canvas || !faces.length || !nat) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext("2d");
    const cw  = canvas.width;
    const ch  = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // objectFit:contain letterbox transform — preserved exactly
    const scale = Math.min(cw / nat.w, ch / nat.h);
    const offX  = (cw - nat.w * scale) / 2;
    const offY  = (ch - nat.h * scale) / 2;
    const toC   = ([px, py]) => [px * scale + offX, py * scale + offY];

    ctx.lineCap  = "round";
    ctx.lineJoin = "round";

    const glow = (color, blur, fn) => {
      ctx.shadowColor = color;
      ctx.shadowBlur  = blur;
      fn();
      ctx.shadowBlur  = 0;
      ctx.shadowColor = "transparent";
    };

    // Ensure we have a scanline ref for every face
    while (scanRefs.current.length < faces.length) {
      // Stagger starting positions so scanlines aren't in sync
      scanRefs.current.push(scanRefs.current.length * 0.25 % 1);
    }

    // ── Draw each face ────────────────────────────────────────────────────
    faces.forEach((face, faceIdx) => {
      const { landmarks, bbox, label, confidence, landmarker_data } = face;
      if (!landmarks || !bbox) return;

      const pal = getPalette(label);

      const lp = (i) =>
        i < landmarks.length && landmarks[i] ? toC(landmarks[i]) : null;

      const polyline = (indices, stroke, lw) => {
        const pts = indices.map(lp).filter(Boolean);
        if (pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = lw;
        ctx.stroke();
      };

      // ── LAYER 1: Base ghost mesh ────────────────────────────────────────
      ALL_PATHS.forEach(path => polyline(path, pal.dim, 1.2));

      // ── LAYER 2: Key feature emphasis ──────────────────────────────────
      glow(pal.glowMd, 5, () => {
        polyline(FACE_OVAL,  pal.mid, 1.8);
        polyline(RIGHT_EYE,  pal.mid, 1.8);
        polyline(LEFT_EYE,   pal.mid, 1.8);
        polyline(LIPS_OUTER, pal.mid, 1.8);
        polyline(LIPS_INNER, pal.mid, 1.2);
      });
      polyline(RIGHT_BROW,  pal.brow,  1.2);
      polyline(LEFT_BROW,   pal.brow,  1.2);
      polyline(NOSE_BRIDGE, pal.nose,  1.0);
      polyline(NOSE_BASE,   pal.noseB, 1.0);

      // ── LAYER 3: Scanline scoped to this face's bbox ────────────────────
      const [bx0, by0, bx1, by1] = bbox;
      const [cx0, cy0] = toC([bx0, by0]);
      const [cx1, cy1] = toC([bx1, by1]);
      const faceH      = cy1 - cy0;

      scanRefs.current[faceIdx] = (scanRefs.current[faceIdx] + 0.003) % 1;
      const sy = cy0 + faceH * scanRefs.current[faceIdx];

      // Trailing wash
      const trail = ctx.createLinearGradient(
        0, Math.max(cy0, sy - faceH * 0.08), 0, sy
      );
      trail.addColorStop(0, "rgba(0,0,0,0)");
      trail.addColorStop(1, pal.dim);
      ctx.fillStyle = trail;
      ctx.fillRect(
        cx0,
        Math.max(cy0, sy - faceH * 0.08),
        cx1 - cx0,
        Math.min(sy - cy0, faceH * 0.08)
      );

      // Scan line with edge fade
      const lg = ctx.createLinearGradient(cx0, 0, cx1, 0);
      lg.addColorStop(0,    "rgba(0,0,0,0)");
      lg.addColorStop(0.25, pal.scan);
      lg.addColorStop(0.75, pal.scan);
      lg.addColorStop(1,    "rgba(0,0,0,0)");

      glow(pal.glow, 8, () => {
        ctx.beginPath();
        ctx.moveTo(cx0, sy);
        ctx.lineTo(cx1, sy);
        ctx.strokeStyle = lg;
        ctx.lineWidth   = 1.2;
        ctx.stroke();
      });

      // ── LAYER 4: Corner brackets ──────────────────────────────────────
      const arm = Math.min(cx1 - cx0, cy1 - cy0) * 0.08;

      glow(pal.brkt, 8, () => {
        ctx.strokeStyle = pal.brkt;
        ctx.lineWidth   = 1.8;
        [
          { x: cx0, y: cy0, dx:  1, dy:  1 },
          { x: cx1, y: cy0, dx: -1, dy:  1 },
          { x: cx0, y: cy1, dx:  1, dy: -1 },
          { x: cx1, y: cy1, dx: -1, dy: -1 },
        ].forEach(({ x, y, dx, dy }) => {
          ctx.beginPath();
          ctx.moveTo(x + dx * arm, y);
          ctx.lineTo(x, y);
          ctx.lineTo(x, y + dy * arm);
          ctx.stroke();
        });
      });

      // ── LAYER 5: Per-face verdict HUD label ───────────────────────────
      const pct      = Math.round((confidence ?? 0) * 100);
      const verdict  = (label ?? "—").toUpperCase();
      const hudText  = `FACE ${faceIdx + 1}  ·  ${verdict} ${pct}%`;

      ctx.font = "bold 9px 'Courier New', monospace";
      const tw = ctx.measureText(hudText).width;

      // Position: just above the top-left corner bracket
      const hudX = cx0;
      const hudY = Math.max(cy0 - 18, 4);

      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(hudX, hudY, tw + 16, 16);

      glow(pal.hud, 5, () => {
        ctx.fillStyle = pal.hud;
        ctx.fillText(hudText, hudX + 8, hudY + 11);
      });
    });

    // ── Global HUD: coverage of face 0 ───────────────────────────────────
    const primaryFace = faces[0];
    const qual        = primaryFace?.landmarker_data?.face_quality;
    const coverage    = qual?.completeness_percent != null
      ? `${Number(qual.completeness_percent).toFixed(0)}%`
      : "—";
    const globalHud   = `MESH ACTIVE  ·  COVERAGE ${coverage}`;

    ctx.font      = "bold 9px 'Courier New', monospace";
    const gtw     = ctx.measureText(globalHud).width;
    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(10, 10, gtw + 16, 16);

    const primPal = getPalette(primaryFace?.label);
    glow(primPal.hud, 5, () => {
      ctx.fillStyle = primPal.hud;
      ctx.fillText(globalHud, 18, 22);
    });

    animRef.current = requestAnimationFrame(draw);
  }, [faces]);

  useEffect(() => {
    if (!faces.length || !imageUrl) return;
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw, faces, imageUrl]);

  if (!faces.length || !imageUrl) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};