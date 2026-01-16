# Backend API Server

## 설정

1. `config.py` 파일을 열어서 실제 경로로 수정:

```python
COLMAP_DIR = r"C:\your\path\to\colmap"    # cameras.txt, images.txt 폴더
IMAGES_DIR = r"C:\your\path\to\images"    # 원본 이미지 폴더 (378장)
MODEL_PATH = r"C:\your\path\to\model.glb" # 3D 모델 파일
```

## 설치

```bash
cd backend
pip install -r requirements.txt
```

## 실행

```bash
python main.py
```

서버가 http://localhost:8000 에서 시작됩니다.

## API 엔드포인트

- `GET /` - API 정보
- `GET /api/colmap/cameras` - cameras.txt 내용
- `GET /api/colmap/images` - images.txt 내용
- `GET /api/images/list` - 이미지 목록
- `GET /api/images/{filename}` - 개별 이미지
- `GET /api/model` - 3D 모델
- `GET /health` - 헬스 체크 (경로 확인용)
