import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'reactstrap';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { isAuthenticated, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5 text-muted">
        <Spinner color="primary" className="me-2" />
        Carregando sessão…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/pages/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

