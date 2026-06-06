import React, { useState, useEffect } from 'react';
import styles from './textToSpeechButton.module.css';

const TextToSpeechButton = ({ textToRead }) => {
  const [speaking, setSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const getVoices = async () => {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        resolve(voices);
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          resolve(voices);
        };
      }
    });
  };

  useEffect(() => {
    const loadVoices = async () => {
      const voices = await getVoices();
      const selectedVoice = voices.find(
        voice =>
          voice.name === 'Aaron'
      );

      setSelectedVoice(selectedVoice || voices[0]);
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices();
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSpeak = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
    } else {
      const utterance = new SpeechSynthesisUtterance(textToRead);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      window.speechSynthesis.speak(utterance);
    }
    setSpeaking(!speaking);
  };

  return (
    <div>
      <button
        className={speaking ? `${styles.button} ${styles.speaking}` : styles.button}
        onClick={handleSpeak}
      >
        <svg
          className={speaking ? styles.mute : undefined}
          version="1.1"
          height="34px"
          width="34px"
          viewBox="0 0 1024 768"
          enableackground="new 0 0 1024 768"
          xmlSpace="preserve"
        >
          <path
            d="M578.135,106.298c-11.136-6.299-24.275-6.076-35.245,0.494c-0.501,0.334-0.994,0.675-1.454,1.058L386.939,238.584H265.662
	c-6.299,0-11.414,5.123-11.414,11.421v216.649c0,3.063,1.225,5.957,3.334,8.087c2.186,2.103,5.018,3.327,8.08,3.327l120.99-0.056
	l154.399,141.871c0.612,0.501,1.226,0.96,1.837,1.336c5.632,3.396,11.859,5.065,18.04,5.065c5.902,0,11.805-1.503,17.205-4.564
	c11.414-6.403,18.207-18.138,18.207-31.403V137.756C596.342,124.498,589.549,112.756,578.135,106.298L578.135,106.298z
	 M573.514,590.317c0,4.914-2.449,9.243-6.569,11.582c-1.782,1.017-6.236,2.909-11.414,0.278L402.46,461.601v-51.962
	c0-6.278-5.06-11.415-11.345-11.415c-6.354,0-11.422,5.137-11.422,11.415v45.545l-102.609,0.056v-193.82h102.609v45.601
	c0,6.285,5.068,11.415,11.422,11.415c6.285,0,11.345-5.129,11.345-11.415v-51.726l152.902-129.343
	c5.233-2.735,9.8-0.787,11.582,0.216c4.12,2.338,6.569,6.681,6.569,11.588V590.317L573.514,590.317z"
          />
          <path
            className={styles.circle_sm}
            d="M744.895,358.302c0-68.104-45.714-128.849-111.191-147.78c-6.069-1.726-12.361,1.726-14.087,7.795
	c-1.782,6.014,1.726,12.361,7.795,14.101c55.734,16.133,94.654,67.916,94.654,125.884c0,58.018-38.92,109.813-94.654,125.905
	c-6.069,1.78-9.577,8.06-7.795,14.128c1.447,5.012,5.957,8.24,10.913,8.24c1.058,0,2.115-0.167,3.174-0.432
	C699.182,487.214,744.895,426.397,744.895,358.302L744.895,358.302z"
          />
          <path
            className={styles.circle_lg}
            fill="none"
            stroke="#fff"
            strokeWidth="22"
            strokeLinecap="round"
            strokeMiterlimit="10"
            d="M640.838,142.911
	c0,0,168.676,15.663,168.676,221.688c0,206.024-170.985,225.704-212.049,225.704c-41.064,0-212.451-26.556-212.451-224.926
	S559.15,139.698,596.73,139.698c37.582,0-192.841,430.925-192.841,430.925"
          />
        </svg>
      </button>
    </div>
  );
};

export default TextToSpeechButton;
