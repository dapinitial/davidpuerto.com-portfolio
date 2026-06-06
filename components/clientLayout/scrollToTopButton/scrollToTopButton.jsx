import React, { useEffect, useState } from 'react';
import styles from './scrollToTopButton.module.css';

const ScrollToTopButton = () => {
  const [progressWrapStyle, setProgressWrapStyle] = useState({
    opacity: 0,
    transform: 'translateY(100px)',
  });

  const updateProgress = (progressPath, pathLength) => {
    const scrollY =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop;
    const height = document.documentElement.scrollHeight - window.innerHeight;

    if (height <= 0) {
      return;
    }

    const progress = pathLength - (scrollY * pathLength) / height;
    progressPath.style.strokeDashoffset = progress;
  };

  useEffect(() => {
    const progressWrap = document.querySelector(`.${styles.progressWrap}`);
    const progressPath = document.querySelector(
      `.${styles.progressCircle} path`
    );
    const pathLength = progressPath?.getTotalLength();

    if (progressPath) {
      progressPath.style.strokeDasharray = `${pathLength} ${pathLength}`;
      progressPath.style.strokeDashoffset = pathLength;
      progressPath.style.transition = 'stroke-dashoffset 10ms linear';
    }

    const handleScroll = () => {
      const scrollY =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop;

      if (scrollY > 50) {
        setProgressWrapStyle({
          opacity: 1,
          transform: 'translateY(0)',
        });
      } else {
        setProgressWrapStyle({
          opacity: 0,
          transform: 'translateY(100px)',
        });
      }

      if (progressPath) {
        updateProgress(progressPath, pathLength);
      }
    };

    const handleClick = (event) => {
      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

    if (progressWrap) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      progressWrap.addEventListener('click', handleClick);
    }

    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (progressWrap) {
        progressWrap.removeEventListener('click', handleClick);
      }
    };
  }, []);

  return (
    <div className={styles.progressWrap} style={progressWrapStyle}>
      <div className={styles.progressWrapBackground}></div>
      <svg
        className={styles.progressCircle}
        width="100%"
        height="100%"
        viewBox="-1 -1 102 102"
      >
        <path
          d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98"
          stroke="url(#progressCircleGradient)"
          strokeWidth="4"
          fill="none"
        />
        <linearGradient id="progressCircleGradient" x1="0%" y1="0%" x2="100%">
          <stop offset="0%" stopColor="#dadada" />
          <stop offset="100%" stopColor="#fff" />
        </linearGradient>
      </svg>
    </div>
  );
};

export default ScrollToTopButton;
