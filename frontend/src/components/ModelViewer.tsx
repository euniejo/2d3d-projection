import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { ProjectedPoint, ModelTransform } from '../types';
import './ModelViewer.css';

interface ModelViewerProps {
  modelPath: string;
  projectedPoint: ProjectedPoint | null;
  onSceneReady?: (scene: THREE.Object3D) => void;
  onTransformReady?: (transform: ModelTransform) => void;
  onModelClick?: (point: ClickedPoint) => void;
  cameraPosition?: [number, number, number];
  rayOrigin?: [number, number, number];
  rayDirection?: [number, number, number];
}

interface ClickedPoint {
  position: [number, number, number];
  normal?: [number, number, number];
}

function Scene({ path, onModelClick, onSceneReady, onTransformReady }: { 
  path: string; 
  onModelClick: (point: ClickedPoint) => void; 
  onSceneReady?: (scene: THREE.Object3D) => void;
  onTransformReady?: (transform: ModelTransform) => void;
}) {
  const { scene } = useGLTF(path);
  const initializedRef = React.useRef(false);
  
  useEffect(() => {
    // 이미 초기화되었으면 건너뛰기 (React Strict Mode 때문에 두 번 실행되는 것 방지)
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    
    // === 좌표계 설계 ===
    // COLMAP: Z-forward, Three.js: Z-backward
    // 모델에도 Z축 뒤집기 적용: scale.z = -1
    
    const box1 = new THREE.Box3().setFromObject(scene);
    const size1 = box1.getSize(new THREE.Vector3());
    const center1 = box1.getCenter(new THREE.Vector3());
    
    console.log('=== 원본 모델 ===');
    console.log('크기:', size1);
    console.log('중심:', center1);
    
    // 모델 중심을 원점으로 이동 (원본 중심 저장)
    const modelOffset = center1.clone();
    // Z 뒤집기 때문에 position.z 부호 반대
    scene.position.set(-center1.x, -center1.y, center1.z);
    
    console.log('모델 오프셋 (원본 중심):', modelOffset);
    
    // 스케일: 모델 크기 조정 + Z축 뒤집기
    const maxDim = Math.max(size1.x, size1.y, size1.z);
    const targetSize = 60;
    const modelScale = targetSize / maxDim;
    
    // Z축 뒤집기: scale.z에 음수 적용
    scene.scale.set(modelScale, modelScale, -modelScale);
    console.log('모델 스케일:', modelScale, '(Z-flipped)');
    
    scene.updateMatrixWorld(true);
    
    // 최종 바운딩 박스 확인
    const box2 = new THREE.Box3().setFromObject(scene);
    const size2 = box2.getSize(new THREE.Vector3());
    const center2 = box2.getCenter(new THREE.Vector3());
    console.log('=== 최종 상태 ===');
    console.log('크기:', size2);
    console.log('중심:', center2);
    
    // App으로 scene 전달
    if (onSceneReady) {
      onSceneReady(scene);
    }
    
    // App으로 변환 정보 전달
    if (onTransformReady) {
      onTransformReady({
        scale: modelScale,
        rotation: scene.rotation.clone(),
        position: scene.position.clone(),
        modelOffset: modelOffset  // COLMAP 좌표에서 빼야 할 원본 중심
      });
    }
  }, [scene]); // onSceneReady와 onTransformReady는 의존성에서 제거 (한번만 실행되도록)
  
  const handleClick = (event: any) => {
    event.stopPropagation();
    
    if (event.intersections && event.intersections.length > 0) {
      const intersection = event.intersections[0];
      const point = intersection.point;
      const normal = intersection.face?.normal;
      
      console.log('=== 3D 클릭 ===');
      console.log('좌표:', `(${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})`);
      
      onModelClick({
        position: [point.x, point.y, point.z],
        normal: normal ? [normal.x, normal.y, normal.z] : undefined
      });
    }
  };
  
  return <primitive object={scene} onClick={handleClick} />;
}

function ProjectionMarker({ point }: { point: ProjectedPoint }) {
  return (
    <group>
      <Sphere position={point.position} args={[0.05, 16, 16]}>
        <meshBasicMaterial color="red" />
      </Sphere>
      <Sphere position={[point.position[0], point.position[1] + 0.1, point.position[2]]} args={[0.02, 8, 8]}>
        <meshBasicMaterial color="yellow" />
      </Sphere>
    </group>
  );
}

function ClickMarker({ point }: { point: ClickedPoint }) {
  return (
    <group>
      <Sphere position={point.position} args={[0.06, 16, 16]}>
        <meshBasicMaterial color="cyan" />
      </Sphere>
      <Sphere position={[point.position[0], point.position[1] + 0.12, point.position[2]]} args={[0.03, 8, 8]}>
        <meshBasicMaterial color="blue" />
      </Sphere>
    </group>
  );
}

const ModelViewer: React.FC<ModelViewerProps> = ({ 
  modelPath, 
  projectedPoint, 
  onSceneReady, 
  onTransformReady, 
  onModelClick,
  cameraPosition,
  rayOrigin,
  rayDirection
}) => {
  const [clickedPoint, setClickedPoint] = useState<ClickedPoint | null>(null);
  
  const handleModelClick = (point: ClickedPoint) => {
    setClickedPoint(point);
    if (onModelClick) {
      onModelClick(point);
    }
  };
  
  return (
    <div className="model-viewer">
      <Canvas 
        camera={{ position: [100, 50, 100], fov: 60, near: 0.1, far: 2000 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a1a1a']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />
        
        {/* COLMAP 카메라 위치 표시 */}
        {cameraPosition && (
          <Sphere position={cameraPosition} args={[10, 16, 16]}>
            <meshBasicMaterial color="yellow" />
          </Sphere>
        )}
        
        {/* 광선 시각화 - key를 사용해 좌표 변경시 재렌더링 */}
        {rayOrigin && rayDirection && (
          <>
            {/* 광선 시작점 (빨간색 구) */}
            <Sphere position={rayOrigin} args={[8, 16, 16]}>
              <meshBasicMaterial color="red" />
            </Sphere>
            {/* 광선 (빨간색 선) - Line 컴포넌트 사용 */}
            <Line
              key={`ray-${rayOrigin[0]}-${rayOrigin[1]}-${rayOrigin[2]}`}
              points={[
                rayOrigin,
                [
                  rayOrigin[0] + rayDirection[0] * 100,
                  rayOrigin[1] + rayDirection[1] * 100,
                  rayOrigin[2] + rayDirection[2] * 100
                ]
              ]}
              color="red"
              lineWidth={2}
            />
          </>
        )}
        
        <Scene path={modelPath} onModelClick={handleModelClick} onSceneReady={onSceneReady} onTransformReady={onTransformReady} />
        
        {projectedPoint && <ProjectionMarker point={projectedPoint} />}
        {clickedPoint && <ClickMarker point={clickedPoint} />}
        
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          minDistance={50}
          maxDistance={500}
          target={[0, 0, 0]}
        />
        
        <gridHelper args={[200, 50]} />
        <axesHelper args={[100]} />
      </Canvas>
      
      {/* {projectedPoint && (
        <div className="projection-info">
          <h4>2D to 3D Projection (Red)</h4>
          <p>Image: {projectedPoint.imageName}</p>
          <p>2D Pixel: ({projectedPoint.imagePixel[0].toFixed(1)}, {projectedPoint.imagePixel[1].toFixed(1)})</p>
          <p>3D Position: ({projectedPoint.position[0].toFixed(3)}, {projectedPoint.position[1].toFixed(3)}, {projectedPoint.position[2].toFixed(3)})</p>
          {projectedPoint.distance !== undefined && (
            <p>Distance: {projectedPoint.distance.toFixed(3)}m</p>
          )}
        </div>
      )} */}
    </div>
  );
};

export default ModelViewer;
