import React, { useEffect } from 'react';
import Image from '../../components/image/image';
import ReactDOM from 'react-dom';
import caseStudiesStyles from '../../pages/case-studies/casestudies.module.css';
import styles from './modal.module.css';

const Modal = ({ isOpen, imageSrc, onClose, imageWidth, imageHeight }) => {

  useEffect(() => {
    if (isOpen) {
      document.querySelector(`.${styles.closeButton}`).focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${caseStudiesStyles.card} ${caseStudiesStyles.resultsTable}`} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✖
        </button>
        <div className={styles.imageContainer}>
          <Image
            priority
            src={imageSrc}
            width={imageWidth}
            height={imageHeight}
            alt='Full Size Testimonial'
            className={styles.fullImage}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
