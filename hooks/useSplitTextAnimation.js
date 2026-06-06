import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const useSplitTextAnimation = (ref, options = {}) => {
  useGSAP(() => {
    if (!ref.current) return;

    const splitText = new SplitText(ref.current, { type: 'words, chars' });

    const ctx = gsap.context(() => {
      gsap.fromTo(
        splitText.chars,
        {
          opacity: 0.2,
        },
        {
          opacity: .99,
          stagger: options.stagger || 0.05,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: ref.current,
            start: options.start || 'top 100%',
            end: options.end || 'bottom 80%',
            scrub: true,
            ...options.scrollTrigger,
          },
        }
      );
    });

    return () => {
      ctx.revert();
    };
  }, [ref, options]);
};

export default useSplitTextAnimation;
