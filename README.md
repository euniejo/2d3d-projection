# 2D-3D Projection Viewer

이미지에서 클릭한 2D 픽셀을 3D 모델 좌표로 변환하는 웹 애플리케이션

## 프로젝트 구조

```
projection_project2/
├── backend/              # Python FastAPI 서버
│   ├── main.py          # API 서버
│   ├── config.py        # 경로 설정 ⚙️
│   ├── requirements.txt
│   └── README.md
├── frontend/            # React + Three.js
│   ├── src/
│   ├── public/
│   └── package.json
└── doc/                 # 문서
```

## 🚀 시작하기

### 1단계: 경로 설정

**`backend/config.py`** 파일을 열어서 실제 경로로 수정:

```python
COLMAP_DIR = r"C:\your\path\to\colmap"      # cameras.txt, images.txt 폴더
IMAGES_DIR = r"C:\your\path\to\images"      # 원본 이미지 폴더 (378장)
MODEL_PATH = r"C:\your\path\to\model.glb"   # 3D 모델 파일
```

### 2단계: 백엔드 실행

```bash
# Python 패키지 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main.py
```

서버가 http://localhost:8000 에서 실행됩니다.

### 3단계: 프론트엔드 실행

```bash
# 새 터미널 열기
cd frontend
npm run dev
```

브라우저에서 http://localhost:3000 (또는 http://localhost:5173) 접속

## 📦 필요한 데이터

### COLMAP 파일
- `cameras.txt` - 카메라 내부 파라미터
- `images.txt` - 이미지 외부 파라미터 (포즈)

### 이미지 폴더
- 원본 2D 이미지들 (378장)
- DJI_xxx.JPG 형식

### 3D 모델
- `model.glb` - GLB 형식 3D 모델

## 🎯 사용 방법

1. **이미지 선택**: 하단 갤러리에서 이미지 클릭
2. **2D 클릭**: 좌측 이미지 뷰어에서 원하는 지점 클릭
3. **3D 확인**: 우측 3D 뷰어에서 투영된 점 확인

## 🔧 주요 기능

- ✅ COLMAP 데이터 파싱
- ✅ 2D 픽셀 → 3D 광선 계산
- ✅ 좌표계 변환 (COLMAP ↔ Three.js)
- ✅ 분할 화면 UI
- ✅ 이미지 확대/축소
- ✅ 378장 이미지 지원

## 📝 참고 문서

- [doc/2026-01-13-colmap-2d-3d-projection-coordinate-transform.md](doc/2026-01-13-colmap-2d-3d-projection-coordinate-transform.md) - 변환 수식 상세 설명
- [doc/dev-Freaktech-001-PoC 2D-3D Projection.md](doc/dev-Freaktech-001-PoC%202D-3D%20Projection.md) - 프로젝트 개요
