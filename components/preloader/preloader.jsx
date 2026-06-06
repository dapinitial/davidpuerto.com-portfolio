import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import styles from './preloader.module.css';

const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef();
  const loadbarRef = useRef();
  const percentageRef = useRef();
  const loadingTextRef = useRef();

  useEffect(() => {
    let progressInterval;

    const simulateProgress = () => {
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 42) {
            return prev + Math.random() * 2; // Crawl to 68%
          } else {
            clearInterval(progressInterval);
            return prev;
          }
        });
      }, 20); // Adjust interval for smoother progress
    };

    simulateProgress();

    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    if (progress >= 42 && !isComplete) {
      const zipToComplete = setTimeout(() => {
        setProgress(100);
        setIsComplete(true);
      }, 300); // Delay before zipping to 100%

      return () => clearTimeout(zipToComplete);
    }
  }, [progress, isComplete]);

  useEffect(() => {
    if (isComplete) {
      const timeline = gsap.timeline({
        onComplete: () => {
          setIsVisible(false);
          onComplete && onComplete();
        },
      });

      timeline
        .to(loadbarRef.current, {
          width: '100%',
          duration: 0.3,
          ease: 'power2.out',
        })
        .to(loadingTextRef.current, {
          width: 0, // Reduce LOADING width to 0%
          duration: 0.3,
          ease: 'power4.out',
        })
        .to(percentageRef.current, {
          y: -50, // Slide up the percentage
          opacity: 0,
          duration: 0.3,
          ease: 'power2.inOut',
        }, '-=0.2') // Overlap with the LOADING text animation
        .to(containerRef.current, {
          opacity: 0, // Fade out the entire preloader
          duration: 0.5,
          ease: 'power2.out',
        });
    }
  }, [isComplete, onComplete]);

  useEffect(() => {
    gsap.to(loadbarRef.current, {
      width: `${progress}%`,
      duration: 0.3,
      ease: 'linear',
    });

    gsap.to(percentageRef.current, {
      textContent: `${Math.round(progress)}%`,
      duration: 0.1,
      snap: { textContent: 1 },
      ease: 'linear',
    });

    gsap.to(loadingTextRef.current, {
      backgroundPosition: `${100 - progress}% 0`, // Simulate gradient passing through LOADING
      duration: 0.3,
      ease: 'linear',
    });
  }, [progress]);

  return (
    <div
      className={`${styles.preloaderWrap} ${isVisible ? styles.visible : styles.hidden}`}
      ref={containerRef}
      data-cursortext="Deep Breath"
    >
      <div className={styles.outer}>
        <div className={styles.percentageWrapper}>
          <div className={styles.percentage} ref={percentageRef}>
            {Math.round(progress)}%
          </div>
        </div>
        <div className={styles.preloaderIntro}>
          <div className={styles.loadbar} ref={loadbarRef}></div>
          <span ref={loadingTextRef}>LOADING</span>
        </div>
      </div>
      <div className={styles.percentageIntro}>
        <h5>deep breath</h5>
        Deepest breaths... content is loading.
      </div>
    </div>
  );
};

export default Preloader;
