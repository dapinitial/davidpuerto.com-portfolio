import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './slowedPin.module.css';

gsap.registerPlugin(ScrollTrigger);

const SlowedPin = ({ totalTestimonials = 45, basePath = 'images/case-studies/facebook/testimonials/', pinnedText = 'Testimonials' }) => {
  const slowedPinRef = useRef(null);

  useEffect(() => {
    const slowedPin = slowedPinRef.current;
    if (!slowedPin) return;

    const slowedText = slowedPin.querySelector(`.${styles.slowedText}`);
    const slowedTextWrapper = slowedPin.querySelector(`.${styles.slowedTextWrapper}`);
    const slowedImages = slowedPin.querySelectorAll(`.${styles.slowedImage} img`);

    // Calculate the end of the ScrollTrigger for fade-out
    const scrollTriggerEnd = document.body.scrollHeight - window.innerHeight - 2000;

    // Fade in the pinned text
    gsap.fromTo(
      slowedText,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.5,
        scrollTrigger: {
          trigger: slowedPin,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    // Pin and scroll the slowed text with fade-out at 2000px from the bottom
    gsap.to(slowedText, {
      scrollTrigger: {
        trigger: slowedText,
        scrub: true,
        pin: true,
        start: 'top top',
        end: () => `+=${document.getElementById("testimonials-container").offsetHeight}`,
      },
      y: window.innerHeight - slowedText.offsetHeight,
    });

    // Fade out slowedText 2000px from the bottom
    gsap.to(slowedText, {
      opacity: 0,
      scrollTrigger: {
        trigger: slowedPin,
        start: () => `top+=${scrollTriggerEnd}`,
        end: () => `+=200`,
        scrub: true,
      },
    });

    // Animation for slowed text wrapper
    gsap.from(slowedTextWrapper, {
      scrollTrigger: {
        trigger: slowedText,
        scrub: true,
        start: 'top top',
        end: () => `+=${window.innerHeight + document.getElementById("testimonials-container").offsetHeight}`,
      },
      y: 100,
    });

    // Scale animation for each testimonial image
    slowedImages.forEach((sImage) => {
      gsap.to(sImage, {
        scrollTrigger: {
          trigger: sImage,
          scrub: true,
          start: 'top 100%',
        },
        scale: 1,
        y: 0,
      });
    });
  }, []);

  return (
    <div className={styles.slowedPin} ref={slowedPinRef}>
      <div className={styles.slowedText}>
        <h2 className="big-title">
          {pinnedText}
        </h2>
      </div>

      <div className={styles.slowedImages} id="testimonials-container">
        {Array.from({ length: totalTestimonials }, (_, i) => (
          <div key={i} className={`${styles.slowedImage} ${i % 2 === 0 ? styles.alignLeft : styles.alignRight}`}>
            <img src={`${basePath}test${i + 1}.jpg`} alt={`Testimonial ${i + 1}`} className="link" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SlowedPin;
