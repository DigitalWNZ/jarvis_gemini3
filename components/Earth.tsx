import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface EarthProps {
  rotationRef: React.MutableRefObject<{ x: number, y: number }>;
  scaleRef: React.MutableRefObject<number>;
  onRegionChange: (region: string) => void;
}

const REGIONS = [
  { name: '非洲 (AFRICA)', start: -0.5, end: 0.5 },
  { name: '亚洲 (ASIA)', start: 0.5, end: 2.5 },
  { name: '太平洋 (PACIFIC)', start: 2.5, end: 4.0 },
  { name: '美洲 (AMERICAS)', start: 4.0, end: 5.5 },
  { name: '欧洲 (EUROPE)', start: 5.5, end: 6.28 }, // Cycle back
];

const HolographicEarth: React.FC<EarthProps> = ({ rotationRef, scaleRef, onRegionChange }) => {
  const earthRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  
  // Load textures
  const [colorMap, specularMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
  ]);

  // Create holographic material
  const earthMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      map: colorMap,
      specularMap: specularMap,
      color: new THREE.Color(0x00FFFF),
      emissive: new THREE.Color(0x004444),
      emissiveIntensity: 0.8,
      shininess: 25,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      wireframe: false,
    });
  }, [colorMap, specularMap]);

  const wireframeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame((state, delta) => {
    if (earthRef.current) {
      // Smooth interpolation for rotation
      const targetX = rotationRef.current.x;
      const targetY = rotationRef.current.y;
      
      // Auto rotate slowly if no interaction
      const autoRotate = 0.05 * delta;
      
      earthRef.current.rotation.x = THREE.MathUtils.lerp(earthRef.current.rotation.x, targetX, 0.1);
      earthRef.current.rotation.y = THREE.MathUtils.lerp(earthRef.current.rotation.y, targetY + (state.clock.elapsedTime * 0.02), 0.1);
      
      // Scale
      const targetScale = scaleRef.current;
      earthRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

      // Determine Region
      const normalizedY = (earthRef.current.rotation.y % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      // Logic to determine which part of earth faces Z-axis
      // Map radians to region
      let currentRegion = '大西洋 (ATLANTIC)';
      if (normalizedY >= 0 && normalizedY < 1.2) currentRegion = '非洲/欧洲';
      else if (normalizedY >= 1.2 && normalizedY < 2.8) currentRegion = '亚洲/澳洲';
      else if (normalizedY >= 2.8 && normalizedY < 4.5) currentRegion = '太平洋';
      else if (normalizedY >= 4.5 && normalizedY < 5.8) currentRegion = '美洲';
      
      onRegionChange(currentRegion);
    }
    
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.07;
    }
  });

  return (
    <group position={[-1.2, 0, 0]}>
      <group ref={earthRef}>
        {/* Main Globe */}
        <mesh geometry={new THREE.SphereGeometry(1, 64, 64)} material={earthMaterial} />
        
        {/* Wireframe Overlay */}
        <mesh geometry={new THREE.SphereGeometry(1.02, 32, 32)} material={wireframeMaterial} />
        
        {/* Clouds / Outer Shell */}
        <mesh ref={cloudsRef} geometry={new THREE.SphereGeometry(1.05, 64, 64)}>
          <meshPhongMaterial
            map={colorMap}
            transparent={true}
            opacity={0.2}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            alphaMap={specularMap} // Using specular as alpha for clouds rough approx
          />
        </mesh>
      </group>
      
      {/* Planetary Ring Decor */}
      <mesh rotation={[Math.PI / 1.8, 0, 0]}>
        <ringGeometry args={[1.4, 1.45, 64]} />
        <meshBasicMaterial color={0x00FFFF} side={THREE.DoubleSide} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
         <ringGeometry args={[1.6, 1.62, 64]} />
         <meshBasicMaterial color={0x00FFFF} side={THREE.DoubleSide} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

export default HolographicEarth;