import React, { useEffect, useState } from 'react';
import styles from './timer.module.css';

const Timer = ({ lastCommitTime }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const updateElapsedTime = () => {
      const currentTime = new Date().getTime();
      const elapsed = Math.floor((currentTime - lastCommitTime) / 1000);
      setElapsedTime(elapsed);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [lastCommitTime]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let formattedTime = '';
    if (hours > 0) {
      formattedTime += `${hours} hour${hours > 1 ? 's' : ''}, `;
    }
    if (minutes > 0 || hours > 0) {
      formattedTime += `${minutes} minute${minutes > 1 ? 's' : ''}, `;
    }
    formattedTime += `${secs} second${secs > 1 ? 's' : ''}`;

    return formattedTime;
  };

  return (
    <div className={styles.timer}>
      Time since my last commit: {formatTime(elapsedTime)}
    </div>
  );
};

export default Timer;