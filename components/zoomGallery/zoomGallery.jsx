import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Flip from 'gsap/Flip';
import ScrollTrigger from 'gsap/ScrollTrigger';
import styles from './zoomGallery.module.css';

gsap.registerPlugin(ScrollTrigger, Flip);

const ZoomGallery = ({ data = [], heightRatio = 0.6 }) => {
  const galleryRef = useRef(null);

  useEffect(() => {
    if (!galleryRef.current) return;

    const zoomGallery = galleryRef.current;
    const zoomGalleryWrapper = zoomGallery.querySelector(`.${styles.zoomWrapperGallery}`);
    const zoomWrapperThumb = zoomGallery.querySelector(`.${styles.zoomWrapperThumb}`);
    const zoomCenterItem = zoomGallery.querySelector(`.${styles.zoomCenter} .${styles.zoomImgWrapper}`);
    const zoomImgsWrapper = zoomGallery.querySelectorAll(`li:not(.${styles.zoomCenter}) .${styles.zoomImgWrapper}`);

    if (!zoomGalleryWrapper || !zoomWrapperThumb || !zoomCenterItem) {
      console.warn("One or more required elements are missing in ZoomGallery.");
      return;
    }

    // Set up basic pin and padding
    gsap.set(zoomGalleryWrapper, { height: zoomCenterItem.offsetWidth * heightRatio });
    gsap.set(zoomWrapperThumb, { top: -((window.innerHeight - zoomCenterItem.offsetWidth * heightRatio) / 2), height: window.innerHeight });

    // Animate the center image scale
    gsap.to(zoomCenterItem, {
      scale: 3.5,
      duration: 1.5,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: zoomGalleryWrapper,
        start: "top center",
        end: "bottom top",
        scrub: true,
        pin: true,
        markers: false,
      }
    });

    // Animate the side images to fade out and scale down
    gsap.to(zoomImgsWrapper, {
      scale: 0.8,
      opacity: 0,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: zoomGalleryWrapper,
        start: "top center",
        end: "bottom top",
        scrub: true,
      }
    });

    ScrollTrigger.create({
      trigger: zoomGalleryWrapper,
      start: `top +=${(window.innerHeight - zoomGalleryWrapper.offsetHeight) / 2}`,
      end: '+=200%',
      scrub: true
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };

  }, [heightRatio]);

  return (
    <div ref={galleryRef} className={styles.zoomGallery}>
      <ul className={styles.zoomWrapperGallery} data-heightratio={heightRatio}>
        {data.map((imgSrc, index) => (
          <li key={index} className={index === 1 ? `${styles.zoomCenter}` : ''}>
            <div className={styles.zoomImgWrapper}>
              <img src={imgSrc} alt={`Zoom gallery item ${index + 1}`} />
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.zoomWrapperThumb}></div>
    </div>
  );
};

export default ZoomGallery;
