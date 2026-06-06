import React, { useState, useContext } from 'react';
import { AuthContext } from '../../../contexts/auth/authContext';
import { navigate } from 'vike/client/router';
import Logout from '../../logout/logout';
import { Link } from '../../../renderer/Link';
import Hamburger from '../hamburger/hamburger';
import Logo from '../logo/logo';
import styles from './menu.module.css';

export default function Menu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSubNav, setShowSubNav] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
    if (isMenuOpen) setShowSubNav(false);
  };

  const handleLinkClick = (href) => {
    setIsMenuOpen(false);
    setShowSubNav(false);
    navigate(href); // Use navigate() for SPA navigation
  };

  return (
    <>
      <Logo
        showSubNav={showSubNav}
        isMenuOpen={isMenuOpen}
        onBackClick={() => setShowSubNav(false)}
        onHomeClick={() => handleLinkClick('/')}
        closeMenu={() => setIsMenuOpen(false)}
      />
      {isAuthenticated && <Logout />}
      <Hamburger isOpen={isMenuOpen} toggleMenu={toggleMenu} />

      <nav className={`${styles.nav} ${isMenuOpen ? styles.open : ''}`}>
        <ul className={styles.menu}>
          {!showSubNav ? (
            <>
              <li>
                <div className={styles.spanCube}>
                  <Link href="/about-me" data-navlinkname="About Me" onClick={() => handleLinkClick('/about-me')} />
                </div>
              </li>
              <li>
                <div className={styles.spanCube}>
                  <Link href="#" data-navlinkname="Case Studies" onClick={() => setShowSubNav(true)} />
                </div>
              </li>
              <li>
                <div className={styles.spanCube}>
                  <Link href="/contact" data-navlinkname="Contact" onClick={() => handleLinkClick('/contact')} />
                </div>
              </li>
            </>
          ) : (
            <ul className={styles.subMenu}>
              <li>
                <div className={styles.spanCube}>
                  <Link href="/case-studies/microsoft" data-navlinkname="Microsoft" onClick={() => handleLinkClick('/case-studies/microsoft')} />
                </div>
              </li>
              <li>
                <div className={styles.spanCube}>
                  <Link href="/case-studies/facebook" data-navlinkname="Facebook" onClick={() => handleLinkClick('/case-studies/facebook')} />
                </div>
              </li>
              <li>
                <div className={styles.spanCube}>
                  <Link href="/case-studies/nordstrom" data-navlinkname="Nordstrom" onClick={() => handleLinkClick('/case-studies/nordstrom')} />
                </div>
              </li>
              <li>
                <div className={styles.spanCube}>
                  <Link href="/case-studies/sonosite" data-navlinkname="SonoSite" onClick={() => handleLinkClick('/case-studies/sonosite')} />
                </div>
              </li>
              <li>
                <div className={styles.spanCube}>
                  <Link href="/case-studies/zillow" data-navlinkname="Zillow" onClick={() => handleLinkClick('/case-studies/zillow')} />
                </div>
              </li>
            </ul>
          )}
        </ul>
      </nav>
    </>
  );
}
