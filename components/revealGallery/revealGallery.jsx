import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './revealGallery.module.css';

gsap.registerPlugin(ScrollTrigger);

const RevealGallery = ({ data }) => {
  const revealGalleryRef = useRef(null);

  useEffect(() => {
    const revealGallery = revealGalleryRef.current;
    const imgFixed = revealGallery.querySelector(`.${styles.revealImgFixed}`);
    const imgRotateLeft = revealGallery.querySelector(`.${styles.revealImg}:first-child`);
    const imgRotateRight = revealGallery.querySelector(`.${styles.revealImg}:last-child`);

    gsap.set(imgRotateLeft, { left: "50%", transform: "translateX(-50%)" });
    gsap.set(imgRotateRight, { left: "50%", transform: "translateX(-50%)" });

    const setImgProperties = () => {
      gsap.set(imgRotateLeft, { x: -imgFixed.offsetWidth * 0.35, height: revealGallery.offsetHeight, scale: 0.9 });
      gsap.set(imgRotateRight, { x: imgFixed.offsetWidth * 0.35, height: revealGallery.offsetHeight, scale: 0.9 });
    };
    setImgProperties();

    window.addEventListener('resize', setImgProperties);

    gsap.to(imgRotateLeft, {
      scrollTrigger: {
        trigger: revealGallery,
        scrub: true,
        start: 'top 100%',
        end: () => `+=${revealGallery.offsetHeight + window.innerHeight}`,
        invalidateOnRefresh: true,
      },
      x: () => -imgFixed.offsetWidth * 0.65,
      rotation: -12,
    });

    gsap.to(imgRotateRight, {
      scrollTrigger: {
        trigger: revealGallery,
        scrub: true,
        start: 'top 100%',
        end: () => `+=${revealGallery.offsetHeight + window.innerHeight}`,
        invalidateOnRefresh: true,
      },
      x: () => imgFixed.offsetWidth * 0.65,
      rotation: 12,
    });

    return () => {
      window.removeEventListener('resize', setImgProperties);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div ref={revealGalleryRef} className={styles.revealGallery}>
      <div className={styles.revealImg}>
        <img src={data.leftImage} alt="Left Reveal" />
      </div>
      <div className={styles.revealImgFixed}>
        <img src={data.fixedImage} alt="Fixed Reveal" />
      </div>
      <div className={styles.revealImg}>
        <img src={data.rightImage} alt="Right Reveal" />
      </div>
    </div>
  );
};

export default RevealGallery;
