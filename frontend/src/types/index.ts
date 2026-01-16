import * as THREE from 'three';

export interface ColmapCameraIntrinsics {
  cameraId: number;
  model: string;
  width: number;
  height: number;
  f: number;    // focal length
  cx: number;   // principal point x
  cy: number;   // principal point y
  k?: number;   // radial distortion coefficient (optional)
}

export interface ColmapImageExtrinsics {
  imageId: number;
  name: string;
  quaternion: THREE.Quaternion;  // QW, QX, QY, QZ
  translation: THREE.Vector3;    // TX, TY, TZ
  cameraId: number;
  points2D?: Array<{ x: number; y: number; point3DId: number }>;
}

export interface ColmapPoint3D {
  point3DId: number;
  position: THREE.Vector3;
  color: [number, number, number];
  error: number;
  track: Array<{ imageId: number; point2DIdx: number }>;
}

export interface ProjectedPoint {
  position: [number, number, number];  // [x, y, z]
  imagePixel: [number, number];
  imageName: string;
  distance?: number;  // ray와 교차점 거리
}

export interface Ray {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
}
export interface ModelTransform {
  scale: number
  rotation: THREE.Euler
  position: THREE.Vector3
  modelOffset?: THREE.Vector3  // 모델 중심 오프셋 (COLMAP 좌표 변환용)
}