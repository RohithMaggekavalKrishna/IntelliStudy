import React, { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { initializeVision, initializeObjectDetector, calculateHeadPose, getFaceLandmarker, getObjectDetector } from "../services/visionService";
import { TrackingState, CONSTANTS } from "../types";

interface WebcamTrackerProps {
  onUpdate: (state: TrackingState) => void;
  showFeed?: boolean;
}

const WebcamTracker: React.FC<WebcamTrackerProps> = ({ onUpdate, showFeed = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamStarted, setStreamStarted] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Smoothing Buffers
  const pitchBuffer = useRef<number[]>([]);
  const yawBuffer = useRef<number[]>([]);
  const phoneDetectionCount = useRef<number>(0);
  const frameCounter = useRef<number>(0);

  // Setup Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360 }, // Lower res for performance
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", () => {
            setStreamStarted(true);
          });
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Load All Models
  useEffect(() => {
    Promise.all([initializeVision(), initializeObjectDetector()]).then(() => setModelsLoaded(true));
  }, []);

  // Tracking Loop
  useEffect(() => {
    if (!streamStarted || !modelsLoaded || !videoRef.current || !canvasRef.current) return;

    let animationFrameId: number;
    const faceLandmarker = getFaceLandmarker();
    const objectDetector = getObjectDetector();
    
    const predict = async () => {
      if (videoRef.current && videoRef.current.videoWidth > 0 && faceLandmarker && objectDetector) {
        const startTimeMs = performance.now();
        
        // 1. Face Detection (Every Frame)
        const faceResults = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);

        // 2. Object/Phone Detection (Every 5th Frame to save CPU)
        // We persist the result for the frames in between
        let phoneDetectedInFrame = false;
        if (frameCounter.current % 5 === 0) {
            const objectResults = objectDetector.detectForVideo(videoRef.current, startTimeMs);
            // Check if any detected object is a cell phone
            if (objectResults.detections.length > 0) {
                 phoneDetectedInFrame = objectResults.detections.some(d => 
                    d.categories.some(c => c.categoryName === "cell phone" || c.categoryName === "mobile phone")
                 );
            }
            
            // Update persistence counter
            if (phoneDetectedInFrame) {
                phoneDetectionCount.current = Math.min(phoneDetectionCount.current + 1, 10);
            } else {
                phoneDetectionCount.current = Math.max(phoneDetectionCount.current - 1, 0);
            }
        }
        frameCounter.current++;

        let newState: TrackingState = {
          isFacePresent: false,
          isHeadDown: false,
          isLookingAtScreen: false,
          isPhoneDetected: phoneDetectionCount.current >= CONSTANTS.PHONE_DETECTION_CONFIDENCE,
        };

        if (faceResults.faceLandmarks.length > 0) {
          newState.isFacePresent = true;
          const landmarks = faceResults.faceLandmarks[0];
          const { pitch, yaw } = calculateHeadPose(landmarks);

          // Add to buffers for smoothing
          pitchBuffer.current.push(pitch);
          yawBuffer.current.push(yaw);
          if (pitchBuffer.current.length > CONSTANTS.POSE_BUFFER_SIZE) pitchBuffer.current.shift();
          if (yawBuffer.current.length > CONSTANTS.POSE_BUFFER_SIZE) yawBuffer.current.shift();

          // Calculate average
          const avgPitch = pitchBuffer.current.reduce((a, b) => a + b, 0) / pitchBuffer.current.length;
          const avgYaw = yawBuffer.current.reduce((a, b) => a + b, 0) / yawBuffer.current.length;

          // Head Down Logic (Smoothed)
          if (avgPitch > CONSTANTS.HEAD_DOWN_PITCH_THRESHOLD) {
            newState.isHeadDown = true;
          }

          // Looking Away Logic (Smoothed)
          if (Math.abs(avgYaw) < CONSTANTS.LOOKING_AWAY_YAW_THRESHOLD && !newState.isHeadDown) {
            newState.isLookingAtScreen = true;
          }
        } else {
            // Clear buffers if face lost to prevent stale average
            if (pitchBuffer.current.length > 0) {
                pitchBuffer.current = [];
                yawBuffer.current = [];
            }
        }

        onUpdate(newState);

        // Debug Drawing
        if (showFeed && canvasRef.current) {
             const canvas = canvasRef.current;
             const ctx = canvas.getContext("2d");
             if(ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (newState.isPhoneDetected) {
                    ctx.strokeStyle = "red";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
                    ctx.fillStyle = "red";
                    ctx.font = "bold 16px sans-serif";
                    ctx.fillText("PHONE DETECTED", 20, 40);
                }
             }
        }
      }
      animationFrameId = requestAnimationFrame(predict);
    };

    predict();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [streamStarted, modelsLoaded, onUpdate, showFeed]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-black ${showFeed ? 'h-48 w-64' : 'h-0 w-0'}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-70`}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full transform scale-x-[-1]" />
      {!modelsLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
          Loading AI Models...
        </div>
      )}
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
        <Camera size={10} />
        <span>Local Processing</span>
      </div>
    </div>
  );
};

export default WebcamTracker;