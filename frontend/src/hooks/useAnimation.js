import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 → target over `duration` ms.
 * Only fires once (on mount / when `target` first becomes non-zero).
 */
export const useCountUp = (target, duration = 800) => {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0 || started.current) return;
    started.current = true;

    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-quart
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return display;
};

// Shared observer for reveal animations
let sharedObserver = null;
const observerCallbacks = new Map();

const getSharedObserver = () => {
  if (!sharedObserver && typeof window !== 'undefined') {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = observerCallbacks.get(entry.target);
            if (callback) {
              callback();
              sharedObserver.unobserve(entry.target);
              observerCallbacks.delete(entry.target);
            }
          }
        });
      },
      { threshold: 0.15 }
    );
  }
  return sharedObserver;
};

/**
 * Returns true once the attached ref element enters the viewport.
 * Uses a single shared IntersectionObserver to prevent memory leaks.
 */
export const useInView = () => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = getSharedObserver();
    observerCallbacks.set(el, () => setInView(true));
    observer.observe(el);

    return () => {
      observerCallbacks.delete(el);
      observer.unobserve(el);
    };
  }, []);

  return [ref, inView];
};
