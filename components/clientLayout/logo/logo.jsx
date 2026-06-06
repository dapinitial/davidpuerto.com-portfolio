import styles from './logo.module.css';
import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(MorphSVGPlugin);

export default function Logo({ showSubNav, isMenuOpen, onBackClick, onHomeClick, closeMenu }) {
  const logoRef = useRef(null);

  useEffect(() => {
    if (showSubNav) {
      gsap.to(logoRef.current, {
        morphSVG: '#back-arrow-path',
        duration: 0.3,
      });
    } else {
      gsap.to(logoRef.current, {
        morphSVG: '#logo-path',
        duration: 0.3,
      });
    }
  }, [showSubNav]);

  const handleLogoClick = () => {
    if (showSubNav) {
      onBackClick();
    } else if (isMenuOpen) {
      closeMenu();
    } else {
      onHomeClick();
    }
  };

  return (
    <div className={styles.logoContainer}>
      <a className={styles.logo} onClick={handleLogoClick}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 19" width="24" height="24">
          <title>{showSubNav ? "Go Back to Main Menu" : "Logo, returns Home to DavidPuerto.com"}</title>
          <defs>
            <filter id="dropShadow" x="-20%" y="-20%" width="150%" height="150%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
              <feOffset dx="2" dy="2" result="offsetblur" />
              <feFlood floodColor="black" floodOpacity="0.5" />
              <feComposite in2="offsetblur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g id="logo" fillRule="nonzero">
            <path
              id="logo-path"
              ref={logoRef}
              d="M17.7762223,0 C22.0993405,1.05095417 26,3.22401634 26,8.83692672 C26,14.4498371 21.4058992,19 15.7387888,19 L0,19 L3.40465506,15.304337 L15.7387888,15.304337 C19.3451318,15.304337 22.2686505,12.4087788 22.2686505,8.83692672 C22.2686505,5.26507465 18.569846,3.41487829 14.963503,3.41487829 L17.7762223,0 Z"
            />
            <path
              id="back-arrow-path"
              style={{ display: 'none' }}
              d="M15.24732,0.475719372 C14.62044,-0.158573124 13.61148,-0.158573124 12.98448,0.475719372 C12.67104,0.792871691 12.51432,1.20416324 12.51432,1.62042035 C12.51432,2.03667745 12.67104,2.447969 12.98448,2.76512132 L18.5388,8.3845437 L1.601628,8.3845437 C0.72,8.3845437 0,9.10803414 0,10.0049307 C0,10.8969102 0.7151016,11.625354 1.601628,11.625354 L18.5388,11.625354 L12.98448,17.2348574 C12.3576,17.8692106 12.3576,18.8900033 12.98448,19.5242351 C13.61148,20.1585883 14.62044,20.1585883 15.24732,19.5242351 L23.52984,11.1447025 C23.82852,10.8423983 24,10.4310703 24,9.99995295 C24,9.56888416 23.83344,9.15758047 23.52984,8.85530054 L15.24732,0.475719372 Z"
            />
          </g>
        </svg>
        {showSubNav && (
          <>
            <div className={styles.goBackText}>Previous Links</div>
            <div className={styles.currentView}> / Case Studies</div>
          </>
        )}
      </a>
    </div>
  );
}
