// src/components/Common/ProtectedRoute.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { hasPermission } from '../../utils/rolePermissions';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const auth = useSelector(state => state.auth);
  const { user, initialized } = auth;

  // While we haven't decided auth status, render loading to avoid flash
  if (!initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // If not authenticated -> go to login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // If permission required, check it
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    // You can choose to redirect to 403 page; for now redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Authorized
  return children;
};

export default ProtectedRoute;
