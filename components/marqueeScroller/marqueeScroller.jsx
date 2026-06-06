import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './marqueeScroller.module.css';

gsap.registerPlugin(ScrollTrigger);

const MarqueeScroller = ({ direction = 'forwards', data = [] }) => {
  const marqueeRef = useRef(null);
  const isForward = direction === 'forwards';

  useEffect(() => {
    if (!marqueeRef.current) return;

    const marqueeEl = marqueeRef.current;
    const duration = 20; // Duration for one full scroll cycle

    // Set initial position of marquee
    gsap.set(marqueeEl, { xPercent: isForward ? 0 : -100 });

    // Create a looped animation to scroll the marquee continuously
    const marqueeAnim = gsap.to(marqueeEl, {
      xPercent: isForward ? -100 : 100,
      duration,
      ease: 'none',
      repeat: -1,
    });

    // Add scroll control with ScrollTrigger to manage the timeScale (scroll speed)
    ScrollTrigger.create({
      onUpdate(self) {
        const scrollDirection = self.direction === 1 ? 1 : -1;
        gsap.to(marqueeAnim, { timeScale: scrollDirection, overwrite: true });
      },
    });

    return () => ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  }, [isForward]);

  return (
    <div className={`${styles.marqueeWrapper} ${isForward ? styles.forward : styles.backward}`}>
      <h2 ref={marqueeRef} className={styles.marqueeText}>
        {data.map((text, index) => (
          <span key={index}>
            {index % 2 === 0 ? <em>{text}</em> : text} &nbsp;
          </span>
        ))}
      </h2>
      {/* Duplicate the text within the component for a continuous loop effect */}
      <h2 className={styles.marqueeText}>
        {data.map((text, index) => (
          <span key={`dup-${index}`}>
            {index % 2 === 0 ? <em>{text}</em> : text} &nbsp;
          </span>
        ))}
      </h2>
    </div>
  );
};

export default MarqueeScroller;
