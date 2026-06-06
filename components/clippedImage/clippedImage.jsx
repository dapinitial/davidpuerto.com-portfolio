import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './clippedImage.module.css';

gsap.registerPlugin(ScrollTrigger);

const ClippedImage = ({ imageSrc, videoSrc }) => {
  const wrapperRef = useRef(null);
  const pinRef = useRef(null);
  const imageRef = useRef(null);
  const gradientRef = useRef(null);
  const contentRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const clippedImageContent = contentRef.current;
    const clippedImageGradient = gradientRef.current;
    const clippedImage = imageRef.current;
    const video = videoRef.current;

    const setProperties = () => {
      const contentHeight = clippedImageContent ? clippedImageContent.offsetHeight : 0;
      const videoHeight = video ? video.clientHeight : window.innerHeight; // default to window height if video not loaded

      // Calculate paddingTop for the content, without setting wrapper height
      const paddingTop = Math.min(window.innerHeight / 2, 300); // limit paddingTop to a max of 300px for stability

      // Apply calculated styles
      gsap.set(clippedImageContent, { paddingTop });
      gsap.set(clippedImageGradient, { height: Math.min(window.innerHeight * 0.3, 200) }); // limit height to 200px
      gsap.set(clippedImage, { height: videoHeight });

      ScrollTrigger.refresh();
    };

    // Set properties on initial load and on video metadata load
    setProperties();
    window.addEventListener('resize', setProperties);

    if (video) {
      video.addEventListener('loadedmetadata', setProperties);
    }

    gsap.to(clippedImageGradient, {
      scrollTrigger: {
        trigger: pinRef.current,
        start: "top top",
        end: "+=" + clippedImageContent.offsetHeight,
        scrub: true,
      },
      opacity: 1,
      y: 1,
    });

    gsap.to(clippedImage, {
      scrollTrigger: {
        trigger: pinRef.current,
        start: "top top",
        end: "+=" + clippedImageContent.offsetHeight,
        scrub: 1,
        pin: true,
        pinSpacing: false,
      },
      clipPath: 'circle(75%)',
      scale: 1,
      duration: 1,
      ease: 'Linear.easeNone',
    });

    return () => {
      window.removeEventListener('resize', setProperties);
      if (video) {
        video.removeEventListener('loadedmetadata', setProperties);
      }
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className={`${styles.contentRow} ${styles.darkSection}`} ref={wrapperRef} data-bgcolor="#0c0c0c">
      <div className={styles.clippedImageWrapper}>
        <div className={styles.clippedImagePin} ref={pinRef}>
          <div className={styles.clippedImage} ref={imageRef}>
            {imageSrc && <img src={imageSrc} alt="Image Title" />}
            {videoSrc && (
              <div className={styles.contentVideoWrapper}>
                <video
                  ref={videoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={styles.bgvid}
                >
                  <source src={videoSrc} type="video/mp4" />
                </video>
              </div>
            )}
            <div className={styles.clippedImageGradient} ref={gradientRef}></div>
          </div>
        </div>
        <div className={`${styles.clippedImageContent} ${styles.textAlignCenter}`} ref={contentRef}>
          {/* Additional content can go here */}
        </div>
      </div>
    </div>
  );
};

export default ClippedImage;
