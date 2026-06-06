import React, { useState, useEffect } from 'react';
import styles from './pillList.module.css';

const PillList = ({ pillArray }) => {
  const [activePillIndex, setActivePillIndex] = useState(-1);

  useEffect(() => {
    if (Array.isArray(pillArray) && pillArray.length > 0) {
      let currentIndex = -1;
      const interval = setInterval(() => {
        currentIndex += 1;
        if (currentIndex < pillArray.length) {
          setActivePillIndex(currentIndex);
        } else {
          clearInterval(interval);
        }
      }, 180);

      return () => {
        clearInterval(interval);
      };
    }
  }, []);

  return (
    <div className={styles.pillContainer}>
      {Array.isArray(pillArray) && pillArray.length > 0 ? (
        pillArray.map((pill, index) => (
          <div
            key={index}
            className={`${styles.pill} ${index <= activePillIndex ? styles.active : ''}`}
          >
            {pill}
          </div>
        ))
      ) : (
        <div className={styles.pill}>No pills to display</div>
      )}
    </div>
  );
};

export default PillList;
