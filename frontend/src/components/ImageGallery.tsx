import React from 'react';
import './ImageGallery.css';

interface ImageGalleryProps {
  images: string[];
  onImageSelect: (imageName: string) => void;
  selectedImage: string | null;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImageSelect,
  selectedImage
}) => {

  return (
    <div className="image-gallery">
      <div className="gallery-title">이미지 목록</div>
      <div className="gallery-scroll">
        {images.length === 0 ? (
          <div className="no-images">이미지를 로드하는 중...</div>
        ) : (
          images.map((imageName) => (
            <div
              key={imageName}
              className={`thumbnail ${selectedImage === imageName ? 'selected' : ''}`}
              onClick={() => onImageSelect(imageName)}
            >
              <div className="thumbnail-placeholder">
                📷
              </div>
              <div className="thumbnail-name">{imageName}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ImageGallery;
