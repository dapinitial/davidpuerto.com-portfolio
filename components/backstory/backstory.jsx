import React, { useEffect, useRef } from 'react';
import { Column, Container } from '../../components/clientLayout/tools';
import styles from './backstory.module.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Backstory = ({ data }) => {
  const backstoryRef = useRef(null);
  const splitBackstory = data.backstory.split(' ').map((word, index) => (
    <span key={index} className={styles.word}>
      {word}{' '}
    </span>
  ));

  return (
    <>
      <Column style={{ flex: '0 1 25%' }}>
        <h6>{data.date}</h6>
      </Column>
      <Column style={{ flex: '0 1 25%' }}>
        <Container>
          {/* Check if callOut is an array or a string */}
          {Array.isArray(data.callOut) ? (
            <ul className={styles.callOutList}>
              {data.callOut.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <h6>{data.callOut}</h6>
          )}
          {/* Conditionally render the image if provided */}
          {data.image && (
            <img src={data.image} alt="Supporting visual" />
          )}
        </Container>
      </Column>
      <Column>
        <Container>
          <h4>
            <span className={styles.hasIndent}>The Backstory</span>
            <span ref={backstoryRef}>{splitBackstory}</span>
          </h4>
        </Container>
      </Column>
    </>
  );
};

export default Backstory;
