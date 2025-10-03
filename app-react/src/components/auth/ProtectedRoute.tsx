import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // 如果正在加載，顯示加載指示器
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // 如果未認證，重定向到登入頁面
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 如果已認證，顯示子組件
  return <>{children}</>;
};

export default ProtectedRoute;
