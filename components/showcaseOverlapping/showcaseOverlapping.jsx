import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './showcaseOverlapping.module.css';

gsap.registerPlugin(ScrollTrigger);

const ShowcaseOverlapping = ({ children }) => {
  useEffect(() => {
    const pinnedElements = document.querySelectorAll(`.${styles.overlappingContent}`);

    // Function to set elements' height properties
    const setElementsProperties = () => {
      pinnedElements.forEach((element) => {
        gsap.set(element, { height: window.innerHeight });
      });
    };

    // Check if it's a mobile device
    const isMobile = () => window.innerWidth <= 768;

    // Initialize the elements' height
    setElementsProperties();

    // Add resize event listener to adjust heights dynamically
    window.addEventListener('resize', setElementsProperties);

    // Loop through the pinned elements to create scroll animations
    pinnedElements.forEach((pElement, i, arr) => {
      if (i < arr.length - 1) {
        const durationMultiplier = arr.length - i - 1;

        // Pin each section
        ScrollTrigger.create({
          trigger: pElement,
          start: () => {
            const centerPin = (window.innerHeight - pElement.querySelector(`.${styles.overlappingContentInner}`).offsetHeight) / 2;
            return `top +=${centerPin}`;
          },
          end: () => {
            const durationHeight = pElement.offsetHeight * durationMultiplier + (pElement.offsetHeight - pElement.querySelector(`.${styles.overlappingContentInner}`).offsetHeight) / 2;
            return `+=${durationHeight}`;
          },
          pin: true,
          pinSpacing: false,
          scrub: true,
        });

        // Animation properties for the content
        const animationProperties = {
          scale: 0.15,
          opacity: 1,
          zIndex: 0,
          duration: 1,
          ease: 'linear',
        };

        // Apply blur for non-mobile devices
        if (!isMobile()) {
          animationProperties.filter = 'blur(10px)';
        }

        // Apply animation to inner content
        ScrollTrigger.create({
          trigger: pElement,
          start: () => {
            const centerPin = (window.innerHeight - pElement.querySelector(`.${styles.overlappingContentInner}`).offsetHeight) / 2;
            return `top +=${centerPin}`;
          },
          end: () => {
            const durationHeight = pElement.offsetHeight + (pElement.offsetHeight - pElement.querySelector(`.${styles.overlappingContentInner}`).offsetHeight) / 2;
            return `+=${durationHeight}`;
          },
          scrub: true,
          animation: gsap.to(pElement.querySelector(`.${styles.overlappingContentInner}`), animationProperties),
        });
      }
    });

    // Cleanup on unmount
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      window.removeEventListener('resize', setElementsProperties);
    };
  }, []);

  return (
    <div className={styles.overlappingGallery}>
      {React.Children.map(children, (child, index) => (
        <div className={styles.overlappingContent} key={index}>
          <div className={styles.overlappingContentInner}>
            {child}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShowcaseOverlapping;
