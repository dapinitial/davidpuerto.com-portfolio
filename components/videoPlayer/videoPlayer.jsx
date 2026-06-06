import React, { useState, useRef } from 'react';
import caseStudyStyles from '../../pages/case-studies/casestudies.module.css';
import styles from './videoPlayer.module.css'; // Your styles for the component

const VideoPlayer = ({ title, poster, videoSrc, fitContent, autoPlay = false, loop = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className={`${caseStudyStyles.card} ${caseStudyStyles.resultsTable}`} style={{ maxWidth: fitContent ? null : '75vw' }}>
      <div className={styles.videoContainer}>
        {!isPlaying && (
          <button className={styles.videoPlayButton} onClick={handlePlayPause}>
            <span></span>
          </button>
        )}
        <video
          ref={videoRef}
          title={title}
          poster={poster}
          loop={loop}
          autoPlay={autoPlay}
          controls
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className={styles.videoElement}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default VideoPlayer;
