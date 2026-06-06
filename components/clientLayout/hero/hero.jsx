import styles from './hero.module.css';
import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Hero = ({ imageSrc, subtitleComponent }) => {
  const heroRef = useRef(null);
  const imgRef = useRef(null);
  const textRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const heroImage = imgRef.current;
    const heroContent = contentRef.current;

    // Combined timeline with shorter durations and GPU-optimized properties
    const heroTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: heroRef.current,
        start: 'top top',
        end: '+=80%', // Shortened animation duration on scroll
        scrub: 0.5, // Reduced scrub for smoother scroll interaction
        pin: true,
        pinSpacing: false,
        markers: false, // Remove markers in production
      },
    });

    heroTimeline
      .fromTo(
        heroImage,
        { clipPath: 'inset(0 35vw 0 35vw)', scale: 0.7 },
        { clipPath: 'inset(0 0 0 0)', scale: 1, ease: 'power2.inOut', duration: 0.7 }
      )
      .fromTo(
        heroContent,
        { y: '80%', opacity: 0, transform: 'translate3d(0, 0, 0)' }, // Trigger GPU acceleration
        { y: '0%', opacity: 1, ease: 'power1.out', duration: 1.0 },
        '-=0.5' // Overlapping animations for quicker transitions
      );

    return () => {
      if (heroTimeline.scrollTrigger) {
        heroTimeline.scrollTrigger.kill();
      }
    };
  }, []);

  return (
    <section className={styles.hero} ref={heroRef}>
      <div className={styles.heroImageWrapper}>
        <img className={styles.heroImage} src={imageSrc} ref={imgRef} alt="Hero" />
        <div className={styles.heroContent} ref={contentRef}>
          <h2 ref={textRef} dangerouslySetInnerHTML={{ __html: subtitleComponent }} />
        </div>
      </div>
    </section>
  );
};

export default Hero;
