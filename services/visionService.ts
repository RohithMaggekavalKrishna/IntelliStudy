import { FilesetResolver, FaceLandmarker, ObjectDetector } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;
let objectDetector: ObjectDetector | null = null;

// Initialize Face Landmarker (Attention)
export const initializeVision = async () => {
  if (faceLandmarker) return faceLandmarker;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  
  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      delegate: "GPU",
    },
    outputFaceBlendshapes: true,
    runningMode: "VIDEO",
    numFaces: 1,
  });
  
  return faceLandmarker;
};

// Initialize Object Detector (Phone Detection)
export const initializeObjectDetector = async () => {
  if (objectDetector) return objectDetector;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  objectDetector = await ObjectDetector.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
      delegate: "GPU",
    },
    scoreThreshold: 0.5, // 50% confidence required
    runningMode: "VIDEO",
    categoryAllowlist: ["cell phone", "mobile phone"] // Only look for phones
  });

  return objectDetector;
}

export const getFaceLandmarker = () => faceLandmarker;
export const getObjectDetector = () => objectDetector;

export const calculateHeadPose = (landmarks: any[]) => {
  // Landmarks: 1 is nose tip, 152 is chin, 10 is top of head
  // 234 is left ear, 454 is right ear
  const nose = landmarks[1];
  const leftEar = landmarks[234];
  const rightEar = landmarks[454];
  const topHead = landmarks[10];
  const chin = landmarks[152];

  // Yaw: Rotation Left/Right
  const midEarX = (leftEar.x + rightEar.x) / 2;
  const yawRaw = nose.x - midEarX; 
  const yaw = yawRaw * 200; 

  // Pitch: Up/Down
  // When looking down (phone), nose gets closer to chin in Y relative to whole face height
  const faceHeight = chin.y - topHead.y;
  const noseToChin = chin.y - nose.y;
  const pitchRatio = noseToChin / faceHeight;
  
  const pitch = (0.6 - pitchRatio) * 150; 

  return { pitch, yaw };
};