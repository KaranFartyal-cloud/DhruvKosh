import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import PolarGlobeHero2D from './PolarGlobeHero2D';
const PolarGlobeHero3D = React.lazy(() => import('./PolarGlobeHero3D'));

export const PolarGlobeHero = (props) => {
  return (
    <ErrorBoundary 
      fallback={
        <PolarGlobeHero2D {...props} />
      }
    >
      <Suspense fallback={null}>
        <PolarGlobeHero3D {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default PolarGlobeHero;
