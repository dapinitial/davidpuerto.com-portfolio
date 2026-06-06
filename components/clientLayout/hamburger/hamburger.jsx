import React from 'react';
import styles from './hamburger.module.css';

export default function Hamburger({ isOpen, toggleMenu }) {
  return (
    <div
      className={`${styles.hamburger} ${isOpen ? styles.open : ''}`}
      onClick={toggleMenu}
      data-hover={isOpen ? 'Close' : 'Menu'}
      aria-label={isOpen ? 'Close Menu' : 'Open Menu'}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && toggleMenu()}
    >
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}
