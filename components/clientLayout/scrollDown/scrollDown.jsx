import React from 'react';
import styles from './scrollDown.module.css';

const ScrollDown = () => {
  return (
    <div className={styles.scroll}>
      <p className={styles.scroll__text}>Scroll down</p>
    </div>
  );
};

export default ScrollDown;