import axios from 'axios';
import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await axios.get('/api/check-auth');
        // console.log('Auth Status Response:', response.data);
        setIsAuthenticated(response.data.isAuthenticated);
      } catch (error) {
        // console.error('Error fetching auth status:', error);
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
