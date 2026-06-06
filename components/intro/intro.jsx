import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import NeonText from '../neonText/neonText';
import Rain from '../rain/rain';
import Timer from '../timer/timer';
import { Container } from '../../tools';
import styles from './intro.module.css';

gsap.registerPlugin(ScrollTrigger);

export default function Intro({ lastCommitTime }) {
  
  return (
    <>
      <hr /><hr />
      <hr /><hr />
      <Rain fullpage={true} />
      <img src="/images/linkedin.jpg" alt="LinkedIn" className={styles.image} ref={imageRef} />
      <NeonText goodbye="PS: &nbsp; I'm Just Getting Started" hello="GREETINGS WORLD" />
      <hr /><hr />
      <Container ref={contentRef}>
        <p className={styles.introText} ref={paragraphRef}>
          <span style={{ fontSize: 24 }}>✌️</span>I'm a Seattle-based design practitioner and mentor with deep experience supporting cross-functional teams. Passionate about creating immersive computational experiences, I leverage UX engineering and prototyping skills honed over the last decade+ to explore ideas and visualize possibilities. My goal is to apply human-centered design principles that drive systems insights, spur collaborative conversation, and produce tools with measurable outcomes—while leaving my mark on software I want to use myself. Let's build something together... and let's make it echo!
        </p>
        <hr />
        <Timer lastCommitTime={lastCommitTime} />
        <hr />
      </Container>
      <hr />
    </>
  );
}
