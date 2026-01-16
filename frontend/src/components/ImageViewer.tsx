import React, { useRef, useState, useEffect } from 'react';
import './ImageViewer.css';

interface ImageViewerProps {
  imagePath: string | null;
  onImageClick: (x: number, y: number) => void;
  clickedPoint?: [number, number];
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  imagePath,
  onImageClick,
  clickedPoint
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!imagePath) return;

    const img = new Image();
    img.src = imagePath;
    img.onload = () => {
      setImage(img);
      // 이미지 로드 시 화면에 맞게 스케일 조정
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        const newScale = Math.min(scaleX, scaleY, 1);
        setScale(newScale);
        setOffset({
          x: (canvas.width - img.width * newScale) / 2,
          y: (canvas.height - img.height * newScale) / 2
        });
      }
    };
  }, [imagePath]);

  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기를 컨테이너에 맞춤
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 이미지 그리기
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0);
    ctx.restore();

    // 클릭 포인트 표시
    if (clickedPoint) {
      const [x, y] = clickedPoint;
      const screenX = x * scale + offset.x;
      const screenY = y * scale + offset.y;

      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [image, scale, offset, clickedPoint]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 스크린 좌표 → 이미지 좌표
    const imageX = (x - offset.x) / scale;
    const imageY = (y - offset.y) / scale;

    // 이미지 범위 내에서만 클릭 처리
    if (imageX >= 0 && imageX <= image.width && imageY >= 0 && imageY <= image.height) {
      onImageClick(imageX, imageY);
    }
  };

  return (
    <div className="image-viewer">
      {!imagePath ? (
        <div className="placeholder">
          <p>이미지를 선택하세요</p>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="image-canvas"
        />
      )}
      {imagePath && (
        <div className="controls">
          <button onClick={() => setScale(s => s * 1.2)}>🔍 확대</button>
          <button onClick={() => setScale(s => s / 1.2)}>🔍 축소</button>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>
            ↺ 리셋
          </button>
          <span className="info">
            스케일: {(scale * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
