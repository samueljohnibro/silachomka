import React, { useState } from 'react';
import { useAdminAuth } from './AdminAuthProvider';
import './admin.css';

export const AdminLoginPage = () => {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
      // ProtectedRoute handles the redirect automatically when isAuthenticated changes
    } catch (err) {
      setError(err.message || 'Invalid credentials or network error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <h1>chomka<span>STUDIO</span></h1>
        <p>Private Administration Workspace</p>

        {error && <div className="admin-login-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="studio-field">
            <label htmlFor="email">Admin Email</label>
            <input 
              id="email"
              type="email" 
              className="studio-input" 
              placeholder="you@domain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="studio-field" style={{ position: 'relative' }}>
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type={showPassword ? "text" : "password"} 
              className="studio-input" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '32px',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {showPassword ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          <button 
            type="submit" 
            className="primary-button" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
