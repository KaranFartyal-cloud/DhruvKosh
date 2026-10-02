import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, ArrowUpRight, Globe, Layers, Mountain } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { stations as STATIONS } from '../data/stations';
import { useLiveStats } from '../hooks/useLiveStats';
import verifiedFacts from '../data/facts';
import LiveIndicator from './LiveIndicator';

const SEARCH_PLACEHOLDERS = [
  "Search the polar archive...",
  "Ice-core records, 1998",
  "Sea-ice extent, Weddell Sea",
  "Bharati atmospheric lidar data",
  "Maitri geomagnetic surveys",
  "Himadri Arctic permafrost samples",
];

// Vector Coordinates for Antarctic Coastline
const ANTARCTIC_COASTLINE = [
  [-63.3, -57.0], [-64.2, -59.5], [-66.0, -64.5], [-68.0, -67.0], [-71.0, -68.5],
  [-73.5, -72.0], [-74.5, -78.0], [-74.8, -84.0], [-73.5, -95.0], [-73.0, -103.0],
  [-74.2, -114.0], [-75.0, -125.0], [-75.5, -136.0], [-76.2, -148.0], [-77.5, -158.0],
  [-78.0, -165.0], [-78.5, -175.0], [-78.8, 180.0], [-78.5, 172.0], [-77.5, 166.0],
  [-76.0, 163.0], [-73.5, 168.0], [-71.0, 170.5], [-69.0, 164.0], [-68.0, 155.0],
  [-67.0, 145.0], [-66.5, 138.0], [-66.0, 128.0], [-65.5, 115.0], [-66.0, 105.0],
  [-66.5, 95.0],  [-66.8, 85.0],  [-68.0, 78.0],  [-69.4, 76.2],
  [-67.5, 65.0],  [-66.0, 52.0],  [-67.5, 45.0],  [-69.0, 38.0],  [-70.0, 25.0],
  [-70.8, 11.7],  [-71.5, 2.0],   [-72.0, -10.0], [-74.0, -25.0], [-76.0, -35.0],
  [-77.8, -45.0], [-79.5, -50.0], [-78.0, -60.0], [-75.0, -62.0], [-70.0, -60.0],
  [-65.0, -58.0], [-63.3, -57.0]
];

// Vector Coordinates for Svalbard / Arctic Region
const ARCTIC_COASTLINE = [
  [76.5, 16.0], [77.2, 14.5], [78.0, 13.5], [78.9, 11.9], [79.8, 11.5],
  [80.3, 16.0], [80.0, 22.0], [79.2, 25.0], [78.4, 21.5], [77.5, 22.0],
  [76.8, 19.5], [76.5, 16.0]
];

// Vector Coordinates for Himalayas / Third Pole Cryospheric Arc
const HIMALAYAS_RIDGE = [
  [36.0, 74.0], [35.5, 75.5], [35.2, 77.0], [34.0, 77.8], [32.8, 77.3],
  [32.4, 77.6], [31.5, 78.5], [30.8, 79.2], [29.8, 80.5], [28.8, 83.5],
  [28.0, 86.5], [27.8, 88.5], [28.2, 90.5], [28.5, 92.5], [29.5, 94.5],
  [30.0, 95.5], [29.0, 95.0], [27.5, 92.0], [27.0, 88.5], [27.2, 85.0],
  [28.5, 81.0], [30.0, 78.0], [32.0, 76.5], [34.5, 74.5], [36.0, 74.0]
];

function projectOrthographic(latDeg, lonDeg, radius, center, rotationAngle = 0, tiltAngle = 1.35) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180 + rotationAngle;

  let x = Math.cos(lat) * Math.sin(lon);
  let y = -Math.sin(lat);
  let z = Math.cos(lat) * Math.cos(lon);

  const cosT = Math.cos(tiltAngle);
  const sinT = Math.sin(tiltAngle);

  const yTilted = y * cosT - z * sinT;
  const zTilted = y * sinT + z * cosT;

  const isVisible = zTilted > -0.05;

  return {
    x: center.x + x * radius,
    y: center.y - yTilted * radius,
    z: zTilted,
    isVisible,
    scale: Math.max(0.2, (zTilted + 1) / 2),
  };
}

function useMagnetic(strength = 5) {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = (e.clientX - centerX) / (rect.width / 2);
    const distanceY = (e.clientY - centerY) / (rect.height / 2);
    const moveX = Math.max(-1, Math.min(1, distanceX)) * strength;
    const moveY = Math.max(-1, Math.min(1, distanceY)) * strength;
    ref.current.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate3d(0, 0, 0)';
    ref.current.style.transition = 'transform 350ms cubic-bezier(0.2, 0.7, 0.2, 1)';
  }, []);

  const onMouseEnter = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transition = 'transform 100ms ease-out';
  }, []);

  return { ref, onMouseMove, onMouseLeave, onMouseEnter };
}

const AnimatedStat = ({ endValue, label, duration = 1400, delay = 0, isLight }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericEnd = useMemo(() => parseInt(String(endValue).replace(/,/g, ''), 10) || 0, [endValue]);
  const hasComma = String(endValue).includes(',');

  useEffect(() => {
    let startTimestamp = null;
    let frameId;

    const timeoutId = setTimeout(() => {
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(easeOut * numericEnd));

        if (progress < 1) {
          frameId = requestAnimationFrame(step);
        }
      };
      frameId = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [numericEnd, duration, delay]);

  const formatted = hasComma ? displayValue.toLocaleString() : displayValue;

  return (
    <div className="group cursor-default transition-all duration-220">
      <div
        className={`font-mono text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-220 tabular-nums ${
          isLight
            ? 'text-[#0B1B33] group-hover:text-[#0A7C8C]'
            : 'text-[#EAF0F8] group-hover:text-[#7FE7F5]'
        }`}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {formatted}
      </div>
      <div
        className={`text-[11px] sm:text-xs uppercase tracking-wider font-medium transition-opacity duration-220 ${
          isLight
            ? 'text-[#66758C] opacity-75 group-hover:opacity-100'
            : 'text-[#8592A6] opacity-70 group-hover:opacity-100'
        }`}
      >
        {label}
      </div>
    </div>
  );
};

/* ── HeroLiveStat — wraps AnimatedStat with live value and tooltip ──────── */
const HeroLiveStat = ({ value, label, sourceLabel, duration = 1400, delay = 0, isLight }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef  = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (value == null || isNaN(value)) return;
    const from = prevRef.current;
    const to   = value;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startAnim = () => {
      const start = performance.now();
      const tick = (now) => {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(from + (to - from) * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          prevRef.current = to;
          startedRef.current = true;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    if (!startedRef.current && delay > 0) {
      const t = setTimeout(startAnim, delay);
      return () => clearTimeout(t);
    } else {
      startAnim();
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration, delay]);

  const formatted = display >= 1000 ? display.toLocaleString() : display;

  return (
    <div className="group cursor-default transition-all duration-220" title={sourceLabel} aria-label={sourceLabel}>
      <div
        className={`font-mono text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-220 tabular-nums ${
          isLight
            ? 'text-[#0B1B33] group-hover:text-[#0A7C8C]'
            : 'text-[#EAF0F8] group-hover:text-[#7FE7F5]'
        }`}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {value == null
          ? <span className="inline-block w-12 h-6 rounded bg-white/10 animate-pulse align-middle" />
          : formatted
        }
      </div>
      <div
        className={`text-[11px] sm:text-xs uppercase tracking-wider font-medium transition-opacity duration-220 ${
          isLight
            ? 'text-[#66758C] opacity-75 group-hover:opacity-100'
            : 'text-[#8592A6] opacity-70 group-hover:opacity-100'
        }`}
      >
        {label}
      </div>
    </div>
  );
};

export const PolarGlobeHero = ({ onSearch, className = '' }) => {
  const { isLight } = useTheme();
  // Live stats from backend — shared with Dashboard and Repository
  const { data: liveData, isError: statsError, dataUpdatedAt } = useLiveStats();
  const liveDocuments = liveData?.documents ?? null;

  const [polarView, setPolarView] = useState('antarctic'); // 'antarctic' | 'arctic'
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [activeStationId, setActiveStationId] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);

  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const searchInputRef = useRef(null);
  const animFrameRef = useRef(null);

  const searchMag = useMagnetic(4);

  const motionState = useRef({
    rotation: 0.28,
    rotationSpeed: 0.0008, // Slow majestic rotation (>90s/turn)
    tiltX: 0,
    tiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
    isDragging: false,
    dragStartX: 0,
    velocity: 0,
    lastMouseX: 0,
    inView: true,
    reducedMotion: false,
    currentTiltBase: 1.35,
    targetTiltBase: 1.35,
  });

  useEffect(() => {
    motionState.current.targetTiltBase = polarView === 'antarctic' ? 1.35 : polarView === 'arctic' ? -1.35 : 0.45;
  }, [polarView]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionState.current.reducedMotion = mediaQuery.matches;
    const handler = (e) => { motionState.current.reducedMotion = e.matches; };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { motionState.current.inView = entry.isIntersecting; },
      { threshold: 0.05 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    const handleVisibilityChange = () => {
      motionState.current.inView = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setGlobeReady(true), 40);
    return () => clearTimeout(timer);
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (onSearch) onSearch(searchQuery.trim());
  };

  /* ========================================================================
     CANVAS POLAR RADAR / GLOBE RENDERER
     ======================================================================== */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const markerSprite = document.createElement('canvas');
    markerSprite.width = 40; markerSprite.height = 40;
    const mCtx = markerSprite.getContext('2d');
    const mg = mCtx.createRadialGradient(20, 20, 0, 20, 20, 18);
    mg.addColorStop(0, 'rgba(242, 180, 65, 0.8)');
    mg.addColorStop(0.5, 'rgba(242, 180, 65, 0.2)');
    mg.addColorStop(1, 'rgba(242, 180, 65, 0)');
    mCtx.fillStyle = mg;
    mCtx.fillRect(0, 0, 40, 40);

    let atmGlow, sphereGrad, rimGrad;
    let cachedRadius = 0;
    let lastTime = performance.now();


    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = (time) => {
      const state = motionState.current;
      
      // Throttle to 30fps if idle
      const isIdle = !state.isDragging && activeStationId === null;
      const targetFps = isIdle ? 30 : 60;
      const interval = 1000 / targetFps;
      const elapsed = time - lastTime;
      
      if (!state.inView || document.hidden) {
        // Paused
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }
      
      if (elapsed < interval) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }
      
      lastTime = time - (elapsed % interval);

      if (canvas.parentElement) {
        const width = canvas.parentElement.clientWidth;
        const height = canvas.parentElement.clientHeight;
        
        // Large circular globe, cinematic position (55% right column)
        const radius = Math.min(width, height) * 0.54;
        const center = {
          x: width > 1024 ? width * 0.68 : width * 0.52,
          y: height * 0.5,
        };

        state.currentTiltBase += (state.targetTiltBase - state.currentTiltBase) * 0.05;
        state.tiltX += (state.targetTiltX - state.tiltX) * 0.08;
        state.tiltY += (state.targetTiltY - state.tiltY) * 0.08;

        if (!state.isDragging && !state.reducedMotion) {
          state.rotation += state.rotationSpeed;
          if (Math.abs(state.velocity) > 0.0001) {
            state.rotation += state.velocity;
            state.velocity *= 0.94;
          }
        }

        ctx.clearRect(0, 0, width, height);

        const currentTilt = state.currentTiltBase + (state.tiltY * Math.PI) / 180;
        const currentRot = state.rotation + (state.tiltX * Math.PI) / 180;

        /* ── 1. Atmospheric Outer Glow ── */
        if (radius !== cachedRadius) {
          cachedRadius = radius;
          atmGlow = ctx.createRadialGradient(
            center.x, center.y, radius * 0.85,
            center.x, center.y, radius * 1.3
          );
          if (isLight) {
            atmGlow.addColorStop(0, 'rgba(10, 124, 140, 0.22)');
            atmGlow.addColorStop(0.6, 'rgba(10, 124, 140, 0.06)');
            atmGlow.addColorStop(1, 'rgba(244, 247, 251, 0)');
          } else {
            atmGlow.addColorStop(0, 'rgba(28, 76, 140, 0.45)');
            atmGlow.addColorStop(0.5, 'rgba(15, 45, 90, 0.2)');
            atmGlow.addColorStop(1, 'rgba(5, 8, 15, 0)');
          }

          sphereGrad = ctx.createRadialGradient(
            center.x - radius * 0.2, center.y - radius * 0.2, radius * 0.05,
            center.x, center.y, radius
          );
          if (isLight) {
            sphereGrad.addColorStop(0, '#EAF4FC');
            sphereGrad.addColorStop(0.5, '#D2E6F5');
            sphereGrad.addColorStop(1, '#A9C8E2');
          } else {
            sphereGrad.addColorStop(0, '#163B66');
            sphereGrad.addColorStop(0.45, '#0E2747');
            sphereGrad.addColorStop(0.85, '#08172D');
            sphereGrad.addColorStop(1, '#050D1A');
          }

          rimGrad = ctx.createLinearGradient(
            center.x - radius, center.y - radius,
            center.x + radius, center.y + radius
          );
          if (isLight) {
            rimGrad.addColorStop(0, 'rgba(10, 124, 140, 0.8)');
            rimGrad.addColorStop(0.5, 'rgba(10, 124, 140, 0.3)');
            rimGrad.addColorStop(1, 'rgba(10, 124, 140, 0.6)');
          } else {
            rimGrad.addColorStop(0, 'rgba(127, 231, 245, 0.75)');
            rimGrad.addColorStop(0.5, 'rgba(47, 95, 168, 0.4)');
            rimGrad.addColorStop(1, 'rgba(127, 231, 245, 0.5)');
          }
        }

        ctx.fillStyle = atmGlow;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        /* ── 2. Globe Disk Body ── */
        ctx.save();
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.clip();


        ctx.fillStyle = sphereGrad;
        ctx.fill();

        /* ── 3. Radar & Polar Concentric Latitude Rings ── */
        const ringFractions = [0.18, 0.36, 0.54, 0.72, 0.90];
        ringFractions.forEach((frac) => {
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius * frac, 0, Math.PI * 2);
          ctx.lineWidth = 1.1;
          ctx.strokeStyle = isLight
            ? 'rgba(10, 124, 140, 0.20)'
            : 'rgba(64, 130, 200, 0.24)';
          ctx.stroke();
        });

        // Orthogonal / Longitude Meridian Grid Lines
        const gridSpans = 12;
        for (let i = 0; i < gridSpans; i++) {
          const angle = (i * Math.PI * 2) / gridSpans;
          ctx.beginPath();
          ctx.moveTo(center.x, center.y);
          ctx.lineTo(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius);
          ctx.lineWidth = 0.9;
          ctx.strokeStyle = isLight
            ? 'rgba(10, 124, 140, 0.14)'
            : 'rgba(64, 130, 200, 0.16)';
          ctx.stroke();
        }

        // Concentric Latitude Graticule Projection
        const latitudes = polarView === 'antarctic' 
          ? [-80, -70, -60, -50] 
          : polarView === 'arctic' 
            ? [80, 70, 60, 50] 
            : [40, 35, 30, 25];
        latitudes.forEach((latDeg) => {
          ctx.beginPath();
          let firstPoint = true;
          for (let lonDeg = 0; lonDeg <= 360; lonDeg += 6) {
            const pt = projectOrthographic(latDeg, lonDeg, radius, center, currentRot, currentTilt);
            if (pt.isVisible) {
              if (firstPoint) {
                ctx.moveTo(pt.x, pt.y);
                firstPoint = false;
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
            } else {
              firstPoint = true;
            }
          }
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = isLight ? 'rgba(11, 27, 51, 0.12)' : 'rgba(127, 231, 245, 0.15)';
          ctx.stroke();
        });

        /* ── 4. Polar Landmass Contours ── */
        const activeCoastline = polarView === 'antarctic' 
          ? ANTARCTIC_COASTLINE 
          : polarView === 'arctic' 
            ? ARCTIC_COASTLINE 
            : HIMALAYAS_RIDGE;
        ctx.beginPath();
        let coastStarted = false;
        activeCoastline.forEach(([lat, lon]) => {
          const pt = projectOrthographic(lat, lon, radius, center, currentRot, currentTilt);
          if (pt.isVisible) {
            if (!coastStarted) {
              ctx.moveTo(pt.x, pt.y);
              coastStarted = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        });

        if (coastStarted) {
          ctx.closePath();
          ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(20, 50, 90, 0.4)';
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = isLight ? 'rgba(10, 124, 140, 0.35)' : 'rgba(127, 231, 245, 0.35)';
          ctx.stroke();
        }

        // Center Pole Dot
        ctx.fillStyle = isLight ? 'rgba(10, 124, 140, 0.7)' : 'rgba(127, 231, 245, 0.8)';
        ctx.beginPath();
        ctx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        /* ── 5. Atmospheric Outer Rim Border ── */
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.lineWidth = 1.8;

        ctx.strokeStyle = rimGrad;
        ctx.stroke();

        /* ── 6. Glowing Amber Station Markers (Filtered by active polar realm) ── */
        const visibleStations = STATIONS.filter((s) =>
          polarView === 'antarctic' 
            ? s.region === 'Antarctica' || s.region === 'Southern Ocean'
            : polarView === 'arctic'
              ? s.region === 'Arctic'
              : s.region === 'Himalayas'
        );

        visibleStations.forEach((station) => {
          let pt = projectOrthographic(station.lat, station.lon, radius, center, currentRot, currentTilt);
          
          if (pt.isVisible) {
            const isHovered = activeStationId === station.id;
            const isDimmed = activeStationId !== null && !isHovered;

            ctx.save();
            ctx.globalAlpha = isDimmed ? 0.3 : 1;

            // Slow breath pulse ring (Amber ONLY)
            const pulsePhase = (time % 6000) / 6000;
            const ringRadius = 6 + (isHovered ? 12 : pulsePhase * 14);
            const ringAlpha = isHovered ? 0.85 : (1 - pulsePhase) * 0.45;

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = station.status === 'planned' ? '#7FE7F5' : '#F2B441';
            ctx.lineWidth = 1.4;
            ctx.globalAlpha = isDimmed ? 0.2 : ringAlpha;
            ctx.stroke();

            // Solid Amber / Cyan Core
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isHovered ? 5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = station.status === 'planned' ? '#7FE7F5' : '#F2B441';
            ctx.globalAlpha = isDimmed ? 0.4 : 1;
            ctx.fill();

            // Leader Line & Anti-Clipping / Directional Offset
            const placement = station.labelPlacement || 'right';
            const flipToLeft = placement.includes('left') || pt.x > width - 180 || (pt.x > center.x + radius * 0.4);
            const lineDir = flipToLeft ? -1 : 1;
            const isTop = placement.includes('top');
            const lineEndX = pt.x + lineDir * 42;
            const lineEndY = pt.y + (isTop ? -22 : 22);

            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x + lineDir * 14, lineEndY);
            ctx.lineTo(lineEndX, lineEndY);
            ctx.strokeStyle = isLight ? 'rgba(11, 27, 51, 0.4)' : 'rgba(234, 240, 248, 0.45)';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            ctx.stroke();

            // Station Name Label
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillStyle = isLight ? '#0B1B33' : '#EAF0F8';
            ctx.textAlign = flipToLeft ? 'right' : 'left';
            ctx.fillText(station.name.toUpperCase(), lineEndX + (flipToLeft ? -5 : 5), lineEndY - 4);

            // Coordinates
            ctx.font = '400 9px monospace';
            ctx.fillStyle = isLight ? '#66758C' : '#8592A6';
            ctx.fillText(station.coordsFormatted || `${Math.abs(station.lat).toFixed(2)}°, ${Math.abs(station.lon).toFixed(2)}°`, lineEndX + (flipToLeft ? -5 : 5), lineEndY + 9);

            ctx.restore();
          }
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLight, activeStationId, polarView]);

  const handleMouseMove = (e) => {
    const state = motionState.current;
    if (state.reducedMotion) return;

    if (state.isDragging) {
      const deltaX = e.clientX - state.lastMouseX;
      state.rotation += deltaX * 0.005;
      state.velocity = deltaX * 0.002;
      state.lastMouseX = e.clientX;
      return;
    }

    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    state.targetTiltX = nx * 3.0;
    state.targetTiltY = -ny * 3.0;
  };

  const handleMouseDown = (e) => {
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'button') return;
    const state = motionState.current;
    state.isDragging = true;
    state.lastMouseX = e.clientX;
    state.velocity = 0;
  };

  const handleMouseUp = () => {
    const state = motionState.current;
    state.isDragging = false;
  };

  const handleMouseLeave = () => {
    const state = motionState.current;
    state.isDragging = false;
    state.targetTiltX = 0;
    state.targetTiltY = 0;
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`polar-hero relative w-full min-h-[calc(100vh-4rem)] flex items-center overflow-hidden select-none transition-colors duration-500 ${
        isLight ? 'bg-[#F4F7FB] text-[#0B1B33]' : 'bg-[#05080F] text-[#EAF0F8]'
      } ${className}`}
      style={{
        fontFamily: "'Inter', sans-serif",
      }}
      aria-label="DhruvKosh Polar Globe Hero"
    >
      {/* Removed expensive SVG noise grain filter */}

      {/* ── 2. Top Aurora Glow (Static to save frames) ────────── */}
      <div
        className="pointer-events-none absolute -top-[25%] left-1/2 -translate-x-1/2 w-[110vw] h-[450px] rounded-full blur-[120px] transition-opacity duration-700"
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(10, 124, 140, 0.08) 0%, rgba(47, 95, 168, 0.03) 60%, transparent 80%)'
            : 'radial-gradient(circle, rgba(127, 231, 245, 0.08) 0%, rgba(47, 95, 168, 0.05) 50%, transparent 80%)',
        }}
        aria-hidden="true"
      />

      {/* ── 3. Background 3D Polar Globe Canvas (Right Column ~55%) ─────── */}
      <div
        className={`absolute inset-0 w-full h-full pointer-events-auto transition-all duration-1000 ease-out z-10 ${
          globeReady ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-md'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          title="Drag to rotate globe. Hover station markers to inspect."
        />

        {/* Polar Realms: Antarctica, Arctic, Himalayas (Third Pole) */}
        <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-12 z-40 flex items-center gap-1.5 p-1 rounded-full border border-white/10 bg-[#0D1422]/95 backdrop-blur-md shadow-xl">
          <button
            onClick={() => setPolarView('antarctic')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              polarView === 'antarctic'
                ? isLight
                  ? 'bg-white text-[#0A7C8C] shadow-sm font-semibold'
                  : 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
                : 'text-[#8592A6] hover:text-[#EAF0F8]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Antarctica</span>
          </button>

          <button
            onClick={() => setPolarView('arctic')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              polarView === 'arctic'
                ? isLight
                  ? 'bg-white text-[#0A7C8C] shadow-sm font-semibold'
                  : 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
                : 'text-[#8592A6] hover:text-[#EAF0F8]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Arctic</span>
          </button>

          <button
            onClick={() => setPolarView('himalayas')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              polarView === 'himalayas'
                ? isLight
                  ? 'bg-white text-[#0A7C8C] shadow-sm font-semibold'
                  : 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
                : 'text-[#8592A6] hover:text-[#EAF0F8]'
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
            <span>Himalayas (Himansh)</span>
          </button>
        </div>
      </div>

      {/* ── 4. Left Column: Headline, Search & Stats (45% Width) ────────── */}
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-16 py-12 relative z-20 pointer-events-none">
        <div className="max-w-xl pointer-events-auto">
          
          {/* Headline: Exact typography and 2 lines with 12ch max width */}
          <div className="overflow-hidden mb-5">
            <h1
              className={`font-[300] tracking-[-0.02em] leading-[1.08] transition-all duration-900 ease-out max-w-[12ch] ${
                globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              } ${isLight ? 'text-[#0B1B33]' : 'text-[#EAF0F8]'}`}
              style={{
                fontSize: 'clamp(2.6rem, 5vw, 4.5rem)',
              }}
            >
              India's Knowledge <br />
              <span className="opacity-60 font-[300]">
                at the Edge of the World.
              </span>
            </h1>
          </div>

          {/* Support Line */}
          <p
            className={`text-base sm:text-lg mb-8 max-w-md font-normal transition-all duration-900 delay-150 ease-out ${
              globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            } ${isLight ? 'text-[#66758C]' : 'text-[#8592A6]'}`}
          >
            Every expedition. Every dataset. One fixed point.
          </p>

          {/* ── Glass Pill Search Bar ─────────────────────────────────── */}
          <div
            className={`relative w-full max-w-md mb-8 transition-all duration-900 delay-300 ease-out ${
              globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <form
              onSubmit={handleSearchSubmit}
              className={`relative flex items-center w-full rounded-full transition-all duration-300 group ${
                isLight
                  ? 'bg-white border border-slate-300 shadow-sm focus-within:border-[#0A7C8C] focus-within:ring-2 focus-within:ring-[#0A7C8C]/20'
                  : 'bg-[#0D1422]/85 backdrop-blur-md border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] focus-within:border-[#7FE7F5]/80 focus-within:shadow-[0_0_20px_rgba(127,231,245,0.2)] focus-within:scale-[1.04]'
              }`}
              style={{
                borderTop: isLight ? '1px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.22)',
              }}
            >
              <div className="pl-5 pr-2 flex items-center pointer-events-none">
                <Search
                  className={`w-4 h-4 transition-colors duration-220 ${
                    isLight ? 'text-slate-400 group-focus-within:text-[#0A7C8C]' : 'text-[#8592A6] group-focus-within:text-[#7FE7F5]'
                  }`}
                />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                className={`w-full py-3.5 pr-14 bg-transparent text-sm sm:text-base outline-none font-normal ${
                  isLight ? 'text-[#0B1B33] placeholder-slate-400' : 'text-[#EAF0F8] placeholder-[#8592A6]/70'
                }`}
                aria-label="Search the polar archive"
              />

              <div className="absolute right-2 flex items-center gap-1.5">
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded border border-white/10 text-[#8592A6]">
                  ⌘K
                </kbd>
                <button
                  type="submit"
                  ref={searchMag.ref}
                  onMouseMove={searchMag.onMouseMove}
                  onMouseEnter={searchMag.onMouseEnter}
                  onMouseLeave={searchMag.onMouseLeave}
                  className={`p-2 rounded-full transition-all active:scale-95 ${
                    isLight
                      ? 'bg-[#0A7C8C] text-white hover:bg-[#086370]'
                      : 'bg-[#7FE7F5] text-[#05080F] hover:bg-white'
                  }`}
                  aria-label="Submit search"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Stats Row (Animated Tabular Numerals) */}
          <div
            className={`pt-5 border-t grid grid-cols-3 gap-4 max-w-md transition-all duration-900 delay-500 ease-out ${
              globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            } ${isLight ? 'border-slate-200' : 'border-white/10'}`}
          >
            {/* LIVE from backend — DhruvKosh repository total */}
            <HeroLiveStat
              value={liveDocuments}
              label="Documents"
              sourceLabel="Live count from the DhruvKosh repository"
              duration={1400}
              delay={600}
              isLight={isLight}
            />
            {/* NCPOR verified public record */}
            <HeroLiveStat
              value={verifiedFacts.antarcticExpeditions.value}
              label={verifiedFacts.antarcticExpeditions.shortLabel}
              sourceLabel={`${verifiedFacts.antarcticExpeditions.note} — Source: NCPOR (ncpor.res.in/news/view/815)`}
              duration={1400}
              delay={700}
              isLight={isLight}
            />
            {/* Derived from stations.js active entries */}
            <HeroLiveStat
              value={verifiedFacts.activeStations.value}
              label={verifiedFacts.activeStations.shortLabel}
              sourceLabel={`${verifiedFacts.activeStations.note} — Source: NCPOR Operational Stations`}
              duration={1400}
              delay={800}
              isLight={isLight}
            />
          </div>

          {/* Live status indicator */}
          <div className="pt-2">
            <LiveIndicator dataUpdatedAt={dataUpdatedAt} isError={statsError} />
          </div>

        </div>
      </div>

      <style>{`
        @keyframes polarAuroraDrift {
          0% { transform: translate3d(-52%, 0, 0) scale(1); opacity: 0.06; }
          50% { transform: translate3d(-48%, 15px, 0) scale(1.08); opacity: 0.09; }
          100% { transform: translate3d(-52%, -10px, 0) scale(0.96); opacity: 0.05; }
        }
      `}</style>
    </section>
  );
};

export default PolarGlobeHero;
