# COLMAP 2D→3D Projection 좌표 변환 상세 설명

> **작성일**: 2026-01-13
> **관련 파일**: `src/core/ColmapProjection.ts`
> **테스트 버튼**: Debug 패널의 "Test 2D→3D" 버튼

---

## 1. 사용한 데이터

### 1.1 COLMAP 카메라 내부 파라미터 (cameras.txt)
```
Camera ID: 585
Model: SIMPLE_RADIAL
Width: 5280, Height: 3956
Parameters: f=3694.86, cx=2634.28, cy=1975.41, k=0.018
```

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| **f** | 3694.86 pixels | 센서 픽셀 단위의 초점 거리 |
| **cx, cy** | (2634.28, 1975.41) | 이미지 중심점 (광학 중심) |
| **k** | 0.018 | 방사 왜곡 계수 (현재 미적용) |

### 1.2 COLMAP 이미지 외부 파라미터 (images.txt)
```
Image ID: 1201
Name: DJI_20250914104155_0022_V.JPG
Quaternion: QW=0.00330, QX=0.00305, QY=-0.99999, QZ=-0.00168
Translation: TX=-1.718, TY=7.768, TZ=6.308
```

### 1.3 테스트 2D 좌표 및 Ground Truth
```
2D 픽셀 좌표: (2087.13, 2217.13)
Ground Truth 3D (COLMAP): (-1.073, -7.511, 2.127)
```
이 데이터는 images.txt의 POINTS2D 라인에서 Point3D ID 39829에 해당하는 좌표입니다.

---

## 2. 좌표계 시스템

### 2.1 COLMAP 좌표계
```
     Z (전방/깊이)
     ↑
     |
     |
     +────→ X (오른쪽)
    /
   ↓
  Y (아래)
```
- **월드 좌표계**: Z-up (Z가 위쪽)
- **카메라 좌표계**: X-오른쪽, Y-아래, Z-전방

### 2.2 프로젝트 좌표계 (Three.js/CSV)
```
     Y (위)
     ↑
     |
     |
     +────→ X (오른쪽)
    /
   ↙
  Z (카메라 방향)
```
- **월드 좌표계**: Y-up

### 2.3 좌표 변환 공식

CSV 파일의 카메라 좌표와 COLMAP 계산 좌표를 비교하여 도출:

| 소스 | X | Y | Z |
|------|-----|------|------|
| CSV | -1.71 | 6.27 | 7.80 |
| COLMAP 계산 | -1.71 | -7.80 | 6.27 |

```typescript
// COLMAP → Project 좌표 변환
function colmapToProjectCoords(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.z, -v.y);
}
```

**변환 규칙**: `Project(x, y, z) = COLMAP(x, z, -y)`

---

## 3. 카메라 위치 계산

### 3.1 COLMAP의 카메라 포즈 표현

COLMAP은 **월드→카메라 변환**을 저장합니다:
- `R`: Quaternion으로 표현된 회전 행렬
- `t`: Translation 벡터

**카메라 좌표계에서 점 변환**:
```
P_camera = R * P_world + t
```

### 3.2 카메라 월드 위치 역산

카메라의 월드 좌표 위치를 구하려면 역변환이 필요합니다:

```typescript
export function getCameraPosition(image: ColmapImageExtrinsics): THREE.Vector3 {
  // 1. Quaternion → 회전 행렬
  const R = new THREE.Matrix4().makeRotationFromQuaternion(image.quaternion);

  // 2. R^T (전치 행렬) = R의 역행렬 (회전 행렬은 직교 행렬이므로)
  const R_T = R.clone().transpose();

  // 3. 카메라 위치 = -R^T * t
  const t = image.translation.clone();
  const cameraPos = t.clone().applyMatrix4(R_T).negate();

  // 4. COLMAP → Project 좌표계 변환
  return colmapToProjectCoords(cameraPos);
}
```

**수학적 유도**:
```
P_camera = R * P_world + t
0 = R * C + t        (카메라 위치 C는 카메라 좌표계에서 원점)
R * C = -t
C = -R^(-1) * t
C = -R^T * t         (직교 행렬이므로 R^(-1) = R^T)
```

---

## 4. 2D 픽셀 → 3D 광선 변환

### 4.1 픽셀 좌표 → 정규화 좌표

```typescript
export function pixelToRay(
  u: number,  // 픽셀 x
  v: number,  // 픽셀 y
  intrinsics: ColmapCameraIntrinsics
): THREE.Vector3 {
  // 정규화 좌표 계산
  const x_norm = (u - intrinsics.cx) / intrinsics.f;
  const y_norm = (v - intrinsics.cy) / intrinsics.f;

  // 카메라 좌표계의 광선 방향 (Z=1 평면으로 투영)
  return new THREE.Vector3(x_norm, y_norm, 1).normalize();
}
```

**Pinhole 카메라 모델**:
```
     u - cx
x = ─────────
        f

     v - cy
y = ─────────
        f

z = 1 (정규화)
```

### 4.2 카메라 좌표계 → 월드 좌표계

```typescript
export function rayToWorld(
  rayCam: THREE.Vector3,
  image: ColmapImageExtrinsics
): THREE.Vector3 {
  // 회전 행렬의 역행렬 (= 전치) 적용
  const R = new THREE.Matrix4().makeRotationFromQuaternion(image.quaternion);
  const R_T = R.clone().transpose();

  // 광선 방향을 월드 좌표계로 변환
  const rayWorld = rayCam.clone().applyMatrix4(R_T).normalize();

  // COLMAP → Project 좌표계 변환
  return colmapToProjectCoords(rayWorld).normalize();
}
```

**방향 벡터 변환**:
- 위치와 달리 방향 벡터는 translation이 필요 없음
- `d_world = R^T * d_camera`

---

## 5. 광선과 3D 점 거리 계산

### 5.1 점에서 직선까지의 최단 거리

```typescript
// 광선: P = O + t * D
// 점 G까지의 최단 거리

const toPoint = groundTruth.clone().sub(ray.origin);     // O → G 벡터
const projLength = toPoint.dot(ray.direction);           // 광선 방향으로 투영 길이
const closestPoint = ray.origin.clone().add(
  ray.direction.clone().multiplyScalar(projLength)
);                                                       // 광선 상의 가장 가까운 점
const error = closestPoint.distanceTo(groundTruth);      // 오차 거리
```

**기하학적 의미**:
```
        G (Ground Truth)
        |
        | error
        |
  O ────+────→ D (광선 방향)
       closest
```

---

## 6. 전체 파이프라인 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    입력 데이터                               │
├─────────────────────────────────────────────────────────────┤
│ 2D 픽셀: (2087, 2217)                                       │
│ 카메라: f=3694, cx=2634, cy=1975                            │
│ 포즈: Q=(0.003, -0.999, -0.001, 0.003), T=(-1.71, 7.76, 6.30)│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Step 1: 카메라 위치 계산                        │
├─────────────────────────────────────────────────────────────┤
│ R = quaternionToMatrix(Q)                                   │
│ C_colmap = -R^T * T = (-1.71, -7.80, 6.27)                  │
│ C_project = colmapToProject(C_colmap) = (-1.71, 6.27, 7.80) │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Step 2: 픽셀 → 광선 방향                        │
├─────────────────────────────────────────────────────────────┤
│ x_norm = (2087 - 2634) / 3694 = -0.148                      │
│ y_norm = (2217 - 1975) / 3694 = 0.065                       │
│ d_camera = normalize(-0.148, 0.065, 1)                      │
│ d_world = R^T * d_camera                                    │
│ d_project = colmapToProject(d_world)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Step 3: Ground Truth 변환                       │
├─────────────────────────────────────────────────────────────┤
│ GT_colmap = (-1.073, -7.511, 2.127)                         │
│ GT_project = colmapToProject(GT_colmap) = (-1.073, 2.127, 7.511)│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Step 4: 오차 계산                               │
├─────────────────────────────────────────────────────────────┤
│ 광선에서 GT까지의 최단 거리 = 0.000m                         │
│ → Projection 정확도 검증 완료                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 시각화 요소

| 요소 | 색상 | 설명 |
|------|------|------|
| 카메라 위치 | 파란 구체 | 계산된 카메라 월드 좌표 |
| 광선 | 노란 화살표 | 클릭 픽셀에서 나가는 3D 광선 |
| Ground Truth | 초록 구체 | COLMAP이 계산한 실제 3D 점 |
| 최근접점 | 빨간 구체 | 광선 상에서 GT에 가장 가까운 점 |
| 오차선 | 빨간 선 | GT와 최근접점 사이 거리 (오차 > 0.01m일 때만 표시) |

---

## 8. 핵심 발견 사항

### 8.1 좌표계 불일치 문제

초기 구현에서 시각화가 건물 내부에 나타나는 문제가 발생했습니다. 원인은 COLMAP과 프로젝트(RealityScan 내보내기)의 좌표계 차이였습니다.

**디버깅 과정**:
1. CSV 파일의 카메라 위치와 COLMAP에서 계산한 위치 비교
2. 축 매핑 패턴 발견: `(x, y, z) → (x, z, -y)`
3. 모든 좌표 변환에 일관되게 적용

### 8.2 Three.js Quaternion 순서

COLMAP과 Three.js의 Quaternion 컴포넌트 순서가 다릅니다:
- **COLMAP**: `QW, QX, QY, QZ`
- **Three.js**: `new Quaternion(x, y, z, w)`

```typescript
// COLMAP images.txt 순서: QW QX QY QZ
// Three.js 생성자 순서: (x, y, z, w)
quaternion: new THREE.Quaternion(
  3.054637723863107e-003,   // QX
  -0.9999884843635579,      // QY
  -1.684283920383899e-003,  // QZ
  3.295984879488266e-003    // QW
),
```

---

## 9. 관련 코드 위치

| 파일 | 함수/컴포넌트 | 역할 |
|------|---------------|------|
| `src/core/ColmapProjection.ts` | `colmapToProjectCoords()` | 좌표계 변환 |
| `src/core/ColmapProjection.ts` | `getCameraPosition()` | 카메라 월드 위치 계산 |
| `src/core/ColmapProjection.ts` | `pixelToWorldRay()` | 2D→3D 광선 생성 |
| `src/core/ColmapProjection.ts` | `visualizeProjectionTest()` | 테스트 시각화 |
| `src/core/SceneManager.ts` | `showProjectionTest()` | 시각화 트리거 |
| `src/App.tsx` | "Test 2D→3D" 버튼 | UI 연결 |
