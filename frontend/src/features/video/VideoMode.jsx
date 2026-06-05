import { useState, useRef, useEffect } from "react";
import { VideoUploader } from "./components/VideoUploader";
import { ProcessingScreen } from "./components/ProcessingScreen";
import { ForensicTimeline } from "./components/ForensicTimeline";
import { KeyFramesGrid } from "./components/KeyFramesGrid";
import { ResultsSidebar } from "./components/ResultsSidebar";
import { FrameEvidenceModal } from "./components/FrameEvidenceModal";

export const VideoMode = () => {
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [frameIndex, setFrameIndex] = useState(0);
  
  const [videoUrl, setVideoUrl] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [keyFrames, setKeyFrames] = useState([]);
  const [verdict, setVerdict] = useState({ label: "", score: 0 });
  const [events, setEvents] = useState([]);
  const [frameStats, setFrameStats] = useState({ total: 0, suspicious: 0 });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));

    setPhase("processing");
    setProgress(0);
    
    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 2;
      if (p >= 90) p = 90;
      setProgress(p);
    }, 200);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch("http://localhost:8000/analyze/video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Video analysis failed.");
      const data = await response.json();

      const mappedTimeline = data.frame_details.map(f => ({
        t: f.timestamp.toFixed(1),
        score: f.confidence * 100, 
        frame: f.frame_idx,
        reason: f.reasoning,
        image_base64: f.image_base64 
      }));
      setTimelineData(mappedTimeline);

      const topFrames = [...mappedTimeline].sort((a, b) => b.score - a.score).slice(0, 5);
      setKeyFrames(topFrames);

      setVerdict({ label: data.label, score: data.aggregate_confidence * 100 });
      setEvents(data.aggregate_events); 

      const suspiciousCount = mappedTimeline.filter(f => f.score > 60).length;
      setFrameStats({ total: mappedTimeline.length, suspicious: suspiciousCount });

      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => setPhase("done"), 400);

    } catch (error) {
      console.error("Error analyzing video:", error);
      clearInterval(progressInterval);
      setPhase("idle");
      alert("Analysis failed. Please check the backend logs.");
    }
  };

  useEffect(() => {
    if (phase === "processing") {
      const t = setInterval(() => setFrameIndex(i => (i + 1) % 12), 120);
      return () => clearInterval(t);
    }
  }, [phase]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      
      {phase === "idle" && (
        <VideoUploader 
          onFileSelect={handleFileSelect} 
          fileInputRef={fileInputRef} 
        />
      )}

      {phase === "processing" && (
        <ProcessingScreen 
          progress={progress} 
          frameIndex={frameIndex} 
        />
      )}

      {phase === "done" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
          
          {/* Main Content Area */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              background: "#0a0d14", border: "1px solid var(--border)",
              borderRadius: 2, height: 280, display: "flex", alignItems: "center", 
              justifyContent: "center", position: "relative", overflow: "hidden"
            }}>
              {videoUrl ? (
                <video src={videoUrl} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)" }}>
                  ▶ VIDEO PREVIEW
                </span>
              )}
              {verdict.score > 60 && (
                <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
                  <span className="tag tag-red">⚠ FORGERY DETECTED</span>
                </div>
              )}
            </div>

            <ForensicTimeline timelineData={timelineData} />
            
            <KeyFramesGrid 
              keyFrames={keyFrames} 
              selectedFrame={selectedFrame} 
              onSelectFrame={setSelectedFrame} 
            />
          </div>

          {/* Right Sidebar Area */}
          <ResultsSidebar 
            verdict={verdict} 
            frameStats={frameStats} 
            events={events} 
          />
        </div>
      )}

      <FrameEvidenceModal 
        selectedFrame={selectedFrame} 
        onClose={() => setSelectedFrame(null)} 
      />
      
    </div>
  );
};