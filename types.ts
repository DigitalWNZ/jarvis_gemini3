export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResults {
  landmarks: HandLandmark[][];
  handedness: { index: number; score: number; label: string; displayName: string }[][];
}

export interface GeoData {
  region: string;
  population: string;
  threatLevel: string;
  status: string;
}

export enum SystemStatus {
  INITIALIZING = "初始化中",
  ACTIVE = "系统在线",
  SCANNING = "扫描目标",
  ERROR = "连接失败"
}