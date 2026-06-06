import React, { useEffect, useState } from 'react';
import styles from './rain.module.css';

const Rain = ({ fullpage, maxDrips = 20 }) => {
  const [drips, setDrips] = useState([]);
  const [lastDripTime, setLastDripTime] = useState(0);

  useEffect(() => {
    let animationFrameId;

    const createDrip = (timestamp) => {
      if (drips.length >= maxDrips) return;

      const timeSinceLastDrip = timestamp - lastDripTime;
      const dripInterval = 300 + Math.random() * 300;

      if (timeSinceLastDrip > dripInterval) {
        const newDrip = {
          id: Math.random().toString(36).substring(2, 15),
          left: Math.random() * window.innerWidth,
          delay: Math.random() * 3,
        };

        // Batch the state update
        setDrips((prevDrips) => {
          if (prevDrips.length >= maxDrips) return prevDrips;
          return [...prevDrips, newDrip];
        });

        setTimeout(() => {
          setDrips((prevDrips) => prevDrips.filter((drip) => drip.id !== newDrip.id));
        }, 4000);

        setLastDripTime(timestamp);
      }

      animationFrameId = requestAnimationFrame(createDrip);
    };

    animationFrameId = requestAnimationFrame(createDrip);

    return () => cancelAnimationFrame(animationFrameId);
  }, [drips.length, lastDripTime, maxDrips]);

  return (
    <div
      className={fullpage ? styles.rainContainerFullpage : styles.rainContainer}
    >
      {drips.map((drip) => (
        <div
          key={drip.id}
          className={fullpage ? styles.dripFullpage : styles.drip}
          style={{ left: drip.left, animationDelay: `${drip.delay}s` }}
        />
      ))}
    </div>
  );
};

export default Rain;
