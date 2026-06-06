'use client';
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import styles from "./shuffleText.module.css";

const ShuffleText = ({ messages }) => {
  const textContainerRef = useRef(null);
  let currentMessageIndex = 0;

  useEffect(() => {
    const translate = ["X", "Y", "Z"];

    const createMessage = (message) => {
      if (!textContainerRef.current) return;

      const FX = translate[currentMessageIndex % 3];
      let fullMess = "";

      message.split("").forEach((letter) => {
        const rdm = Math.floor(Math.random() * 200) + 100;
        const negOrPos = Math.round(Math.random()) ? 1 : -1;
        const randomTranslation = `${negOrPos * rdm}px`;

        const bold = /^[A-Z]$/.test(letter) ? styles.bold : "";

        const output =
          letter === " "
            ? `<span class="${styles.word}"> </span>`
            : `<span class="${styles.letter} ${bold}" style="transform: translate${FX}(${randomTranslation});" data-letter="${letter.toUpperCase()}">${letter.toUpperCase()}</span>`;

        fullMess += output;
      });

      textContainerRef.current.innerHTML = `<span class="${styles.word}">${fullMess}</span>`;
    };

    const replaceName = () => {
      if (!textContainerRef.current) return;

      const $who = textContainerRef.current.querySelectorAll(`.${styles.letter}`);
      if ($who.length === 0) return;

      $who.forEach((letter) => {
        const rdm = Math.random() * 0.5;
        gsap.to(letter, {
          duration: rdm,
          ease: "power3.inOut",
          y: 0,
          x: 0,
          z: 0,
          opacity: 1,
        });
      });
    };

    const scrambleName = () => {
      if (!textContainerRef.current) return;

      const $who = textContainerRef.current.querySelectorAll(`.${styles.letter}`);
      if ($who.length === 0) return;

      $who.forEach((letter) => {
        const rdmTime = Math.random() * 0.5;
        gsap.to(letter, {
          duration: rdmTime,
          ease: "power4.inOut",
          opacity: 0,
        });
      });
    };

    const messageInterval = () => {
      const arrayLength = messages.length - 1;

      setInterval(() => {
        scrambleName();
        setTimeout(() => {
          currentMessageIndex = currentMessageIndex < arrayLength ? currentMessageIndex + 1 : 0;
          createMessage(messages[currentMessageIndex]);
          replaceName();
        }, 500);
      }, 2000);
    };

    createMessage(messages[currentMessageIndex]);
    replaceName();

    const intervalId = setTimeout(() => {
      messageInterval();
    }, 2000);

    return () => {
      clearTimeout(intervalId);
    };
  }, [messages]);

  return <div ref={textContainerRef} className={styles.textContainer} />;
};

export default ShuffleText;
