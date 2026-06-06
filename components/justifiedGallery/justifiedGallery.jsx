import React from 'react';
import styles from './justifiedGallery.module.css';

const JustifiedGallery = ({ images }) => {
  return (
    <div className={styles.justifiedGallery}>
      {images.map((image, index) => (
        <div key={index} className={styles.collageThumb}>
          <a href={image.url} className="image-link" target="_blank" rel="noopener noreferrer">
            <img src={image.src} alt={image.alt || `Image ${index + 1}`} />
            <div className={styles.thumbInfo}>{image.caption}</div>
          </a>
        </div>
      ))}
    </div>
  );
};

export default JustifiedGallery;
