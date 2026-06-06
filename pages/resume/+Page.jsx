import styles from './resume.module.css';

import React from 'react';

const Resume = () => {
  return (
    <section className="dark-section full-screen centered">
      <iframe
        className={styles.resume}
        src="/images/pdf/resume__davidPuerto.pdf"
        width="100%"
        height="1600"
        title="David Puerto's Resume 2024 in .PDF format"
      ></iframe>
    </section>
  );
};

export default Resume;