# 데이터 배치 가이드

## 필요한 파일들

### 1. COLMAP 파일
`frontend/public/colmap/` 폴더에 배치:
- `cameras.txt` - 카메라 내부 파라미터
- `images.txt` - 이미지 외부 파라미터 (포즈)
- `points3D.txt` (옵션) - 3D 점 데이터

### 2. 원본 이미지
`frontend/public/images/` 폴더에 배치:
- DJI_20250914104155_0022_V.JPG
- DJI_20250914104155_0023_V.JPG
- ... (COLMAP images.txt에 나열된 모든 이미지)

### 3. 3D 모델
`frontend/public/` 폴더에 배치:
- `model.glb` - 3D 모델 파일

## 예시 구조
```
frontend/public/
├── colmap/
│   ├── cameras.txt
│   ├── images.txt
│   └── points3D.txt
├── images/
│   ├── DJI_20250914104155_0022_V.JPG
│   ├── DJI_20250914104155_0023_V.JPG
│   └── ...
└── model.glb
```

## 파일 준비 후 실행
```bash
cd frontend
npm run dev
```

브라우저에서 http://localhost:3000 접속
