import React, { useState, useEffect } from 'react';
import styles from './neonText.module.css';

const NeonText = ({ hello, goodbye }) => {
  const [opacity, setOpacity] = useState(0);
  const [shortOutLetters, setShortOutLetters] = useState(new Set());

  useEffect(() => {
    const font = new FontFace(
      'NeonTubes',
      'url(https://bitbucket.org/kennethjensen/webfonts/raw/fc13c1cb430a0e9462da56fe3f421ff7af72db71/neontubes/neontubes-webfont.woff2) format("woff2")'
    );
    font
      .load()
      .then((loadedFont) => {
        document.fonts.add(loadedFont);
        setOpacity(1);
      })
      .catch((error) => {
        console.error('Error loading the font:', error);
      });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      updateShortOutLetters(hello.length + goodbye.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [hello, goodbye]);

  const updateShortOutLetters = (totalLength) => {
    const newSet = new Set();
    while (newSet.size < 8) {
      const randomIndex = Math.floor(Math.random() * totalLength);
      newSet.add(randomIndex);
    }
    setShortOutLetters(newSet);
  };

  const createLetterElements = (text, offset) => {
    let currentIndex = offset;
    return text.split('<br />').map((segment, segmentIndex) => {
      return (
        <div key={`segment-${segmentIndex}`}>
          {segment.split('').map((letter) => {
            if (letter === ' ') {
              return (
                <span key={`space-${currentIndex}`} className={styles.space}>
                  &nbsp;
                </span>
              );
            } else {
              const isShortOut = shortOutLetters.has(currentIndex);
              const className = isShortOut
                ? `${styles.neonLetter} ${styles.shortOut}`
                : styles.neonLetter;
              currentIndex++;
              return (
                <span key={`letter-${currentIndex}`} className={className}>
                  {letter}
                </span>
              );
            }
          })}
        </div>
      );
    });
  };

  return (
    <div className={styles.neonText} style={{ opacity }}>
      <span className={styles.goodbye}>{createLetterElements(goodbye, 0)}</span>
      <span className={styles.hello}>
        {createLetterElements(hello, goodbye.length)}
      </span>
    </div>
  );
};

export default NeonText;
