import React from 'react';
import styles from './marqueeText.module.css';

const MarqueeText = ({ artist, song }) => {
  return (
    <div className={styles.audioLabelOverflow}>
      <div className={styles.textScrollContainer}>
        Listening to: {artist} - {song} on 90.3 FM Seattle
      </div>
    </div>
  );
};

export default MarqueeText;
