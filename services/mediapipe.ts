import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export class HandTrackingService {
  handLandmarker: HandLandmarker | null = null;
  
  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });
  }

  detect(video: HTMLVideoElement, startTimeMs: number) {
    if (this.handLandmarker) {
      return this.handLandmarker.detectForVideo(video, startTimeMs);
    }
    return null;
  }
}

export const calculateDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};