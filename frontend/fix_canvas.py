import re

with open('src/components/PolarGlobeHero.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Cap DPR
code = code.replace(
    'let dpr = window.devicePixelRatio || 1;',
    'let dpr = Math.min(window.devicePixelRatio || 1, 2);'
)

# 2. Extract gradients out of the render loop and create marker sprite
setup_code = """
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
"""
code = code.replace('let dpr = Math.min(window.devicePixelRatio || 1, 2);', setup_code, 1)

# Remove old gradients from inside render()
old_glow = """        /* ── 1. Atmospheric Outer Glow ── */
        const atmGlow = ctx.createRadialGradient(
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
        }"""
new_glow = """        /* ── 1. Atmospheric Outer Glow ── */
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
        }"""
code = code.replace(old_glow, new_glow)

old_sphere = """        const sphereGrad = ctx.createRadialGradient(
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
        }"""
code = code.replace(old_sphere, "")

old_rim = """        const rimGrad = ctx.createLinearGradient(
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
        }"""
code = code.replace(old_rim, "")

# 3. Replace marker rendering
old_marker = """            // Station Halo (Amber ONLY)
            const markerGlow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 18);
            markerGlow.addColorStop(0, 'rgba(242, 180, 65, 0.8)');
            markerGlow.addColorStop(0.5, 'rgba(242, 180, 65, 0.2)');
            markerGlow.addColorStop(1, 'rgba(242, 180, 65, 0)');
            ctx.fillStyle = markerGlow;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 18, 0, Math.PI * 2);
            ctx.fill();

            // Solid Amber Core
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isHovered ? 5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = '#F2B441';
            ctx.globalAlpha = isDimmed ? 0.4 : 1;
            ctx.shadowColor = '#F2B441';
            ctx.shadowBlur = isHovered ? 16 : 8;
            ctx.fill();"""
new_marker = """            // Station Halo using pre-rendered sprite
            ctx.drawImage(markerSprite, pt.x - 20, pt.y - 20);

            // Solid Amber Core
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isHovered ? 5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = '#F2B441';
            ctx.globalAlpha = isDimmed ? 0.4 : 1;
            ctx.fill();"""
code = code.replace(old_marker, new_marker)

# 4. Throttle loop
old_render_start = """    const render = (time) => {
      const state = motionState.current;

      if (state.inView && canvas.parentElement) {"""
new_render_start = """    const render = (time) => {
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

      if (canvas.parentElement) {"""
code = code.replace(old_render_start, new_render_start)

with open('src/components/PolarGlobeHero.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
