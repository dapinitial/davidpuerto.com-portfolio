import { useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const usePinnedScroll = (pinnedRef, scrollingRef, containerRef, templateOffset = 360) => {
  useEffect(() => {
    if (!pinnedRef.current || !scrollingRef.current || !containerRef.current) {
      console.error('Refs are not properly assigned.');
      return;
    }

    const pinnedElement = pinnedRef.current;
    const scrollingElement = scrollingRef.current;
    const containerElement = containerRef.current;

    const containerHeight = containerElement.offsetHeight;

    ScrollTrigger.create({
      trigger: scrollingElement,
      start: `top top+=${containerHeight}`,
      end: () => `+=${containerHeight - templateOffset}`, // Use dynamic offset here
      pin: scrollingElement,
      pinSpacing: false,
      scrub: true,
      // markers: {
      //   startColor: "cyan",
      //   endColor: "yellow",
      //   fontSize: "32px",
      //   fontWeight: "bold",
      //   indent: 20
      // },
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [pinnedRef, scrollingRef, containerRef, templateOffset]);
};
