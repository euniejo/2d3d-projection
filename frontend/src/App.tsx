import { useState, useEffect } from 'react'
import * as THREE from 'three'
import SplitLayout from './components/SplitLayout'
import ImageViewer from './components/ImageViewer'
import ModelViewer from './components/ModelViewer'
import ImageGallery from './components/ImageGallery'
import { loadColmapData, loadImageList } from './services/colmapParser'
import { pixelToWorldRay, getCameraPosition } from './services/projection'
import type {
  ColmapCameraIntrinsics,
  ColmapImageExtrinsics,
  ProjectedPoint,
  ModelTransform
} from './types'
import './App.css'

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [projectedPoint, setProjectedPoint] = useState<ProjectedPoint | null>(null)
  const [cameras, setCameras] = useState<Map<number, ColmapCameraIntrinsics> | null>(null)
  const [images, setImages] = useState<Map<number, ColmapImageExtrinsics> | null>(null)
  const [imageList, setImageList] = useState<string[]>([])
  const [modelScene, setModelScene] = useState<THREE.Object3D | null>(null)
  const [modelTransform, setModelTransform] = useState<ModelTransform | null>(null)
  const [clickedPixel, setClickedPixel] = useState<[number, number] | null>(null)
  const [clicked3DPoint, setClicked3DPoint] = useState<[number, number, number] | null>(null)
  const [debugCamera, setDebugCamera] = useState<[number, number, number] | null>(null)
  const [debugRay, setDebugRay] = useState<{ origin: [number, number, number], direction: [number, number, number] } | null>(null)
  
  const API_BASE_URL = 'http://localhost:8000'

  // COLMAP 데이터 및 이미지 목록 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const [colmapData, imageNames] = await Promise.all([
          loadColmapData(API_BASE_URL),
          loadImageList(API_BASE_URL)
        ])
        
        setCameras(colmapData.cameras)
        setImages(colmapData.images)
        setImageList(imageNames)
        
        console.log('데이터 로드 완료:', {
          cameras: colmapData.cameras.size,
          images: colmapData.images.size,
          imageFiles: imageNames.length
        })
      } catch (error) {
        console.error('데이터 로드 실패:', error)
        alert('백엔드 서버에 연결할 수 없습니다. backend/main.py를 실행했는지 확인하세요.')
      }
    }
    loadData()
  }, [])

  const handleImageClick = (x: number, y: number) => {
    console.log('이미지 클릭:', x, y)
    
    // 2D 픽셀 좌표 저장
    setClickedPixel([x, y])
    
    if (!cameras || !images || !selectedImage) {
      console.warn('COLMAP 데이터가 로드되지 않았거나 이미지가 선택되지 않음')
      return
    }

    // 선택된 이미지의 외부 파라미터 찾기
    const imageData = Array.from(images.values()).find(
      img => img.name === selectedImage
    )
    
    if (!imageData) {
      console.warn('선택된 이미지를 찾을 수 없음:', selectedImage)
      return
    }

    // 카메라 내부 파라미터 찾기
    const camera = cameras.get(imageData.cameraId)
    if (!camera) {
      console.warn('카메라 정보를 찾을 수 없음:', imageData.cameraId)
      return
    }

    // 2D → 3D 광선 계산 (COLMAP 좌표 그대로 사용 - 좌표계 통일)
    const ray = pixelToWorldRay(x, y, camera, imageData)
    
    console.log('=== 2D 클릭 → 광선 생성 ===')
    console.log('COLMAP 카메라 위치:', ray.origin.x.toFixed(2), ray.origin.y.toFixed(2), ray.origin.z.toFixed(2))
    console.log('광선 방향:', ray.direction.x.toFixed(3), ray.direction.y.toFixed(3), ray.direction.z.toFixed(3))
    
    // Raycaster로 광선과 3D 모델의 실제 교차점 계산
    if (!modelScene) {
      console.warn('3D 모델이 아직 로드되지 않음')
      return
    }
    
    if (!modelTransform) {
      console.warn('모델 변환 정보가 아직 로드되지 않음')
      return
    }

    console.log('=== 모델 변환 정보 ===')
    console.log('Scale:', modelTransform.scale)
    console.log('Model Offset (원본 중심):', modelTransform.modelOffset?.x.toFixed(2), modelTransform.modelOffset?.y.toFixed(2), modelTransform.modelOffset?.z.toFixed(2))

    // COLMAP 좌표를 모델 좌표계로 변환
    // ray.origin은 이미 Z가 뒤집힌 상태 (projection.ts에서 flipZ 적용)
    // modelOffset도 Z를 뒤집어서 빼야 함 (GLB 원본 좌표계 → COLMAP 변환된 좌표계)
    const transformedOrigin = ray.origin.clone()
    if (modelTransform.modelOffset) {
      // modelOffset의 Z를 뒤집어서 빼기
      const flippedOffset = new THREE.Vector3(
        modelTransform.modelOffset.x,
        modelTransform.modelOffset.y,
        -modelTransform.modelOffset.z  // Z 뒤집기
      )
      transformedOrigin.sub(flippedOffset)
    }
    transformedOrigin.multiplyScalar(modelTransform.scale)
    
    // 광선 방향도 정규화 (스케일 영향 없음)
    const transformedDirection = ray.direction.clone().normalize()
    
    console.log('변환된 광선 원점:', transformedOrigin.x.toFixed(2), transformedOrigin.y.toFixed(2), transformedOrigin.z.toFixed(2))
    
    // 디버그용 저장
    setDebugCamera([transformedOrigin.x, transformedOrigin.y, transformedOrigin.z])
    setDebugRay({
      origin: [transformedOrigin.x, transformedOrigin.y, transformedOrigin.z],
      direction: [transformedDirection.x, transformedDirection.y, transformedDirection.z]
    })

    // Raycaster로 교차점 찾기
    const raycaster = new THREE.Raycaster(transformedOrigin, transformedDirection)
    raycaster.far = 1000
    
    console.log('모델 타입:', modelScene.type)
    console.log('자식 개수:', modelScene.children.length)
    
    const intersects = raycaster.intersectObject(modelScene, true)
    
    console.log('교차점 개수:', intersects.length)
    
    if (intersects.length > 0) {
      const intersection = intersects[0]
      const worldPoint = intersection.point
      const distance = transformedOrigin.distanceTo(worldPoint)

      console.log('=== 교차점 발견! ===')
      console.log('교차점:', worldPoint.toArray())
      console.log('거리:', distance.toFixed(3))

      setProjectedPoint({
        position: [worldPoint.x, worldPoint.y, worldPoint.z],
        imagePixel: [x, y],
        imageName: selectedImage,
        distance
      })
    } else {
      console.warn('❌ 광선이 모델과 교차하지 않음')
      console.warn('광선을 더 멀리까지 확장하거나 좌표계 확인 필요')
    }
  }

  const handleImageSelect = (imageName: string) => {
    setSelectedImage(imageName)
    setProjectedPoint(null)
    console.log('이미지 선택:', imageName)
  }

  return (
    <div className="app">
      <SplitLayout
        leftPanel={
          <ImageViewer
            imagePath={selectedImage ? `${API_BASE_URL}/api/images/${selectedImage}` : null}
            onImageClick={handleImageClick}
            clickedPoint={projectedPoint?.imagePixel}
          />
        }
        rightPanel={
          <ModelViewer
            modelPath={`${API_BASE_URL}/api/model`}
            projectedPoint={projectedPoint}
            onSceneReady={setModelScene}
            onTransformReady={setModelTransform}
            onModelClick={(point) => setClicked3DPoint(point.position)}
            cameraPosition={debugCamera}
            rayOrigin={debugRay?.origin}
            rayDirection={debugRay?.direction}
          />
        }
        bottomPanel={
          <ImageGallery
            images={imageList}
            onImageSelect={handleImageSelect}
            selectedImage={selectedImage}
          />
        }
      />
      
      {/* 좌표 정보 표시 패널 */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '12px',
        borderRadius: '6px',
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        zIndex: 1000,
        minWidth: '180px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
      }}>
        <div style={{ 
          marginBottom: '10px', 
          fontWeight: 'bold', 
          fontSize: '13px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: '5px'
        }}>
          [Coordinate Info]
        </div>
        
        {/* 2D 이미지에서 클릭한 픽셀 위치 */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ 
            color: '#00ff88', 
            fontWeight: 'bold',
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px'
          }}>
            🖱️ 2D Pixel
          </div>
          <div style={{ paddingLeft: '18px', color: '#ccc' }}>
            {clickedPixel ? (
              <span>{clickedPixel[0].toFixed(0)}, {clickedPixel[1].toFixed(0)}</span>
            ) : (
              <span style={{ color: '#666' }}>-</span>
            )}
          </div>
        </div>
        
        {/* 2D→3D 변환 예측 위치 */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ 
            color: '#ff4444', 
            fontWeight: 'bold',
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px'
          }}>
            2D→3D
          </div>
          <div style={{ paddingLeft: '18px', color: '#ccc' }}>
            {projectedPoint ? (
              <>
                <div>
                  {projectedPoint.position[0].toFixed(1)}, 
                  {projectedPoint.position[1].toFixed(1)}, 
                  {projectedPoint.position[2].toFixed(1)}
                </div>
                <div style={{ color: '#888', fontSize: '10px' }}>
                  Dist: {projectedPoint.distance.toFixed(1)}m
                </div>
              </>
            ) : (
              <span style={{ color: '#666' }}>-</span>
            )}
          </div>
        </div>
        
        {/* 3D 모델에서 직접 클릭한 위치 */}
        <div style={{ marginBottom: '0' }}>
          <div style={{ 
            color: '#00ddff', 
            fontWeight: 'bold',
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px'
          }}>
            3D Direct
          </div>
          <div style={{ paddingLeft: '18px', color: '#ccc' }}>
            {clicked3DPoint ? (
              <span>
                {clicked3DPoint[0].toFixed(1)}, 
                {clicked3DPoint[1].toFixed(1)}, 
                {clicked3DPoint[2].toFixed(1)}
              </span>
            ) : (
              <span style={{ color: '#666' }}>-</span>
            )}
          </div>
        </div>
        
        {/* 힌트 메시지 */}
        {!clickedPixel && !projectedPoint && !clicked3DPoint && (
          <div style={{ 
            color: '#888', 
            marginTop: '15px', 
            padding: '10px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '4px',
            fontSize: '11px',
            textAlign: 'center'
          }}>
            💡 Click on 2D image or 3D model<br/>to see coordinates <br/>
            빨간색 (Red): X축
            초록색 (Green): Y축
            파란색 (Blue): Z축
          </div>
        )}
      </div>
    </div>
  )
}

export default App
