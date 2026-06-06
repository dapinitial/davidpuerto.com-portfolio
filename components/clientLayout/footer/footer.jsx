import React from 'react';
import AudioPlayer from '../../audioPlayer/audioPlayer';
import styles from './footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <AudioPlayer />
    </footer>
  );
};

export default Footer;
