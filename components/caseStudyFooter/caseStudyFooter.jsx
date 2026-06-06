import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './caseStudyFooter.module.css';

gsap.registerPlugin(ScrollTrigger);

const CaseStudyFooter = () => {
  const footerRef = useRef(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const titleSpans = footer.querySelectorAll(`.${styles.nextHeroTitle} span`);
    const subtitleSpan = footer.querySelector(`.${styles.nextHeroSubtitle} span`);

    // Trigger the opacity animation sooner
    gsap.fromTo(
      footer,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.6,
        ease: 'Power2.easeInOut',
        scrollTrigger: {
          trigger: footer,
          start: 'top 90%', // Adjusted to start sooner
          toggleActions: 'play none none reverse',
        },
      }
    );

    // Trigger title span animation sooner
    gsap.fromTo(
      titleSpans,
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: 'Power2.easeInOut',
        stagger: 0.05,
        scrollTrigger: {
          trigger: footer,
          start: 'top 90%', // Adjusted to start sooner
          toggleActions: 'play none none reverse',
        },
      }
    );

    // Trigger subtitle animation sooner
    gsap.fromTo(
      subtitleSpan,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: 'Power2.easeInOut',
        delay: 0.15,
        scrollTrigger: {
          trigger: footer,
          start: 'top 90%', // Adjusted to start sooner
          toggleActions: 'play none none reverse',
        },
      }
    );
  }, []);

  return (
    <footer ref={footerRef} className={styles.caseStudyFooter}>
      <div className={styles.nextHeroTitle}>
        <span><em>The End</em></span>
        <br />
        <span>Thanks for listening</span>
      </div>
      <div className={styles.nextHeroSubtitle}>
        <span>If you have any questions, I am happy to discuss.</span>
      </div>
    </footer>
  );
};

export default CaseStudyFooter;
