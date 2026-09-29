import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as topojson from 'topojson-client';
import land110m from 'world-atlas/land-110m.json';
import { useTheme } from '../context/ThemeContext';
import { stations } from '../data/stations';

const R = 1.0;

function latLonToVector3(lat, lon, radius = R) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 90) * (Math.PI / 180);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function pointInPolygon(point, vs) {
  let x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0], yi = vs[i][1];
    let xj = vs[j][0], yj = vs[j][1];
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const { landPoints, icePoints, coastlineVertices, graticuleVertices } = (() => {
  const fc = topojson.feature(land110m, land110m.objects.land);
  const polygons = fc.features[0].geometry.coordinates.map(polygon => {
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    polygon[0].forEach(([lon, lat]) => {
      if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
    });
    return { polygon, minLon, maxLon, minLat, maxLat };
  });

  const isLand = (lon, lat) => {
    for (const { polygon, minLon, maxLon, minLat, maxLat } of polygons) {
      if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
      if (pointInPolygon([lon, lat], polygon[0])) {
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
          if (pointInPolygon([lon, lat], polygon[i])) { inHole = true; break; }
        }
        if (!inHole) return true;
      }
    }
    return false;
  };

  const normPoints = [];
  const iPoints = [];
  const spacing = 1.2;
  for (let lat = -90; lat <= 90; lat += spacing) {
    const r = Math.cos(lat * Math.PI / 180);
    const lonSpacing = spacing / Math.max(0.1, r);
    for (let lon = -180; lon < 180; lon += lonSpacing) {
      if (isLand(lon, lat)) {
        const v = latLonToVector3(lat, lon, R);
        if (lat < -60 || lat > 70) iPoints.push(v.x, v.y, v.z);
        else normPoints.push(v.x, v.y, v.z);
      }
    }
  }

  const mesh = topojson.mesh(land110m, land110m.objects.land);
  const coast = [];
  mesh.coordinates.forEach(line => {
    for (let i = 0; i < line.length - 1; i++) {
      const v1 = latLonToVector3(line[i][1], line[i][0], R * 1.001);
      const v2 = latLonToVector3(line[i+1][1], line[i+1][0], R * 1.001);
      coast.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }
  });

  const grats = [];
  for (let lon = -180; lon < 180; lon += 15) {
    for (let lat = -90; lat <= 90; lat += 2) {
      if (lat < 90) {
        const v1 = latLonToVector3(lat, lon, R * 1.001);
        const v2 = latLonToVector3(lat + 2, lon, R * 1.001);
        grats.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    for (let lon = -180; lon <= 180; lon += 2) {
      if (lon < 180) {
        const v1 = latLonToVector3(lat, lon, R * 1.001);
        const v2 = latLonToVector3(lat, lon + 2, R * 1.001);
        grats.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
  }
  [-80, -70, -60, -50, 80, 70, 60, 50].forEach(lat => {
    for (let lon = -180; lon <= 180; lon += 2) {
      if (lon < 180) {
        const v1 = latLonToVector3(lat, lon, R * 1.001);
        const v2 = latLonToVector3(lat, lon + 2, R * 1.001);
        grats.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
  });

  return {
    landPoints: new Float32Array(normPoints),
    icePoints: new Float32Array(iPoints),
    coastlineVertices: new Float32Array(coast),
    graticuleVertices: new Float32Array(grats)
  };
})();

const OceanSphere = ({ isLight }) => {
  const shaderArgs = useMemo(() => ({
    uniforms: {
      colorCenter: { value: new THREE.Color() },
      colorEdge: { value: new THREE.Color() },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform vec3 colorCenter;
      uniform vec3 colorEdge;
      void main() {
        float intensity = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
        intensity = pow(intensity, 0.6);
        gl_FragColor = vec4(mix(colorEdge, colorCenter, intensity), 1.0);
      }
    `
  }), []);

  const matRef = useRef();
  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.colorCenter.value.lerp(new THREE.Color(isLight ? '#EAF2F8' : '#0E2747'), 0.1);
      matRef.current.uniforms.colorEdge.value.lerp(new THREE.Color(isLight ? '#D5E5F1' : '#050D1A'), 0.1);
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[R * 0.995, 64, 64]} />
      <shaderMaterial ref={matRef} args={[shaderArgs]} />
    </mesh>
  );
};

const Atmosphere = ({ isLight }) => {
  const shaderArgs = useMemo(() => ({
    uniforms: { glowColor: { value: new THREE.Color() } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform vec3 glowColor;
      void main() {
        float intensity = 1.0 - max(0.0, dot(abs(vNormal), vec3(0.0, 0.0, 1.0)));
        intensity = pow(intensity, 3.0);
        gl_FragColor = vec4(glowColor, intensity * 0.4);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
  }), []);

  const matRef = useRef();
  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.glowColor.value.lerp(new THREE.Color(isLight ? '#000000' : '#7FE7F5'), 0.1);
    }
  });

  return (
    <mesh scale={1.15}>
      <sphereGeometry args={[R, 64, 64]} />
      <shaderMaterial ref={matRef} args={[shaderArgs]} />
    </mesh>
  );
};

const LandDots = ({ isLight, vertices, lightColor, darkColor, lightOpacity, darkOpacity }) => {
  const geomRef = useRef();
  const matRef = useRef();
  useEffect(() => {
    if (geomRef.current) {
      geomRef.current.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }
  }, [vertices]);
  
  useFrame(() => {
    if (matRef.current) {
      matRef.current.color.lerp(new THREE.Color(isLight ? lightColor : darkColor), 0.1);
      matRef.current.opacity += ((isLight ? lightOpacity : darkOpacity) - matRef.current.opacity) * 0.1;
    }
  });

  return (
    <points>
      <bufferGeometry ref={geomRef} />
      <pointsMaterial ref={matRef} size={0.015} transparent sizeAttenuation />
    </points>
  );
};

const Lines = ({ isLight, vertices, lightColor, darkColor, lightOpacity, darkOpacity }) => {
  const geomRef = useRef();
  const matRef = useRef();
  useEffect(() => {
    if (geomRef.current) {
      geomRef.current.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }
  }, [vertices]);
  
  useFrame(() => {
    if (matRef.current) {
      matRef.current.color.lerp(new THREE.Color(isLight ? lightColor : darkColor), 0.1);
      matRef.current.opacity += ((isLight ? lightOpacity : darkOpacity) - matRef.current.opacity) * 0.1;
    }
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geomRef} />
      <lineBasicMaterial ref={matRef} transparent depthWrite={false} />
    </lineSegments>
  );
};

const StationMarker = ({ pos, station, isHovered, isDimmed, onHover, onLeave, isLight }) => {
  const ref = useRef();
  const ringRef = useRef();
  
  useFrame(({ camera, clock }) => {
     const camDir = camera.position.clone().normalize();
     const dot = camDir.dot(pos.clone().normalize());
     const isVisible = dot > -0.05; 
     
     if (ref.current) ref.current.visible = isVisible;
     
     if (ringRef.current && isVisible) {
        const t = clock.elapsedTime;
        if (station.status === 'active') {
           const phase = (t * 0.3 + pos.x) % 1.0;
           const s = 1.0 + phase * 1.5;
           ringRef.current.scale.set(s, s, s);
           ringRef.current.material.opacity = (1.0 - phase) * 0.8;
        } else if (station.status === 'planned') {
           const phase = (t * 0.1 + pos.x) % 1.0;
           const s = 1.0 + phase * 0.5;
           ringRef.current.scale.set(s, s, s);
           ringRef.current.material.opacity = (1.0 - phase) * 0.5;
        } else {
           ringRef.current.scale.set(1, 1, 1);
           ringRef.current.material.opacity = 0.4;
        }
     }
  });
  
  const color = station.status === 'active' ? '#F2B441' : (station.status === 'planned' ? '#7FE7F5' : '#8592A6');
  
  return (
    <group position={pos} ref={ref} onPointerOver={(e) => { e.stopPropagation(); onHover(); }} onPointerOut={onLeave}>
       {station.status !== 'decommissioned' ? (
         <mesh>
           <sphereGeometry args={[0.015, 16, 16]} />
           <meshBasicMaterial color={color} transparent opacity={isDimmed ? 0.2 : 0.9} />
         </mesh>
       ) : (
         <mesh>
           <ringGeometry args={[0.010, 0.015, 16]} />
           <meshBasicMaterial color={color} transparent opacity={isDimmed ? 0.2 : 0.6} />
         </mesh>
       )}
       
       <mesh ref={ringRef}>
         <ringGeometry args={[0.018, 0.022, 24]} />
         <meshBasicMaterial color={color} transparent depthWrite={false} />
       </mesh>
       
       {isHovered && (
          <Html center distanceFactor={1.5} zIndexRange={[100, 0]} className="pointer-events-none">
             <div className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl min-w-[240px] transition-colors duration-300 ${
                pos.x > 0 ? 'ml-[-260px]' : 'ml-[260px]'
             } ${
                isLight ? 'bg-white/90 border-slate-200 text-[#0B1B33]' : 'bg-[#0D1422]/90 border-white/10 text-[#EAF0F8]'
             }`}>
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <h4 className="font-semibold text-sm">{station.name}</h4>
                     <p className="text-xs opacity-70">{station.place}</p>
                   </div>
                   <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                      station.status === 'active' ? 'bg-[#F2B441]/10 text-[#F2B441] border-[#F2B441]/30' :
                      station.status === 'planned' ? 'bg-[#7FE7F5]/10 text-[#7FE7F5] border-[#7FE7F5]/30' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/30'
                   }`}>{station.status.charAt(0).toUpperCase() + station.status.slice(1)}</span>
                </div>
                <div className="font-mono text-[10px] opacity-60 mb-3">
                   {Math.abs(station.lat).toFixed(4)}°{station.lat < 0 ? 'S':'N'}, {Math.abs(station.lon).toFixed(4)}°{station.lon < 0 ? 'W':'E'}
                </div>
                <div className="flex justify-between text-xs pt-3 border-t border-current border-opacity-10">
                   <div className="flex flex-col"><span className="opacity-50 text-[9px] uppercase">Established</span><span>{station.year}</span></div>
                   <div className="flex flex-col text-right"><span className="opacity-50 text-[9px] uppercase">Datasets</span><span>{station.datasetCount}</span></div>
                </div>
             </div>
          </Html>
       )}
       {!isHovered && (
         <Html center className="pointer-events-none transition-opacity duration-300" style={{ opacity: isDimmed ? 0.2 : 0.8 }}>
            <div className={`whitespace-nowrap font-mono text-[9px] mt-6 ${isLight ? 'text-[#0B1B33]' : 'text-white'}`}>
               {station.name}
            </div>
         </Html>
       )}
    </group>
  );
};

const ViewController = ({ polarView }) => {
  const { camera, controls } = useThree();
  const targetPolar = polarView === 'antarctic' ? Math.PI * 0.85 : Math.PI * 0.15;
  
  useFrame((state, delta) => {
    if (controls) {
      const sph = new THREE.Spherical().setFromVector3(camera.position);
      if (Math.abs(sph.phi - targetPolar) > 0.01) {
        sph.phi += (targetPolar - sph.phi) * Math.min(delta * 2.0, 1.0);
        sph.makeSafe();
        camera.position.setFromSpherical(sph);
        camera.lookAt(0,0,0);
      }
    }
  });
  return null;
};

const ParallaxGroup = ({ children }) => {
  const groupRef = useRef();
  useFrame(({ mouse }) => {
    if (groupRef.current) {
      const targetRotX = mouse.y * 0.05;
      const targetRotY = mouse.x * 0.05;
      groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.1;
      groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.1;
    }
  });
  return <group ref={groupRef}>{children}</group>;
};

export default function PolarGlobe3D({ polarView }) {
  const { isLight } = useTheme();
  const [activeStation, setActiveStation] = useState(null);

  useEffect(() => {
    console.log(`Land points: ${landPoints.length / 3}, Ice points: ${icePoints.length / 3}`);
  }, []);

  return (
    <Canvas 
      dpr={[1, 2]} 
      camera={{ position: [0, -3.5, 3.5], fov: 35 }}
      style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
    >
      <ambientLight intensity={1} />
      
      <ParallaxGroup>
        <OceanSphere isLight={isLight} />
        <Atmosphere isLight={isLight} />
        
        <LandDots isLight={isLight} vertices={landPoints} darkColor="#3C5F8F" lightColor="#2F5FA8" darkOpacity={0.7} lightOpacity={0.45} />
        <LandDots isLight={isLight} vertices={icePoints} darkColor="#DDF3FF" lightColor="#2F5FA8" darkOpacity={0.25} lightOpacity={0.45} />
        
        <Lines isLight={isLight} vertices={coastlineVertices} darkColor="#7FE7F5" lightColor="#0B1B33" darkOpacity={0.35} lightOpacity={0.30} />
        <Lines isLight={isLight} vertices={graticuleVertices} darkColor="#FFFFFF" lightColor="#0B1B33" darkOpacity={0.08} lightOpacity={0.08} />
        
        {stations.map(station => (
          <StationMarker 
            key={station.id} 
            pos={latLonToVector3(station.lat, station.lon, R * 1.002)} 
            station={station} 
            isLight={isLight}
            isHovered={activeStation === station.id}
            isDimmed={activeStation !== null && activeStation !== station.id}
            onHover={() => setActiveStation(station.id)}
            onLeave={() => setActiveStation(null)}
          />
        ))}
      </ParallaxGroup>

      <ViewController polarView={polarView} />
      <OrbitControls 
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
        autoRotate
        autoRotateSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
        makeDefault
      />
    </Canvas>
  );
}
