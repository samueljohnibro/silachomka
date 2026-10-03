import { Navigate } from "react-router-dom";
import { useAdminAuth } from "./useAdminAuth";

export default function AdminProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="admin-auth-loading">
        <p>Authenticating...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
