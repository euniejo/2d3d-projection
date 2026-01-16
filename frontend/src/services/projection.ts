import * as THREE from 'three';
import type {
  ColmapCameraIntrinsics,
  ColmapImageExtrinsics,
  Ray
} from '../types';

/**
 * 좌표계 설계:
 * - COLMAP: X-right, Y-down, Z-forward
 * - Three.js: X-right, Y-up, Z-backward
 * - 변환: Z축만 뒤집기 (x, y, z) → (x, y, -z)
 */
function flipZ(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, -v.z);
}

/**
 * 카메라의 월드 좌표 위치 계산
 * COLMAP은 월드→카메라 변환을 저장하므로 역변환 필요
 * C = -R^T * t
 */
export function getCameraPosition(image: ColmapImageExtrinsics): THREE.Vector3 {
  // 1. Quaternion → 회전 행렬
  const R = new THREE.Matrix4().makeRotationFromQuaternion(image.quaternion);

  // 2. R^T (전치 행렬) = R의 역행렬
  const R_T = R.clone().transpose();

  // 3. 카메라 위치 = -R^T * t
  const t = image.translation.clone();
  const cameraPos = t.clone().applyMatrix4(R_T).negate();

  // Z축 뒤집기
  return flipZ(cameraPos);
}

/**
 * 픽셀 좌표 → 카메라 좌표계 광선 방향
 * Pinhole 카메라 모델 사용
 */
export function pixelToRay(
  u: number,
  v: number,
  intrinsics: ColmapCameraIntrinsics
): THREE.Vector3 {
  // 정규화 좌표 계산
  const x_norm = (u - intrinsics.cx) / intrinsics.f;
  const y_norm = (v - intrinsics.cy) / intrinsics.f;

  // 카메라 좌표계의 광선 방향 (Z=1 평면으로 투영)
  return new THREE.Vector3(x_norm, y_norm, 1).normalize();
}

/**
 * 카메라 좌표계 광선 → 월드 좌표계 광선
 */
export function rayToWorld(
  rayCam: THREE.Vector3,
  image: ColmapImageExtrinsics
): THREE.Vector3 {
  // 회전 행렬의 역행렬 (= 전치) 적용
  const R = new THREE.Matrix4().makeRotationFromQuaternion(image.quaternion);
  const R_T = R.clone().transpose();

  // 광선 방향을 월드 좌표계로 변환 후 Z축 뒤집기
  const rayWorld = rayCam.clone().applyMatrix4(R_T).normalize();
  return flipZ(rayWorld).normalize();
}

/**
 * 2D 픽셀 → 3D 광선 (월드 좌표계)
 */
export function pixelToWorldRay(
  u: number,
  v: number,
  intrinsics: ColmapCameraIntrinsics,
  image: ColmapImageExtrinsics
): Ray {
  // 1. 픽셀 → 카메라 좌표계 광선
  const rayCam = pixelToRay(u, v, intrinsics);

  // 2. 카메라 좌표계 → 월드 좌표계
  const rayWorld = rayToWorld(rayCam, image);

  // 3. 카메라 월드 위치
  const origin = getCameraPosition(image);

  return {
    origin,
    direction: rayWorld
  };
}

/**
 * 광선과 3D 점 사이의 최단 거리 계산
 */
export function rayToPointDistance(
  ray: Ray,
  point: THREE.Vector3
): { distance: number; closestPoint: THREE.Vector3 } {
  const toPoint = point.clone().sub(ray.origin);
  const projLength = toPoint.dot(ray.direction);
  const closestPoint = ray.origin.clone().add(
    ray.direction.clone().multiplyScalar(projLength)
  );
  const distance = closestPoint.distanceTo(point);

  return { distance, closestPoint };
}
