/**
 * LiveIndicator
 *
 * A small pulsing emerald dot with a "Live · Updated Xs ago" tooltip that ticks.
 * Switches to amber + "Offline: showing last data" when isError is true or tab is offline.
 * Requires no extra libraries.
 */

import { useState, useEffect, memo } from 'react';

const LiveIndicator = memo(({ dataUpdatedAt, isError = false, className = '' }) => {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isOffline,  setIsOffline]  = useState(!navigator.onLine);

  // Keep secondsAgo ticking
  useEffect(() => {
    if (!dataUpdatedAt) return;
    const tick = () => {
      setSecondsAgo(Math.round((Date.now() - dataUpdatedAt) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  // Track network state
  useEffect(() => {
    const online  = () => setIsOffline(false);
    const offline = () => setIsOffline(true);
    window.addEventListener('online',  online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online',  online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const degraded = isError || isOffline;

  const dotColor = degraded
    ? 'bg-amber-400'
    : 'bg-emerald-400 animate-pulse';

  const label = degraded
    ? 'Offline: showing last data'
    : dataUpdatedAt
    ? `Live · Updated ${secondsAgo}s ago`
    : 'Live';

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={label}
      aria-label={label}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`}
        style={degraded ? undefined : { animationDuration: '2.5s' }}
      />
      <span className="text-[10px] font-mono text-ncpor-muted hidden sm:inline select-none">
        {degraded ? 'Offline' : 'Live'}
      </span>
    </div>
  );
});

LiveIndicator.displayName = 'LiveIndicator';

export default LiveIndicator;
