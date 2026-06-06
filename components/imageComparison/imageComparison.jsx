import styles from './imageComparison.module.css';

import React, { useState, useRef, useCallback } from 'react';
import { useIsomorphicLayoutEffect } from '../../renderer/useIsomorphicLayoutEffect';
import Image from '../image/image';
import { useThrottle } from '../../hooks/useThrottle';

const ImageComparison = ({ beforeImage, afterImage }) => {
  const [sliderValue, setSliderValue] = useState(50);
  const [animateClass, setAnimateClass] = useState(null);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMouseMove = useThrottle((e) => {
    if (!isDragging.current) return;

    requestAnimationFrame(() => {
      const containerBounds = containerRef.current.getBoundingClientRect();
      const newValue =
        ((e.clientX - containerBounds.left) / containerBounds.width) * 100;
      setSliderValue(Math.max(0, Math.min(100, newValue)));
    });
  }, 16);

  const handleTouchMove = useThrottle((e) => {
    if (!isDragging.current) return;

    requestAnimationFrame(() => {
      const containerBounds = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const newValue =
        ((touch.clientX - containerBounds.left) / containerBounds.width) * 100;
      setSliderValue(Math.max(0, Math.min(100, newValue)));
    });
  }, 16);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;

    if (sliderValue <= 0) {
      setAnimateClass('animateBefore');
    } else if (sliderValue >= 100) {
      setAnimateClass('animateAfter');
    } else {
      setAnimateClass(null);
    }
  }, [sliderValue]);

  useIsomorphicLayoutEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseUp]);

  return (
    <div
      className={`${styles.imageComparison} ${animateClass ? styles[animateClass] : ''}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <div className={styles.imageWrapper}>
        <Image
          priority
          src={beforeImage}
          width={1600}
          height={942}
          alt="Before"
          className={styles.image}
        />
      </div>

      <div className={styles.overlayImage} style={{ width: `${sliderValue}%` }}>
        <Image
          priority
          src={afterImage}
          width={1600}
          height={942}
          alt="After"
          className={styles.image}
        />
      </div>

      <div className={styles.sliderWrapper} style={{ left: `${sliderValue}%` }}>
        <div className={styles.verticalLine}></div>
        <div className={styles.sliderThumb}></div>
      </div>
    </div>
  );
};

export default ImageComparison;
