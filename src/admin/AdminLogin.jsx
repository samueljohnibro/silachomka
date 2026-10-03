import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./useAdminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading, error: authError, clearError } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/admin", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch {
      // error is set by the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <p className="admin-login-loading">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <span className="admin-login-mark">SC</span>
          <h1 className="admin-login-title">silachomka</h1>
          <p className="admin-login-subtitle">Admin Console</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form" noValidate>
          {authError && (
            <div className="admin-login-error" role="alert">
              <span>{authError}</span>
              <button type="button" onClick={clearError} className="admin-login-error-dismiss" aria-label="Dismiss error">&times;</button>
            </div>
          )}

          <div className="admin-field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input"
              placeholder="admin@silachomka.com"
              autoComplete="email"
              autoFocus
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <div className="admin-password-wrapper">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input"
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-login-btn"
            disabled={isSubmitting || !email.trim() || !password.trim()}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="admin-login-footer">chomkaMUSIC™ · Private Workspace</p>
      </div>
    </div>
  );
}
