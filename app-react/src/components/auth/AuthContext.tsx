import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';

// 定義用戶和組織類型
export interface User {
  id: string;
  username: string;
  email: string;
  created_at: number;
  updated_at: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: {
    isPersonal?: boolean;
    owner?: string;
    [key: string]: any;
  };
  role: string;
  created_at: number;
  updated_at: number;
}

// 認證上下文類型
interface AuthContextType {
  user: User | null;
  personalOrganization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, navigate?: NavigateFunction) => Promise<void>;
  register: (username: string, email: string, password: string, navigate?: NavigateFunction) => Promise<void>;
  logout: (navigate?: NavigateFunction) => void;
  error: string | null;
}

// 創建認證上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 認證提供者組件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [personalOrganization, setPersonalOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 檢查用戶是否已登入
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setPersonalOrganization(data.personalOrganization);
          } else {
            // 令牌無效，清除本地存儲
            localStorage.removeItem('auth_token');
            setToken(null);
          }
        } catch (err) {
          console.error('Error checking authentication:', err);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  // 登入功能
  const login = async (email: string, password: string, customNavigate?: NavigateFunction) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setPersonalOrganization(data.personalOrganization);
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        if (customNavigate) {
          customNavigate('/organizations');
        } else if (navigate) {
          navigate('/organizations');
        }
      } else {
        setError(data.error || '登入失敗，請檢查您的憑據');
      }
    } catch (err) {
      setError('登入時發生錯誤，請稍後再試');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 註冊功能
  const register = async (username: string, email: string, password: string, customNavigate?: NavigateFunction) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setPersonalOrganization(data.personalOrganization);
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        if (customNavigate) {
          customNavigate('/organizations');
        } else if (navigate) {
          navigate('/organizations');
        }
      } else {
        setError(data.error || '註冊失敗，請嘗試使用不同的用戶名或電子郵件');
      }
    } catch (err) {
      setError('註冊時發生錯誤，請稍後再試');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 登出功能
  const logout = (customNavigate?: NavigateFunction) => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setPersonalOrganization(null);
    setToken(null);
    if (customNavigate) {
      customNavigate('/login');
    } else if (navigate) {
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        personalOrganization,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 使用認證上下文的自定義鉤子
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
