import { useContext, useState } from 'react';
import { AuthContext } from '../../contexts/auth/authContext';
import axios from 'axios';
import styles from './login.module.css';

function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { setIsAuthenticated } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const redirectToParam = params.get('redirectTo') || '/';

      const response = await axios.post('/api/login', {
        password,
        redirectTo: redirectToParam,
      });

      if (response.data?.success) {
        setIsAuthenticated(true);

        const next = (response.data.redirectTo || redirectToParam || '/')
          .replace(/\/index\.pageContext\.json$/, '');

        // 🔥 Hard redirect instead of SPA navigate
        window.location.href = next;
      } else {
        setError(response.data?.message || 'Invalid credentials, please try again.');
      }
    } catch (err) {
      setError('Invalid credentials, please try again.');
    }
  };

  return (
    <form className={styles.form} onSubmit={handleLogin}>
      <h2>Login <em>to view</em></h2>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter password"
      />
      <button type="submit">Login</button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export default Login;
