import { useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const useFadeInOutAnimation = (refs) => {
  useEffect(() => {
    refs.forEach((ref) => {
      if (ref.current) {
        gsap.fromTo(
          ref.current,
          { opacity: 0 },
          {
            opacity: 1,
            scrollTrigger: {
              trigger: ref.current,
              start: 'top 80%',
              end: 'bottom 20%',
              scrub: 1,
              toggleActions: 'play none none reverse', // Reverses on scroll out
            },
          }
        );
      }
    });
  }, [refs]);
};

export default useFadeInOutAnimation;
