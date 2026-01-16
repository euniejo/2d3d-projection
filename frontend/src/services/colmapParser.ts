import * as THREE from 'three';
import type {
  ColmapCameraIntrinsics,
  ColmapImageExtrinsics,
  ColmapPoint3D
} from '../types';

/**
 * COLMAP cameras.txt 파싱
 * 형식: # Camera list with one line of data per camera:
 * #   CAMERA_ID, MODEL, WIDTH, HEIGHT, PARAMS[]
 * # Number of cameras: X
 */
export function parseCamerasTxt(content: string): Map<number, ColmapCameraIntrinsics> {
  const cameras = new Map<number, ColmapCameraIntrinsics>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // 주석이나 빈 줄 건너뛰기
    if (trimmed.startsWith('#') || trimmed.length === 0) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) continue;

    const cameraId = parseInt(parts[0]);
    const model = parts[1];
    const width = parseInt(parts[2]);
    const height = parseInt(parts[3]);

    // SIMPLE_RADIAL: f, cx, cy, k
    if (model === 'SIMPLE_RADIAL' && parts.length >= 8) {
      cameras.set(cameraId, {
        cameraId,
        model,
        width,
        height,
        f: parseFloat(parts[4]),
        cx: parseFloat(parts[5]),
        cy: parseFloat(parts[6]),
        k: parseFloat(parts[7])
      });
    }
    // PINHOLE: fx, fy, cx, cy
    else if (model === 'PINHOLE' && parts.length >= 8) {
      const fx = parseFloat(parts[4]);
      const fy = parseFloat(parts[5]);
      cameras.set(cameraId, {
        cameraId,
        model,
        width,
        height,
        f: (fx + fy) / 2,  // 평균 초점거리
        cx: parseFloat(parts[6]),
        cy: parseFloat(parts[7])
      });
    }
  }

  return cameras;
}

/**
 * COLMAP images.txt 파싱
 * 형식:
 * #   IMAGE_ID, QW, QX, QY, QZ, TX, TY, TZ, CAMERA_ID, NAME
 * #   POINTS2D[] as (X, Y, POINT3D_ID)
 */
export function parseImagesTxt(content: string): Map<number, ColmapImageExtrinsics> {
  const images = new Map<number, ColmapImageExtrinsics>();
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // 주석이나 빈 줄 건너뛰기
    if (line.startsWith('#') || line.length === 0) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 10) continue;

    const imageId = parseInt(parts[0]);
    const qw = parseFloat(parts[1]);
    const qx = parseFloat(parts[2]);
    const qy = parseFloat(parts[3]);
    const qz = parseFloat(parts[4]);
    const tx = parseFloat(parts[5]);
    const ty = parseFloat(parts[6]);
    const tz = parseFloat(parts[7]);
    const cameraId = parseInt(parts[8]);
    const name = parts[9];

    // COLMAP: QW, QX, QY, QZ
    // Three.js Quaternion: (x, y, z, w)
    const quaternion = new THREE.Quaternion(qx, qy, qz, qw);
    const translation = new THREE.Vector3(tx, ty, tz);

    const image: ColmapImageExtrinsics = {
      imageId,
      name,
      quaternion,
      translation,
      cameraId,
      points2D: []
    };

    // 다음 줄이 POINTS2D 데이터인 경우 (옵션)
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (!nextLine.startsWith('#') && nextLine.length > 0) {
        const points2DParts = nextLine.split(/\s+/);
        for (let j = 0; j < points2DParts.length; j += 3) {
          if (j + 2 < points2DParts.length) {
            image.points2D?.push({
              x: parseFloat(points2DParts[j]),
              y: parseFloat(points2DParts[j + 1]),
              point3DId: parseInt(points2DParts[j + 2])
            });
          }
        }
        i++; // POINTS2D 줄 건너뛰기
      }
    }

    images.set(imageId, image);
  }

  return images;
}

/**
 * COLMAP points3D.txt 파싱 (옵션)
 * 형식:
 * #   POINT3D_ID, X, Y, Z, R, G, B, ERROR, TRACK[] as (IMAGE_ID, POINT2D_IDX)
 */
export function parsePoints3DTxt(content: string): Map<number, ColmapPoint3D> {
  const points = new Map<number, ColmapPoint3D>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.length === 0) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 8) continue;

    const point3DId = parseInt(parts[0]);
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);
    const r = parseInt(parts[4]);
    const g = parseInt(parts[5]);
    const b = parseInt(parts[6]);
    const error = parseFloat(parts[7]);

    const track: Array<{ imageId: number; point2DIdx: number }> = [];
    for (let i = 8; i < parts.length; i += 2) {
      if (i + 1 < parts.length) {
        track.push({
          imageId: parseInt(parts[i]),
          point2DIdx: parseInt(parts[i + 1])
        });
      }
    }

    points.set(point3DId, {
      point3DId,
      position: new THREE.Vector3(x, y, z),
      color: [r, g, b],
      error,
      track
    });
  }

  return points;
}

/**
 * 백엔드 API에서 COLMAP 데이터 로드
 */
export async function loadColmapData(
  apiBaseUrl: string = 'http://localhost:8000'
): Promise<{
  cameras: Map<number, ColmapCameraIntrinsics>;
  images: Map<number, ColmapImageExtrinsics>;
  points3D?: Map<number, ColmapPoint3D>;
}> {
  const [camerasText, imagesText] = await Promise.all([
    fetch(`${apiBaseUrl}/api/colmap/cameras`).then(r => {
      if (!r.ok) throw new Error('Failed to load cameras.txt');
      return r.text();
    }),
    fetch(`${apiBaseUrl}/api/colmap/images`).then(r => {
      if (!r.ok) throw new Error('Failed to load images.txt');
      return r.text();
    })
  ]);

  return {
    cameras: parseCamerasTxt(camerasText),
    images: parseImagesTxt(imagesText),
  };
}

/**
 * 백엔드 API에서 이미지 목록 로드
 */
export async function loadImageList(
  apiBaseUrl: string = 'http://localhost:8000',
  limit: number = 5
): Promise<string[]> {
  const response = await fetch(`${apiBaseUrl}/api/images/list?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load image list');
  
  const data = await response.json();
  return data.images;
}
