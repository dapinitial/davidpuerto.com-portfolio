import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import styles from './listRotator.module.css';

gsap.registerPlugin(ScrollTrigger);

const ListRotator = ({ data }) => {
  const listRotatorWrapperRef = useRef(null);
  const listRotatorRef = useRef(null);
  const listItemsRef = useRef([]);
  const listRotatorPinRef = useRef(null);

  useEffect(() => {
    const listRotator = listRotatorRef.current;
    const listItems = listItemsRef.current;
    const totalItems = listItems.length - 1;
    const angleIncrement = 180 / totalItems;

    function setlistRotatorProperties() {
      // Adjust pin and wrapper heights to fit within the available space
      if (listRotatorWrapperRef.current && listRotatorPinRef.current) {
        const viewportHeight = window.innerHeight;

        gsap.set(listRotatorWrapperRef.current, { height: viewportHeight }); // Keep wrapper 100vh
        gsap.set(listRotatorPinRef.current, { height: viewportHeight }); // Ensure pin matches the viewport height
        gsap.set(listRotatorRef.current, { height: viewportHeight }); // Set the rotator height to fill the viewport

        ScrollTrigger.refresh();
      }
    }

    if (listRotator && listItems.length) {
      gsap.set(listRotator, { rotationX: -90 });

      setlistRotatorProperties();

      window.addEventListener('resize', setlistRotatorProperties);

      listItems.forEach((item, index) => {
        const rotationAngle = index * angleIncrement;
        const fontSize = gsap.getProperty(item, 'fontSize');
        const lineHeight = gsap.getProperty(item, 'lineHeight') * 2.2;
        const translateZ = (parseFloat(fontSize) + parseFloat(lineHeight)) * 1.8;

        gsap.set(item, {
          rotationX: -rotationAngle,
          transformOrigin: `center center 0`,
          transform: `rotateX(${-rotationAngle}deg) translateZ(${translateZ}px)`,
          zIndex: totalItems - index,
        });
      });

      gsap.to(listRotator, {
        scrollTrigger: {
          trigger: listRotatorWrapperRef.current,
          start: "top +=" + window.innerHeight * 0.8,
          end: "+=" + window.innerHeight * 3.5, // Adjusted end value
          scrub: true,
        },
        rotationX: 285
      });
    }

    return () => {
      window.removeEventListener('resize', setlistRotatorProperties);
    };
  }, []);

  return (
    <div className={styles.listRotatorWrapper} ref={listRotatorWrapperRef}>
      <div className={styles.listRotatorPin} ref={listRotatorPinRef}>
        <ul className={styles.listRotator} ref={listRotatorRef}>
          {data.map((item, index) => (
            <li
              key={index}
              dangerouslySetInnerHTML={{ __html: item }}
              ref={(el) => (listItemsRef.current[index] = el)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ListRotator;
