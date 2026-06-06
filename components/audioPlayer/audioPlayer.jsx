import React, { useState, useEffect, useCallback, useRef } from 'react';
import KexpLogo from './kexpLogo';
import MarqueeText from '../marqueeText/marqueeText';
import styles from './audioPlayer.module.css';

function AudioPlayer() {
  const [error, setError] = useState(null);
  const [currentPlay, setCurrentPlay] = useState(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef(null);
  const isPlayerInitialized = useRef(false);

  const fetchCurrentPlay = useCallback(async () => {
    try {
      const response = await fetch(
        `https://api.kexp.org/v2/plays?ordering=-airdate&limit=1&cachebuster=${Date.now()}`
      );
      const data = await response.json();

      if (data.results.length > 0 && data.results[0].airdate !== currentPlay?.airdate) {
        setCurrentPlay(data.results[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error);
    }
  }, [currentPlay?.airdate]);

  useEffect(() => {
    fetchCurrentPlay();
    const interval = setInterval(fetchCurrentPlay, 15000);
    return () => clearInterval(interval);
  }, [fetchCurrentPlay]);

  const initializeAudio = () => {
    const audioPlayer = audioPlayerRef.current;
    if (audioPlayer && !isPlayerInitialized.current) {
      audioPlayer.src = 'https://kexp.streamguys1.com/kexp64.aac';
      audioPlayer.volume = 0.03;
      audioPlayer.load();

      audioPlayer.addEventListener('play', () => setIsPlaying(true));
      audioPlayer.addEventListener('pause', () => setIsPlaying(false));

      isPlayerInitialized.current = true;

      return () => {
        audioPlayer.removeEventListener('play', () => setIsPlaying(true));
        audioPlayer.removeEventListener('pause', () => setIsPlaying(false));
      };
    }
  };

  useEffect(() => {
    const canStartAudio = () => {
      if (!audioStarted) {
        setAudioStarted(true);
        initializeAudio();
      }
    };

    window.addEventListener('click', canStartAudio);
    return () => window.removeEventListener('click', canStartAudio);
  }, [audioStarted]);

  const handleKexpLogoClick = () => {
    const audioPlayer = audioPlayerRef.current;
    if (audioPlayer) {
      if (isPlaying) {
        audioPlayer.pause();
      } else {
        audioPlayer.play().catch((err) => {
          console.error('Audio play failed', err);
          setError(err);
        });
      }
    }
  };

  return (
    <div>
      {!error && (
        <div>
          <audio ref={audioPlayerRef} id="audioPlayer" controls hidden>
            Your browser does not support the audio element.
          </audio>
          {currentPlay?.play_type === 'airbreak' ? (
            <div className={styles.audioPlayer}>
              90.3 KEXP Seattle is currently taking a break.
            </div>
          ) : (
            <div className={`${styles.audioPlayer} ${styles.notBreak}`}>
              {audioStarted && (
                <KexpLogo onClick={handleKexpLogoClick} isPlaying={isPlaying} />
              )}
              <div className={styles.audioLabelOverflow}>
                <MarqueeText artist={currentPlay?.artist} song={currentPlay?.song} />
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className={styles.audioPlayer}>Error: {error.message}</div>
      )}
    </div>
  );
}

export default AudioPlayer;
