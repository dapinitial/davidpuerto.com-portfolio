import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const useScrollScale = (initialScale = 0.8, finalScale = 1) => {
  const ref = useRef(null);
  const scrollTriggerRef = useRef(null);

  useEffect(() => {
    if (ref.current) {
      scrollTriggerRef.current = ScrollTrigger.create({
        trigger: ref.current,
        start: 'top 50%', // Starts earlier for smoother transition
        end: 'bottom 100%', // Ends sooner for a smoother scaling effect
        scrub: 1, // Allows for a slight delay and smooth transition
        invalidateOnRefresh: true, // Recalibrates only on refresh
        animation: gsap.fromTo(
          ref.current,
          { scale: initialScale },
          { scale: finalScale, ease: 'power2.out' } // Adjusted for a smoother effect
        ),
      });
    }

    return () => {
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
      }
    };
  }, [initialScale, finalScale]);

  return ref;
};

export default useScrollScale;
