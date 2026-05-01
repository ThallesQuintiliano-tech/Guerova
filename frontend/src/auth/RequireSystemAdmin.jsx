import React from 'react';
import { Navigate } from 'react-router-dom';
import { Alert } from 'reactstrap';
import { useAuth } from './AuthContext';

export default function RequireSystemAdmin({ children }) {
  const { user } = useAuth();
  if (!user?.isSystemAdmin) {
    return (
      <Alert color="danger" className="m-3">
        Acesso restrito ao admin do sistema.
      </Alert>
    );
  }
  return children;
}

