import React, { useEffect, useState } from 'react';
import styles from './homepageRain.module.css';
const Rain = () => {
  const [drips, setDrips] = useState([]);

  useEffect(() => {
    const createDrip = () => {
      const id = Math.random().toString(36).substring(2, 15);
      const left = Math.random() * window.innerWidth;
      const delay = Math.random() * 3;

      setDrips((drips) => [...drips, { id, left, delay }]);

      setTimeout(() => {
        setDrips((drips) => drips.filter((drip) => drip.id !== id));
      }, 4000);
    };

    const interval = setInterval(createDrip, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.rainContainer}>
      {drips.map((drip) => (
        <div
          key={drip.id}
          className={styles.drip}
          style={{ left: drip.left, animationDelay: `${drip.delay}s` }}
        />
      ))}
    </div>
  );
};

export default Rain;
