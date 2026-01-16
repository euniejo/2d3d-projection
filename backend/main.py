from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os

# 상대 경로로 config 임포트
import sys
sys.path.append(str(Path(__file__).parent))
from config import COLMAP_DIR, IMAGES_DIR, MODEL_PATH, HOST, PORT

app = FastAPI(title="2D-3D Projection API")

# CORS 설정 (프론트엔드에서 접근 가능하도록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "2D-3D Projection Backend API",
        "endpoints": {
            "colmap_cameras": "/api/colmap/cameras",
            "colmap_images": "/api/colmap/images",
            "image": "/api/images/{filename}",
            "model": "/api/model",
            "image_list": "/api/images/list"
        }
    }

@app.get("/api/colmap/cameras")
def get_cameras():
    """cameras.txt 파일 반환"""
    cameras_path = Path(COLMAP_DIR) / "cameras.txt"
    
    if not cameras_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"cameras.txt not found at {cameras_path}"
        )
    
    with open(cameras_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return Response(content=content, media_type="text/plain")

@app.get("/api/colmap/images")
def get_images_txt():
    """images.txt 파일 반환"""
    images_path = Path(COLMAP_DIR) / "images.txt"
    
    if not images_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"images.txt not found at {images_path}"
        )
    
    with open(images_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return Response(content=content, media_type="text/plain")

@app.get("/api/colmap/points3d")
def get_points3d():
    """points3D.txt 파일 반환 (선택사항)"""
    points_path = Path(COLMAP_DIR) / "points3D.txt"
    
    if not points_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"points3D.txt not found at {points_path}"
        )
    
    with open(points_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return Response(content=content, media_type="text/plain")

@app.get("/api/images/list")
def list_images(limit: int = 5):
    """이미지 폴더의 이미지 파일명 반환 (전체 범위에서 균등하게 분산 샘플링)"""
    import random
    
    images_dir = Path(IMAGES_DIR)
    
    print(f"[DEBUG] Checking images directory: {images_dir}")
    print(f"[DEBUG] Directory exists: {images_dir.exists()}")
    
    if not images_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Images directory not found at {images_dir}"
        )
    
    # 이미지 파일 확장자
    image_extensions = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
    
    images = sorted([
        f.name for f in images_dir.iterdir()
        if f.is_file() and f.suffix in image_extensions
    ])
    
    print(f"[DEBUG] Found {len(images)} images")
    
    if len(images) == 0:
        raise HTTPException(
            status_code=404,
            detail="No images found in directory"
        )
    
    # 전체 범위에서 균등하게 분산된 인덱스 선택
    sample_size = min(limit, len(images))
    if sample_size == len(images):
        sampled_images = images
    else:
        # 균등 간격 계산
        step = len(images) / sample_size
        indices = [int(i * step) for i in range(sample_size)]
        # 약간의 랜덤성 추가 (±10%)
        indices = [max(0, min(len(images) - 1, idx + random.randint(-int(step*0.1), int(step*0.1)))) for idx in indices]
        sampled_images = [images[i] for i in indices]
    
    print(f"[DEBUG] Sampled {sample_size} distributed images: {sampled_images}")
    
    return {
        "count": len(sampled_images),
        "total": len(images),
        "images": sampled_images
    }

@app.get("/api/images/{filename}")
def get_image(filename: str):
    """개별 이미지 파일 반환"""
    image_path = Path(IMAGES_DIR) / filename
    
    if not image_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Image {filename} not found"
        )
    
    return FileResponse(image_path)

@app.get("/api/model")
def get_model():
    """3D 모델 파일 반환"""
    model_path = Path(MODEL_PATH)
    
    if not model_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Model not found at {model_path}"
        )
    
    return FileResponse(model_path)

@app.get("/health")
def health_check():
    """헬스 체크"""
    return {
        "status": "ok",
        "paths": {
            "colmap_dir": str(COLMAP_DIR),
            "images_dir": str(IMAGES_DIR),
            "model_path": str(MODEL_PATH),
            "colmap_exists": Path(COLMAP_DIR).exists(),
            "images_exists": Path(IMAGES_DIR).exists(),
            "model_exists": Path(MODEL_PATH).exists()
        }
    }

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting server at http://{HOST}:{PORT}")
    print(f"📁 COLMAP: {COLMAP_DIR}")
    print(f"🖼️  Images: {IMAGES_DIR}")
    print(f"🎲 Model: {MODEL_PATH}")
    uvicorn.run(app, host=HOST, port=PORT)
