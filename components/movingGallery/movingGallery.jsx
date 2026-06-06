import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './movingGallery.module.css';

gsap.registerPlugin(ScrollTrigger);

const MovingGallery = ({ direction = 'forwards', data = [] }) => {
  const galleryRef = useRef(null);
  const isForward = direction === 'forwards'; // Define isForward here

  useEffect(() => {
    if (!galleryRef.current) return;

    const wrapper = galleryRef.current.querySelector(`.${styles.wrapperGallery}`);
    const [xStart, xEnd] = isForward
      ? [0, -wrapper.scrollWidth + galleryRef.current.offsetWidth]
      : [-wrapper.scrollWidth + galleryRef.current.offsetWidth, 0];

    gsap.fromTo(
      wrapper,
      { x: xStart },
      {
        x: xEnd,
        scrollTrigger: {
          trigger: galleryRef.current,
          scrub: 0.5,
        },
      }
    );
  }, [isForward]);

  return (
    <div ref={galleryRef} className={`${styles.movingGallery} ${isForward ? styles.fwGallery : styles.bwGallery}`}>
      <ul className={styles.wrapperGallery}>
        {data.map((imgSrc, index) => (
          <li key={index} className={styles.galleryItem}>
            <img src={imgSrc} alt={`Gallery item ${index + 1}`} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MovingGallery;
