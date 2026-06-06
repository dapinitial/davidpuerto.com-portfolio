import { useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const useHasAnimation = () => {
  useEffect(() => {
    const elements = gsap.utils.toArray('.has-animation');

    elements.forEach((el) => {
      const delay = el.getAttribute('data-delay') || 0;

      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        delay: delay / 1000,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
          onEnter: () => el.classList.add('animated'),
        },
      });
    });
  }, []);
};

export default useHasAnimation;
