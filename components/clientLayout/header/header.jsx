import React from 'react';
import Menu from '../menu/menu';
import styles from './header.module.css';

export default function Header() {

  return (
    <header className={styles.header}>
      <Menu />
    </header>
  );
}
