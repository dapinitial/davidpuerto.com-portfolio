import React, { useState, useEffect } from 'react';
import { Link } from '../../renderer/Link';
import styles from './navigateCaseStudies.module.css';

const NavigateCaseStudies = ({ prevLink, nextLink }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const position = window.pageYOffset;
      setIsVisible(position > 250);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      className={`${styles['navigateCaseStudies']} ${isVisible ? styles.visible : ''}`}
    >
      {prevLink && (
        <Link href={prevLink} className={styles['previousCaseStudy']}>
          Previous Case Study
        </Link>
      )}
      {nextLink && (
        <Link href={nextLink} className={styles['nextCaseStudy']}>
          Next Case Study
        </Link>
      )}
    </div>
  );
};

export default NavigateCaseStudies;
