import React, { useState, useEffect } from 'react';
import styles from './image.module.css';

const Shimmer = ({ width, height }) => (
  <div
    className={styles.shimmerWrapper}
    style={{ width: `${width}px`, height: `${height}px` }}
  >
    <div className={styles.shimmer} />
  </div>
);

const Image = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  priority = false,
  objectFit = 'cover',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div className={styles.imageContainer} style={{ ...style, width, height }}>
      {!isLoaded && isHydrated && <Shimmer width={width} height={height} />}
      {isHydrated && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          className={`${styles.image} ${className} ${isLoaded ? styles.loaded : ''}`}
          style={{ objectFit }}
        />
      )}
    </div>
  );
};

export default Image;
