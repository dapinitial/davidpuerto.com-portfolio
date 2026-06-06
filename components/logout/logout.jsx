import React, { useContext } from 'react';
import { navigate } from 'vike/client/router';
import { AuthContext } from '../../contexts/auth/authContext';
import axios from 'axios';
import styles from './logout.module.css';

export default function Logout() {
  const { setIsAuthenticated } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      const response = await axios.post('/api/logout');
      if (response.data.success) {
        setIsAuthenticated(false); // Update auth state
        localStorage.removeItem('redirectAfterLogin'); // Clear any saved redirect path
        navigate('/login');
        // Optionally show a success message
        alert('You have been logged out.');

        // Redirect to the homepage after logout
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed. Please try again.');
    }
  };

  return (
    <button onClick={handleLogout} className={styles.logoutButton}>
      Logout
    </button>
  );
}
