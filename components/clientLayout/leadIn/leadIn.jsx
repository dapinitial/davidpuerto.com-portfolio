import React from 'react';
import styles from './leadIn.module.css';

const LeadIn = ({ title1, title2, title3, keyPoints }) => {

  return (
    <>
      <div className={styles.leadIn}>
        <h1 className={styles.heroTitle}>
          <div><span>{title1}</span></div>
          <div><span><em>{title2}</em></span></div>
          <div><span>{title3}</span></div>
        </h1>
        <ul className={styles.heroKeyPoints}>
          {keyPoints.map((point, index) => (
            <li key={index}><div>{point}</div></li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default LeadIn;
