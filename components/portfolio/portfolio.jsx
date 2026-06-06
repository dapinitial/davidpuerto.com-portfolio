import React from 'react';
import styles from './portfolio.module.css';

const Portfolio = ({
  imageSrc,
  altText = '',
  heading,
  content,
}) => {
  return (
    <section role="region" aria-labelledby="portfolio-heading">
      <div className={styles.imageContainer}>
        <img src={imageSrc} alt={altText} className={styles.image} />
      </div>
      <div className={styles.headingContainer}>
        <h2
          id="portfolio-heading"
          className={styles.heading}
          dangerouslySetInnerHTML={{ __html: heading }}
        />
      </div>
      <div className={styles.textContent}>
        {content}
      </div>
    </section>
  );
};

export default Portfolio;
