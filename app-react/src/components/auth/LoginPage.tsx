import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  // Auto focus on email input when page loads
  useEffect(() => {
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.focus();
    }
  }, []);

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email blur
  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError('請輸入有效的電子郵件地址');
    } else {
      setEmailError('');
    }
  };

  // Handle password blur
  const handlePasswordBlur = () => {
    if (password && password.length < 1) {
      setPasswordError('請輸入密碼');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setEmailError('');
    setPasswordError('');
    setFormError('');

    // Validate all fields
    let hasError = false;

    if (!email) {
      setEmailError('請輸入電子郵件');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('請輸入有效的電子郵件地址');
      hasError = true;
    }

    if (!password) {
      setPasswordError('請輸入密碼');
      hasError = true;
    }

    if (hasError || isLoading) {
      return;
    }

    await login(email, password, navigate);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e as any);
    }
  };

  const currentError = error || formError;

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">C</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">登入您的帳戶</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">CoSpec Markdown</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 錯誤消息區域 */}
          {currentError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{currentError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 電子郵件輸入框 */}
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                onKeyPress={handleKeyPress}
                placeholder="請輸入您的電子郵件"
                disabled={isLoading}
                className={emailError ? 'border-destructive' : ''}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailError && (
                <p id="email-error" className="text-sm text-destructive">
                  {emailError}
                </p>
              )}
            </div>

            {/* 密碼輸入框 */}
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={handlePasswordBlur}
                  onKeyPress={handleKeyPress}
                  placeholder="請輸入您的密碼"
                  disabled={isLoading}
                  className={passwordError ? 'border-destructive pr-10' : 'pr-10'}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-sm text-destructive">
                  {passwordError}
                </p>
              )}
            </div>

            {/* 登入按鈕 */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !!emailError || !!passwordError}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登入中...
                </>
              ) : (
                '登入'
              )}
            </Button>
          </form>

          {/* 註冊連結 */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              還沒有帳戶？{' '}
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                註冊
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
