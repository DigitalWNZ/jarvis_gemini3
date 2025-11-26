import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { HandTrackingService, calculateDistance } from './services/mediapipe';
import HolographicEarth from './components/Earth';
import InfoPanel from './components/InfoPanel';
import { HandLandmark, SystemStatus, GeoData } from './types';

// Random data generator
const getRandomHex = () => Math.floor(Math.random() * 16777215).toString(16).toUpperCase();

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const earthRotationRef = useRef({ x: 0, y: 0 });
  const earthScaleRef = useRef(1);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelPosRef = useRef({ x: window.innerWidth - 350, y: 200 });
  
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.INITIALIZING);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [handStatus, setHandStatus] = useState("未检测到手部");
  const [geoData, setGeoData] = useState<GeoData>({
    region: 'SCANNING...',
    population: '000,000,000',
    threatLevel: 'NORMAL',
    status: 'WAITING FOR INPUT...'
  });

  // Random matrix rain effect data
  const [hexCodes, setHexCodes] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
      setHexCodes(prev => [`0x${getRandomHex()}`, ...prev.slice(0, 8)]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Main Logic Loop
  useEffect(() => {
    const handService = new HandTrackingService();
    let animationFrameId: number;

    const startTracking = async () => {
      try {
        await handService.initialize();
        setStatus(SystemStatus.ACTIVE);

        const video = videoRef.current;
        const canvas = canvas2dRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Camera setup
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720, facingMode: "user" } 
        });
        video.srcObject = stream;
        video.play();

        const renderLoop = () => {
          if (video.readyState >= 2) {
            // 1. Draw Video Frame (Darkened for HUD effect)
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Mirror logic for drawing video
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Overlay darkening
            ctx.fillStyle = 'rgba(0, 20, 30, 0.6)'; // Cyberpunk tint
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 2. MediaPipe Detection
            const results = handService.detect(video, Date.now());

            if (results && results.landmarks.length > 0) {
              setHandStatus(`检测到 ${results.landmarks.length} 只手`);
              
              results.landmarks.forEach((landmarks, index) => {
                // Draw Skeleton
                drawHandSkeleton(ctx, landmarks);

                // Identify hand role based on screen position (after mirror flip logic)
                // Video is mirrored, so left on screen is actual right hand of user (usually).
                // Let's rely on simple screen regions: Left Half vs Right Half
                const wrist = landmarks[0]; // normalized 0-1
                
                // Note: Landmarks are normalized. 0,0 is top-left of VIDEO source.
                // Since we render mirrored, x=0 is right side of screen, x=1 is left side.
                // Let's use the raw X coordinate.
                // MediaPipe returns X where 0 is left, 1 is right of the IMAGE.
                
                const isLeftScreenSide = wrist.x > 0.5; // Mirrored: >0.5 means left side of canvas

                if (isLeftScreenSide) {
                  // --- LEFT SCREEN SIDE: CONTROLS EARTH ---
                  // 1. Rotation (Palm Center)
                  const palmX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
                  const palmY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;
                  
                  // Map X (0.5 to 1) to Rotation Y (-PI to PI)
                  earthRotationRef.current.y = (palmX - 0.75) * 10; 
                  // Map Y (0 to 1) to Rotation X (-1 to 1)
                  earthRotationRef.current.x = (palmY - 0.5) * 2;

                  // 2. Zoom (Pinch)
                  const thumbTip = landmarks[4];
                  const indexTip = landmarks[8];
                  const dist = calculateDistance(thumbTip, indexTip);
                  
                  // Clamp scale between 0.5 and 2.0
                  const scale = Math.min(Math.max(dist * 5, 0.5), 2.0);
                  earthScaleRef.current = scale;
                  
                  // Visual cue for pinch
                  if (dist < 0.05) {
                    drawConnectLine(ctx, thumbTip, indexTip, '#FFFF00');
                  }
                } else {
                   // --- RIGHT SCREEN SIDE: CONTROLS PANEL ---
                   // Pinch to Drag
                   const thumbTip = landmarks[4];
                   const indexTip = landmarks[8];
                   const dist = calculateDistance(thumbTip, indexTip);
                   
                   // Coordinate conversion (Mirrored)
                   // Canvas X = (1 - landmark.x) * width
                   const screenX = (1 - indexTip.x) * canvas.width;
                   const screenY = indexTip.y * canvas.height;

                   // Draw cursor
                   ctx.beginPath();
                   ctx.arc(screenX, screenY, 10, 0, 2 * Math.PI);
                   ctx.strokeStyle = '#00FFFF';
                   ctx.stroke();

                   if (dist < 0.08) { // Pinching
                     // Draw active drag line
                     drawConnectLine(ctx, thumbTip, indexTip, '#FF00FF');
                     
                     if (panelRef.current) {
                        // Smoothly move panel to finger position
                        panelPosRef.current.x = screenX - 160; // Center offset
                        panelPosRef.current.y = screenY - 50;
                        panelRef.current.style.transform = `translate(${panelPosRef.current.x}px, ${panelPosRef.current.y}px)`;
                        panelRef.current.style.border = "2px solid #FF00FF";
                     }
                   } else {
                     if (panelRef.current) {
                       panelRef.current.style.border = "1px solid rgba(0, 255, 255, 0.3)";
                     }
                   }
                }
              });
            } else {
              setHandStatus("未检测到手部");
            }
            
            ctx.restore();
          }
          animationFrameId = requestAnimationFrame(renderLoop);
        };
        renderLoop();
      } catch (err) {
        console.error("Initialization failed:", err);
        setStatus(SystemStatus.ERROR);
      }
    };

    startTracking();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const drawConnectLine = (ctx: CanvasRenderingContext2D, p1: HandLandmark, p2: HandLandmark, color: string) => {
    // Note: This needs to be called inside the mirrored context or adjusted manually
    // Since we are inside ctx.save()/scale(-1,1), we pass raw landmark coords
    ctx.beginPath();
    ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
    ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: HandLandmark[]) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
    ];

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00FFFF';
    ctx.fillStyle = '#003333';

    // Draw Lines
    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * ctx.canvas.width, landmarks[start].y * ctx.canvas.height);
      ctx.lineTo(landmarks[end].x * ctx.canvas.width, landmarks[end].y * ctx.canvas.height);
      ctx.stroke();
    });

    // Draw Points
    landmarks.forEach((lm) => {
      ctx.beginPath();
      ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  };

  const handleRegionChange = (region: string) => {
    if (region !== geoData.region) {
      setGeoData(prev => ({
        ...prev,
        region,
        population: Math.floor(Math.random() * 900000000 + 10000000).toLocaleString(),
        status: 'ANALYZING...'
      }));
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono text-holo-cyan select-none">
      
      {/* 1. Webcam Video (Hidden, processed into canvas) */}
      <video ref={videoRef} className="hidden" playsInline muted />
      
      {/* 2. 2D Canvas Layer (Background + UI Skeleton) */}
      <canvas 
        ref={canvas2dRef} 
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      />

      {/* 3. Scanline Overlay */}
      <div className="absolute top-0 left-0 w-full h-full scanline-overlay z-10 opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 opacity-20 animate-scanline z-10 pointer-events-none shadow-[0_0_20px_#00FFFF]" />

      {/* 4. 3D Layer (Holograms) */}
      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#00FFFF" />
          <Suspense fallback={null}>
            <HolographicEarth 
              rotationRef={earthRotationRef} 
              scaleRef={earthScaleRef}
              onRegionChange={handleRegionChange}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* 5. UI Layer (HUD) */}
      
      {/* Top Left: System Stats */}
      <div className="absolute top-8 left-8 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-holo-cyan animate-ping" />
          <h2 className="text-xl font-bold tracking-widest text-shadow">SYS.STATUS: {status}</h2>
        </div>
        <div className="text-xs text-cyan-600 font-mono leading-tight opacity-70">
          {hexCodes.map((hex, i) => (
            <div key={i}>{hex} :: MEM_ADDR_{1000 + i}</div>
          ))}
        </div>
      </div>

      {/* Top Right: Header */}
      <div className="absolute top-8 right-8 z-20 text-right pointer-events-none">
        <h1 className="text-4xl font-bold tracking-widest holo-text mb-1">J.A.R.V.I.S</h1>
        <div className="flex items-center justify-end gap-3 text-lg">
          <span>{currentTime}</span>
          <span className="inline-block w-20 h-1 bg-gradient-to-l from-holo-cyan to-transparent animate-pulse" />
        </div>
        <div className="text-xs text-cyan-500 mt-2">MK.VII PROTOTYPE HUD</div>
      </div>

      {/* Bottom Left: Hand Tracking Status */}
      <div className="absolute bottom-8 left-8 z-20 pointer-events-none">
        <div className="border-l-2 border-holo-cyan pl-4 bg-gradient-to-r from-cyan-900/40 to-transparent p-2">
          <p className="text-xs text-cyan-400">INPUT_MODULE</p>
          <p className="text-lg font-bold animate-pulse">{handStatus}</p>
          <div className="flex gap-2 mt-2 text-[10px] text-cyan-600">
             <div>L: ROTATE/ZOOM</div>
             <div>R: DRAG PANEL</div>
          </div>
        </div>
      </div>

      {/* Right: Draggable Panel (Managed via Ref for Perf) */}
      <InfoPanel 
        ref={panelRef} 
        data={geoData} 
        style={{ transform: `translate(${panelPosRef.current.x}px, ${panelPosRef.current.y}px)` }}
      />
      
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,10,10,0.8)_100%)] z-10" />

      {/* Initial Loading Overlay */}
      {status === SystemStatus.INITIALIZING && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-holo-cyan">
          <div className="w-16 h-16 border-4 border-t-holo-cyan border-opacity-25 rounded-full animate-spin mb-4" />
          <h2 className="text-xl tracking-widest animate-pulse">INITIALIZING NEURAL INTERFACE...</h2>
          <p className="text-xs mt-2 text-cyan-600">LOADING COMPUTER VISION MODELS</p>
        </div>
      )}
    </div>
  );
};

export default App;