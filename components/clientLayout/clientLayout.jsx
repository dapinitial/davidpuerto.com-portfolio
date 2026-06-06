import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { AuthProvider } from '../../contexts/auth/authContext';
import { useIsomorphicLayoutEffect } from '../../renderer/useIsomorphicLayoutEffect';
import { usePageContext } from '../../renderer/usePageContext';
import styles from './clientLayout.module.css';
import Header from './header/header';
import Preloader from '../preloader/preloader';
import PreloaderInfinite from '../preloaderInfinite/preloaderInfinite';
import ScrollToTopButton from './scrollToTopButton/scrollToTopButton';
import NavigateCaseStudies from '../navigateCaseStudies/navigateCaseStudies';

gsap.registerPlugin(ScrollTrigger);

const caseStudyNavigation = {
  '/case-studies/microsoft': { prev: null, next: '/case-studies/facebook' },
  '/case-studies/facebook': {
    prev: '/case-studies/microsoft',
    next: '/case-studies/nordstrom',
  },
  '/case-studies/nordstrom': {
    prev: '/case-studies/facebook',
    next: '/case-studies/sonosite',
  },
  '/case-studies/sonosite': {
    prev: '/case-studies/nordstrom',
    next: '/case-studies/zillow',
  },
  '/case-studies/zillow': { prev: '/case-studies/sonosite', next: null },
};

export default function ClientLayout({ children }) {
  const [isLightSection, setIsLightSection] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);

  useEffect(() => {
    const handleSPAStart = () => {
      setIsTransitioning(true);
      setIsContentVisible(false); // Hide content during transition
    };

    const handleSPAEnd = () => {
      setTimeout(() => {
        setIsTransitioning(false);
        setIsContentVisible(true); // Show content after transition
      }, 2000); // Align with PreloaderInfinite animations
    };

    window.addEventListener('spaTransitionStart', handleSPAStart);
    window.addEventListener('spaTransitionEnd', handleSPAEnd);

    return () => {
      window.removeEventListener('spaTransitionStart', handleSPAStart);
      window.removeEventListener('spaTransitionEnd', handleSPAEnd);
    };
  }, []);


  useEffect(() => {
    const headerHeight = 32;

    const detectFirstSection = () => {
      const sections = document.querySelectorAll('.light-section, .dark-section');
      const firstVisibleSection = Array.from(sections).find(section => {
        const rect = section.getBoundingClientRect();
        return rect.top <= headerHeight && rect.bottom >= headerHeight;
      });

      if (firstVisibleSection) {
        const isLight = firstVisibleSection.classList.contains('light-section');
        setIsLightSection(isLight);
      }
    };

    const runDetectionAfterRender = () => {
      setTimeout(() => {
        detectFirstSection();
      }, 50);
    };

    runDetectionAfterRender();

    window.addEventListener('scroll', detectFirstSection);

    return () => {
      window.removeEventListener('scroll', detectFirstSection);
    };
  }, []);

  useEffect(() => {
    document.body.classList.remove(isLightSection ? 'dark-content' : 'light-content');
    document.body.classList.add(isLightSection ? 'light-content' : 'dark-content');
  }, [isLightSection]);

  const pathname = usePageContext();
  const extractedPathname = pathname.urlPathname || '/';
  const navLinks = caseStudyNavigation[extractedPathname] || { prev: null, next: null };

  useEffect(() => {
    const clientLayoutElement = document.querySelector(`.${styles.clientLayout}`);

    if (extractedPathname === '/resume') {
      clientLayoutElement.classList.add(styles.resumeBackgroundStyle);
    } else {
      clientLayoutElement.classList.remove(styles.resumeBackgroundStyle);
    }
  }, [extractedPathname]);

  useIsomorphicLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <div className={styles.clientLayout}>
      {/*<Link href="#main-content" className="skipLink">
        Skip to main content
      </Link>*/}
      <Preloader />
      {isTransitioning && (
        <PreloaderInfinite
          onComplete={() => {
            setIsContentVisible(true); // Make content visible after preloader
          }}
        />
      )}
      <AuthProvider>
        <Header />
        <main
          id="main-content"
          className={`${styles.main} ${isContentVisible ? styles.visible : styles.hidden}`}>
          {React.cloneElement(children)}
        </main>
        <ScrollToTopButton />
        {(navLinks.prev || navLinks.next) && (
          <NavigateCaseStudies
            prevLink={navLinks.prev}
            nextLink={navLinks.next}
          />
        )}
      </AuthProvider>
    </div>
  );
}
