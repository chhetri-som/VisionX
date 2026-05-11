import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "http://127.0.0.1:8000";
const WINDOW_W  = 340;
const WINDOW_H  = 468;
const ICON_SIZE = 56;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseReply(raw = "") {
// Define what the closing tag looks like (handling typos)
  const closingTagMatch = raw.match(/(?:<\/think>|<think\/>)/i);

  if (closingTagMatch) {
    // If a closing tag is found, split the string at that exact point
    const splitIndex = closingTagMatch.index;
    const closingTagLength = closingTagMatch[0].length;

    // Everything BEFORE the closing tag is the thinking block
    let thinking = raw.substring(0, splitIndex).trim();
    // Clean up the opening tag if the model actually decided to include it
    thinking = thinking.replace(/^<think>/i, "").trim();

    // Everything AFTER the closing tag is the actual chat content
    let content = raw.substring(splitIndex + closingTagLength).trim();

    return { content, thinking };
  }

  // Fallback: If no closing tag is found at all, but it starts with an opening tag
  // (e.g., the model got cut off before finishing its thought)
  if (raw.trim().toLowerCase().startsWith("<think>")) {
    let thinking = raw.replace(/^<think>/i, "").trim();
    return { content: "", thinking };
  }

  // If no tags are found whatsoever, treat everything as normal content
  return { content: raw.trim(), thinking: null };
}

// ─── Draggable hook ───────────────────────────────────────────────────────────

function useDraggable(init, clampFn) {
  const [pos, setPos]   = useState(init);
  const posRef          = useRef(init);
  const movedRef        = useRef(false);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    movedRef.current = false;

    const startX = e.clientX;
    const startY = e.clientY;
    const ox     = e.clientX - posRef.current.x;
    const oy     = e.clientY - posRef.current.y;

    const onMove = (me) => {
      if (Math.abs(me.clientX - startX) > 4 || Math.abs(me.clientY - startY) > 4) {
        movedRef.current = true;
      }
      const raw     = { x: me.clientX - ox, y: me.clientY - oy };
      const clamped = clampFn ? clampFn(raw) : raw;
      posRef.current = clamped;
      setPos(clamped);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }, [clampFn]);

  return { pos, setPos, posRef, onMouseDown, movedRef };
}

// ─── Injected styles (keyframes + scrollbar) ─────────────────────────────────

const XITE_STYLES = `
  @keyframes xite-ring {
    0%   { transform: scale(1);   opacity: 0.45; }
    100% { transform: scale(2.6); opacity: 0;    }
  }
  @keyframes xite-dot {
    0%, 70%, 100% { opacity: 0.18; transform: translateY(0);    }
    35%           { opacity: 0.75; transform: translateY(-3px);  }
  }
  .xite-scroll::-webkit-scrollbar               { width: 3px; }
  .xite-scroll::-webkit-scrollbar-track         { background: transparent; }
  .xite-scroll::-webkit-scrollbar-thumb         { background: rgba(0,0,0,0.09); border-radius: 2px; }
  .xite-input::placeholder                      { color: rgba(0,0,0,0.18); }
  .xite-input:disabled::placeholder             { color: rgba(0,0,0,0.1);  }
  .xite-input:focus                             { outline: none; border-color: rgba(0,0,0,0.18) !important; }
  .xite-send:not(:disabled):hover               { background: rgba(0,0,0,0.14) !important; color: rgba(0,0,0,0.88) !important; }
  .xite-think-btn:hover                         { color: rgba(0,0,0,0.4) !important; }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypingDots = () => (
  <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "rgba(0,0,0,0.55)",
          animation: `xite-dot 1.1s ease-in-out infinite`,
          animationDelay: `${i * 0.18}s`,
        }}
      />
    ))}
  </div>
);

const BotSVG = () => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="8" width="18" height="12" rx="3.2"
      fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.5)" strokeWidth="1.25"/>
    <circle cx="8.5"  cy="13.5" r="1.6" fill="rgba(59,130,246,0.85)"/>
    <circle cx="15.5" cy="13.5" r="1.6" fill="rgba(59,130,246,0.85)"/>
    <path d="M9.5 17.2 Q12 18.8 14.5 17.2"
      stroke="rgba(59,130,246,0.65)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
    <line x1="12" y1="8"   x2="12" y2="5"
      stroke="rgba(59,130,246,0.45)" strokeWidth="1.25" strokeLinecap="round"/>
    <circle cx="12" cy="4.3" r="1.3" fill="rgba(59,130,246,0.45)"/>
    <line x1="3"  y1="14.5" x2="1"  y2="14.5"
      stroke="rgba(59,130,246,0.35)" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="21" y1="14.5" x2="23" y2="14.5"
      stroke="rgba(59,130,246,0.35)" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const SendSVG = ({ disabled }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 13V3M8 3L4 7M8 3L12 7"
      stroke={disabled ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.72)"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const XiteChat = ({ selectedFile, forensicThoughts }) => {
  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState([]);      // display state
  const [history,   setHistory]   = useState([]);      // API history
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const iconRef       = useRef(null);
  const windowRef     = useRef(null);
  const msgEndRef     = useRef(null);
  const inputRef      = useRef(null);
  const winInitRef    = useRef(false);

  // ── Clamp functions ──────────────────────────────────────────────────────────
  const clampIcon = useCallback((p) => ({
    x: Math.max(0, Math.min(p.x, window.innerWidth  - ICON_SIZE)),
    y: Math.max(0, Math.min(p.y, window.innerHeight - ICON_SIZE)),
  }), []);

  const clampWin = useCallback((p) => ({
    x: Math.max(0, Math.min(p.x, window.innerWidth  - WINDOW_W)),
    y: Math.max(0, Math.min(p.y, window.innerHeight - WINDOW_H)),
  }), []);

  const iconDrag = useDraggable(
    { x: window.innerWidth - ICON_SIZE - 28, y: window.innerHeight - ICON_SIZE - 28 },
    clampIcon
  );
  const winDrag = useDraggable({ x: 0, y: 0 }, clampWin);

  // ── Init window position (once, on first open) ───────────────────────────────
  useEffect(() => {
    if (isOpen && !winInitRef.current) {
      winInitRef.current = true;
      const ix = iconDrag.posRef.current.x;
      const iy = iconDrag.posRef.current.y;
      const wx = Math.max(8, Math.min(ix - WINDOW_W - 12, window.innerWidth  - WINDOW_W - 8));
      const wy = Math.max(8, Math.min(iy - WINDOW_H + ICON_SIZE, window.innerHeight - WINDOW_H - 8));
      winDrag.setPos({ x: wx, y: wy });
      winDrag.posRef.current = { x: wx, y: wy };
    }
  }, [isOpen]); // eslint-disable-line

  // ── Click-outside to close ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      const inWin  = windowRef.current?.contains(e.target);
      const inIcon = iconRef.current?.contains(e.target);
      if (!inWin && !inIcon) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Inject styles ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.createElement("style");
    el.setAttribute("data-xite", "1");
    el.textContent = XITE_STYLES;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleIconClick = () => {
    if (iconDrag.movedRef.current) return;
    setIsOpen((v) => !v);
  };

  const toggleThinking = (id) => {
    setMessages((prev) =>
      prev.map((m) => m.id === id ? { ...m, showThinking: !m.showThinking } : m)
    );
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !forensicThoughts || isLoading) return;

    const userMsg    = { role: "user", content: text, id: Date.now() };
    const prevHistory = [...history];

    setMessages((prev) => [...prev, userMsg]);
    setHistory((prev)  => [...prev, { role: "user", content: text }]);
    setInputText("");
    setIsLoading(true);

    try {
      const form = new FormData();
      form.append("prompt",  text);
      form.append("forensic_thoughts", forensicThoughts || "No analysis data available.");
      form.append("history", JSON.stringify(prevHistory));

      const res = await fetch(`${API_BASE}/image/chat`, {
        method: "POST",
        body:   form,
      });

      if (!res.ok) {
        let detail = "Request failed";
        try { detail = (await res.json())?.detail || detail; } catch { /* ignore */ }
        throw new Error(`${detail} (${res.status})`);
      }

      const data                  = await res.json();
      const { content, thinking } = parseReply(data.reply);

      const assistantMsg = {
        role:          "assistant",
        content,
        thinking,
        showThinking:  false,
        id:            Date.now() + 1,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setHistory((prev)  => [...prev, { role: "assistant", content: data.reply }]);

    } catch (e) {
      setMessages((prev) => [...prev, {
        role:    "assistant",
        content: `Something went wrong — ${e.message}`,
        isError: true,
        id:      Date.now() + 1,
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  // ── Welcome copy ──────────────────────────────────────────────────────────────
  const introText = selectedFile
    ? "Hello, I am Xite, your chatbot of assistance. What would you like to discuss about?"
    : "Hello, I am Xite, your chatbot of assistance. Kindly upload any form of media in their respective places so that I can help you analyze further.";

  const sendDisabled = !selectedFile || isLoading || !inputText.trim();

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating icon ── */}
      <div
        ref={iconRef}
        style={{
          position:   "fixed",
          left:       iconDrag.pos.x,
          top:        iconDrag.pos.y,
          width:      ICON_SIZE,
          height:     ICON_SIZE,
          zIndex:     10000,
          cursor:     "grab",
          userSelect: "none",
        }}
        onMouseDown={iconDrag.onMouseDown}
        onClick={handleIconClick}
      >
        {/* Pulse rings — visible only when closed */}
        {!isOpen && (
          <>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "rgba(59,130,246,0.22)",
              animation:  "xite-ring 2.2s ease-out infinite",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "rgba(59,130,246,0.16)",
              animation:  "xite-ring 2.2s ease-out infinite 1.1s",
              pointerEvents: "none",
            }} />
          </>
        )}

        {/* Circle body */}
        <div style={{
          position:       "absolute",
          inset:          0,
          borderRadius:   "50%",
          background:     "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
          border:         isOpen
            ? "1.5px solid rgba(0,0,0,0.22)"
            : "1.5px solid rgba(0,0,0,0.12)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          boxShadow:      "0 6px 28px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
          transition:     "border-color 0.2s ease",
        }}>
          <BotSVG />
        </div>
      </div>

      {/* ── Chat window ── */}
      {isOpen && (
        <div
          ref={windowRef}
          style={{
            position:       "fixed",
            left:           winDrag.pos.x,
            top:            winDrag.pos.y,
            width:          WINDOW_W,
            height:         WINDOW_H,
            zIndex:         9999,
            display:        "flex",
            flexDirection:  "column",
            background:     "rgba(255,255,255,0.97)",
            border:         "1px solid rgba(0,0,0,0.09)",
            borderRadius:   10,
            boxShadow:      "0 24px 64px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)",
            overflow:       "hidden",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Header — drag handle */}
          <div
            onMouseDown={winDrag.onMouseDown}
            style={{
              padding:        "11px 15px",
              borderBottom:   "1px solid rgba(0,0,0,0.07)",
              display:        "flex",
              alignItems:     "center",
              gap:            9,
              cursor:         "grab",
              background:     "rgba(0,0,0,0.025)",
              userSelect:     "none",
              flexShrink:     0,
            }}
          >
            {/* Status dot */}
            <div style={{
              width:      7,
              height:     7,
              borderRadius: "50%",
              background:   selectedFile
                ? "rgba(110, 220, 155, 0.85)"
                : "rgba(180,180,190,0.28)",
              boxShadow:    selectedFile
                ? "0 0 7px rgba(110,220,155,0.45)"
                : "none",
              flexShrink:   0,
              transition:   "background 0.3s, box-shadow 0.3s",
            }} />

            <span style={{
              fontFamily:    "var(--font-mono)",
              fontSize:      11,
              fontWeight:    700,
              letterSpacing: "0.2em",
              color:         "rgba(0,0,0,0.72)",
            }}>
              XITE
            </span>

            <span style={{
              marginLeft:    "auto",
              fontFamily:    "var(--font-mono)",
              fontSize:      8,
              color:         "rgba(0,0,0,0.18)",
              letterSpacing: "0.1em",
            }}>
              AI ASSISTANT
            </span>
          </div>

          {/* Messages area */}
          <div
            className="xite-scroll"
            style={{
              flex:          1,
              overflowY:     "auto",
              padding:       "15px 13px 10px",
              display:       "flex",
              flexDirection: "column",
            }}
          >
            {/* Welcome bubble */}
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontFamily:    "var(--font-mono)",
                fontSize:      8,
                color:         "rgba(0,0,0,0.2)",
                letterSpacing: "0.12em",
                marginBottom:  5,
              }}>
                XITE
              </div>
              <div style={{
                display:        "inline-block",
                maxWidth:       "90%",
                padding:        "10px 13px",
                background:     "rgba(0,0,0,0.04)",
                border:         "1px solid rgba(0,0,0,0.07)",
                borderRadius:   "10px 10px 10px 2px",
                fontFamily:     "var(--font-mono)",
                fontSize:       11,
                color:          "rgba(0,0,0,0.6)",
                lineHeight:     1.7,
              }}>
                {introText}
              </div>
            </div>

            {/* Conversation */}
            {messages.map((msg) =>
              msg.role === "user" ? (
                /* ── User bubble ── */
                <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <div style={{
                    maxWidth:     "80%",
                    padding:      "9px 13px",
                    background:   "rgba(0,0,0,0.08)",
                    border:       "1px solid rgba(0,0,0,0.09)",
                    borderRadius: "10px 10px 2px 10px",
                    fontFamily:   "var(--font-mono)",
                    fontSize:     11,
                    color:        "rgba(0,0,0,0.85)",
                    lineHeight:   1.65,
                    wordBreak:    "break-word",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                /* ── Assistant bubble ── */
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{
                    fontFamily:    "var(--font-mono)",
                    fontSize:      8,
                    color:         "rgba(0,0,0,0.2)",
                    letterSpacing: "0.12em",
                    marginBottom:  5,
                  }}>
                    XITE
                  </div>
                  <div style={{
                    maxWidth:     "90%",
                    padding:      "9px 13px",
                    background:   msg.isError
                      ? "rgba(255,70,70,0.07)"
                      : "rgba(0,0,0,0.04)",
                    border:       `1px solid ${msg.isError
                      ? "rgba(255,70,70,0.2)"
                      : "rgba(0,0,0,0.07)"}`,
                    borderRadius: "10px 10px 10px 2px",
                    fontFamily:   "var(--font-mono)",
                    fontSize:     11,
                    color:        msg.isError
                      ? "rgba(255,120,120,0.78)"
                      : "rgba(0,0,0,0.62)",
                    lineHeight:   1.7,
                    wordBreak:    "break-word",
                    whiteSpace:   "pre-wrap",
                  }}>
                    {msg.content}
                  </div>

                  {/* Thinking toggle */}
                  {msg.thinking && (
                    <>
                      <button
                        className="xite-think-btn"
                        onClick={() => toggleThinking(msg.id)}
                        style={{
                          marginTop:     5,
                          background:    "none",
                          border:        "none",
                          cursor:        "pointer",
                          fontFamily:    "var(--font-mono)",
                          fontSize:      9,
                          color:         "rgba(0,0,0,0.22)",
                          letterSpacing: "0.08em",
                          padding:       "2px 0",
                          display:       "flex",
                          alignItems:    "center",
                          gap:           4,
                          transition:    "color 0.15s",
                        }}
                      >
                        {msg.showThinking ? "▾ hide reasoning" : "▸ show reasoning"}
                      </button>

                      {msg.showThinking && (
                        <div
                          className="xite-scroll"
                          style={{
                            marginTop:    5,
                            maxWidth:     "90%",
                            padding:      "8px 10px",
                            background:   "rgba(0,0,0,0.02)",
                            border:       "1px solid rgba(0,0,0,0.06)",
                            borderRadius: 5,
                            fontFamily:   "var(--font-mono)",
                            fontSize:     9,
                            color:        "rgba(0,0,0,0.28)",
                            lineHeight:   1.65,
                            maxHeight:    130,
                            overflowY:    "auto",
                            whiteSpace:   "pre-wrap",
                            wordBreak:    "break-word",
                          }}
                        >
                          {msg.thinking}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{
                  fontFamily:    "var(--font-mono)",
                  fontSize:      8,
                  color:         "rgba(0,0,0,0.2)",
                  letterSpacing: "0.12em",
                  marginBottom:  5,
                }}>
                  XITE
                </div>
                <div style={{
                  padding:      "10px 14px",
                  background:   "rgba(0,0,0,0.04)",
                  border:       "1px solid rgba(0,0,0,0.07)",
                  borderRadius: "10px 10px 10px 2px",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={msgEndRef} />
          </div>

          {/* Input bar */}
          <div style={{
            padding:      "10px 12px",
            borderTop:    "1px solid rgba(0,0,0,0.07)",
            background:   "rgba(0,0,0,0.015)",
            flexShrink:   0,
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                ref={inputRef}
                className="xite-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={!selectedFile || isLoading}
                placeholder={selectedFile ? "Ask about this image..." : "Upload an image first..."}
                style={{
                  flex:        1,
                  background:  "rgba(0,0,0,0.04)",
                  border:      "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 7,
                  padding:     "9px 12px",
                  fontFamily:  "var(--font-mono)",
                  fontSize:    11,
                  color:       "rgba(0,0,0,0.82)",
                  transition:  "border-color 0.15s",
                  opacity:     (!selectedFile || isLoading) ? 0.5 : 1,
                }}
              />
              <button
                className="xite-send"
                onClick={handleSend}
                disabled={sendDisabled}
                style={{
                  width:          34,
                  height:         34,
                  borderRadius:   7,
                  border:         "1px solid rgba(0,0,0,0.1)",
                  background:     sendDisabled
                    ? "rgba(0,0,0,0.03)"
                    : "rgba(0,0,0,0.08)",
                  cursor:         sendDisabled ? "not-allowed" : "pointer",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  flexShrink:     0,
                  transition:     "background 0.15s, color 0.15s",
                  opacity:        sendDisabled ? 0.45 : 1,
                }}
              >
                <SendSVG disabled={sendDisabled} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};