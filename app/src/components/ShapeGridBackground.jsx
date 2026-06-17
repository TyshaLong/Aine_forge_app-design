import { useEffect, useRef } from 'react';
import { createShapeGrid } from '../lib/shapeGrid.js';

export default function ShapeGridBackground(options = {}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const destroy = createShapeGrid(canvasRef.current, options);
    return destroy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas id="shape-canvas" ref={canvasRef} aria-hidden="true" />;
}
