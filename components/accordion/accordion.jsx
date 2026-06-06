import React, { useState } from 'react';
import styles from './accordion.module.css';

const Accordion = ({ data, bigger }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const handleToggle = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <dl className={`${styles.accordion} ${bigger ? styles.biggerAcc : ''}`}>
      {data.map((item, index) => (
        <React.Fragment key={index}>
          <dt
            className={`${styles.accordionTitle} ${activeIndex === index ? styles.active : ''}`}
            onClick={() => handleToggle(index)}
          >
            <span className={styles.titleText}>
              <div>
                <em>{item.title}</em> — {item.subtitle}
              </div>
            </span>
            <div className={styles.iconWrap}>
              <div className={styles.buttonIcon} />
            </div>
          </dt>
          <dd className={`${styles.accordionContent} ${activeIndex === index ? styles.show : ''}`}>
            <ul className={styles.contentList}>
              {item.content.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
};

export default Accordion;
