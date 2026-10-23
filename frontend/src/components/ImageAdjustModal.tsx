import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  Move,
  Crop,
} from 'lucide-react';

interface ImageAdjustModalProps {
  imageUrl: string;
  partnerName?: string;
  onSave: (croppedDataUrl: string) => void;
  onClose: () => void;
}

const VIEWPORT_SIZE = 280; // 280px x 280px crop circle viewport
const OUTPUT_SIZE = 512; // 512px x 512px exported high-res avatar

export const ImageAdjustModal: React.FC<ImageAdjustModalProps> = ({
  imageUrl,
  partnerName = 'Profile',
  onSave,
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [naturalDim, setNaturalDim] = useState<{ width: number; height: number }>({
    width: 300,
    height: 300,
  });
  const [baseScale, setBaseScale] = useState<number>(1);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Calculate base scale so image fills the circular viewport
  const computeBaseScale = useCallback((width: number, height: number, rot: number) => {
    const isSideways = rot % 180 !== 0;
    const effectiveW = isSideways ? height : width;
    const effectiveH = isSideways ? width : height;
    return Math.max(VIEWPORT_SIZE / effectiveW, VIEWPORT_SIZE / effectiveH);
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth || 300;
    const h = img.naturalHeight || 300;
    setNaturalDim({ width: w, height: h });
    const scale = computeBaseScale(w, h, 0);
    setBaseScale(scale);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setImgLoaded(true);
  };

  // Recompute base scale on rotation
  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    const newBase = computeBaseScale(naturalDim.width, naturalDim.height, nextRot);
    setBaseScale(newBase);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    const newBase = computeBaseScale(naturalDim.width, naturalDim.height, 0);
    setBaseScale(newBase);
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch Drag Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((prev) => Math.min(3.5, Math.max(1, prev + delta)));
  };

  // Canvas Crop & Export
  const handleApplyCrop = () => {
    const img = imageElementRef.current;
    if (!img) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const exportScale = (baseScale * zoom * OUTPUT_SIZE) / VIEWPORT_SIZE;

      // Move origin to center of canvas
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

      // Translate pan in canvas units
      const scaleFactor = OUTPUT_SIZE / VIEWPORT_SIZE;
      ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);

      // Rotate around image center
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw centered
      const drawWidth = naturalDim.width * exportScale;
      const drawHeight = naturalDim.height * exportScale;

      ctx.drawImage(
        img,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onSave(croppedDataUrl);
      onClose();
    } catch (err) {
      console.warn('Canvas export fallback:', err);
      // If tainted canvas due to cross-origin, fallback to original URL
      onSave(imageUrl);
      onClose();
    }
  };

  const currentScale = baseScale * zoom;

  return (
    <div className="modal-backdrop adjust-modal-backdrop" onClick={onClose}>
      <div
        className="modal-card image-adjust-modal glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="adjust-modal-header">
          <div className="adjust-title-group">
            <Crop size={20} color="#FF758F" />
            <div>
              <h3 className="adjust-modal-title">Adjust & Frame Profile Picture</h3>
              <p className="adjust-modal-subtitle">
                Drag to reposition or use slider to zoom into {partnerName}'s face
              </p>
            </div>
          </div>
          <button
            type="button"
            className="close-modal-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Crop Viewport Area */}
        <div className="crop-workspace">
          <div
            className={`crop-viewport ${isDragging ? 'is-dragging' : ''}`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          >
            {/* Target Image being transformed */}
            <img
              ref={imageElementRef}
              src={imageUrl}
              alt="Crop target"
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              draggable={false}
              className="crop-image-layer"
              style={{
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rotation}deg) scale(${currentScale})`,
              }}
            />

            {/* Circular Cut-out Frame Vignette */}
            <div className="crop-circle-frame" />

            {/* Camera rule-of-thirds grid */}
            <div className={`crop-grid ${isDragging ? 'visible' : ''}`}>
              <div className="crop-grid-line horizontal h1" />
              <div className="crop-grid-line horizontal h2" />
              <div className="crop-grid-line vertical v1" />
              <div className="crop-grid-line vertical v2" />
            </div>

            {/* Drag hint overlay */}
            {!isDragging && (
              <div className="drag-hint-pill">
                <Move size={12} />
                <span>Drag to move</span>
              </div>
            )}
          </div>
        </div>

        {/* Zoom & Transform Controls */}
        <div className="adjust-controls-panel">
          {/* Zoom Slider Row */}
          <div className="zoom-slider-row">
            <button
              type="button"
              className="control-icon-btn"
              onClick={() => setZoom((prev) => Math.max(1, prev - 0.15))}
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="zoom-range-input"
              aria-label="Zoom scale"
            />

            <button
              type="button"
              className="control-icon-btn"
              onClick={() => setZoom((prev) => Math.min(3, prev + 0.15))}
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>

            <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Quick presets & Rotate buttons */}
          <div className="adjust-tools-row">
            <div className="quick-presets">
              <button
                type="button"
                className={`preset-scale-btn ${zoom === 1 ? 'active' : ''}`}
                onClick={() => setZoom(1)}
              >
                1x Full
              </button>
              <button
                type="button"
                className={`preset-scale-btn ${zoom >= 1.35 && zoom <= 1.45 ? 'active' : ''}`}
                onClick={() => setZoom(1.4)}
              >
                1.4x Face
              </button>
              <button
                type="button"
                className={`preset-scale-btn ${zoom >= 1.85 && zoom <= 1.95 ? 'active' : ''}`}
                onClick={() => setZoom(1.9)}
              >
                1.9x Close-up
              </button>
            </div>

            <div className="transform-buttons">
              <button
                type="button"
                className="tool-btn"
                onClick={handleRotate}
                title="Rotate 90 degrees"
              >
                <RotateCw size={15} />
                <span>Rotate</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                onClick={handleReset}
                title="Reset zoom & position"
              >
                <RotateCcw size={15} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-footer-actions adjust-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleApplyCrop}
            disabled={!imgLoaded}
          >
            <Check size={16} />
            <span>Apply & Frame Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
