import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Field-level errors
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  
  const { register, isLoading, error } = useAuth();
  const navigate = useNavigate();

  // Auto focus on username input when page loads
  useEffect(() => {
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
      usernameInput.focus();
    }
  }, []);

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    let checks = 0;
    
    if (password.length >= 8) {
      strength += 25;
      checks++;
    }
    if (/[A-Z]/.test(password)) {
      strength += 25;
      checks++;
    }
    if (/[a-z]/.test(password)) {
      strength += 25;
      checks++;
    }
    if (/[0-9]/.test(password)) {
      strength += 25;
      checks++;
    }
    
    return { strength, checks };
  };

  const { strength: passwordStrength, checks } = getPasswordStrength(password);
  
  const getPasswordStrengthText = (strength: number) => {
    if (strength < 50) return '弱';
    if (strength < 75) return '中';
    return '強';
  };

  // Validation functions
  const validateUsername = (username: string) => {
    if (username.length < 3) return '用戶名至少需要3個字符';
    if (username.length > 20) return '用戶名不能超過20個字符';
    if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(username)) return '用戶名只能包含字母、數字、下劃線和中文字符';
    return '';
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return '請輸入有效的電子郵件地址';
    return '';
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return '密碼至少需要8個字符';
    return '';
  };

  // Handle field blur events
  const handleUsernameBlur = () => {
    if (username) {
      setUsernameError(validateUsername(username));
    }
  };

  const handleEmailBlur = () => {
    if (email) {
      setEmailError(validateEmail(email));
    }
  };

  const handlePasswordBlur = () => {
    if (password) {
      setPasswordError(validatePassword(password));
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (confirmPassword) {
      if (confirmPassword !== password) {
        setConfirmPasswordError('密碼確認不符');
      } else {
        setConfirmPasswordError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setFormError('');

    // Validate all fields
    let hasError = false;
    
    if (!username) {
      setUsernameError('請輸入用戶名');
      hasError = true;
    } else {
      const usernameValidation = validateUsername(username);
      if (usernameValidation) {
        setUsernameError(usernameValidation);
        hasError = true;
      }
    }

    if (!email) {
      setEmailError('請輸入電子郵件');
      hasError = true;
    } else {
      const emailValidation = validateEmail(email);
      if (emailValidation) {
        setEmailError(emailValidation);
        hasError = true;
      }
    }

    if (!password) {
      setPasswordError('請設置密碼');
      hasError = true;
    } else {
      const passwordValidation = validatePassword(password);
      if (passwordValidation) {
        setPasswordError(passwordValidation);
        hasError = true;
      } else if (passwordStrength < 50) {
        setPasswordError('密碼強度不足，請包含大小寫字母、數字');
        hasError = true;
      }
    }

    if (!confirmPassword) {
      setConfirmPasswordError('請確認密碼');
      hasError = true;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('密碼確認不符');
      hasError = true;
    }

    if (hasError || isLoading) {
      return;
    }

    await register(username, email, password, navigate);
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
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">C</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">創建新帳戶</CardTitle>
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
            {/* 用戶名輸入框 */}
            <div className="space-y-2">
              <Label htmlFor="username">用戶名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={handleUsernameBlur}
                onKeyPress={handleKeyPress}
                placeholder="請選擇一個用戶名"
                disabled={isLoading}
                className={usernameError ? 'border-destructive' : ''}
                aria-describedby={usernameError ? 'username-error' : undefined}
              />
              {usernameError && (
                <p id="username-error" className="text-sm text-destructive">
                  {usernameError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                3-20個字符，可包含字母、數字、下劃線和中文
              </p>
            </div>

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
                  placeholder="請設置密碼"
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
              
              {/* 密碼強度指示器 */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${passwordStrength < 50 ? 'bg-destructive' : passwordStrength < 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground min-w-0">
                      {getPasswordStrengthText(passwordStrength)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>密碼要求：</p>
                    <div className="grid grid-cols-2 gap-1">
                      <div className={`flex items-center space-x-1 ${password.length >= 8 ? 'text-green-600' : ''}`}>
                        {password.length >= 8 ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                        <span>至少8個字符</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${/[A-Z]/.test(password) ? 'text-green-600' : ''}`}>
                        {/[A-Z]/.test(password) ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                        <span>包含大寫字母</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${/[a-z]/.test(password) ? 'text-green-600' : ''}`}>
                        {/[a-z]/.test(password) ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                        <span>包含小寫字母</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${/[0-9]/.test(password) ? 'text-green-600' : ''}`}>
                        {/[0-9]/.test(password) ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                        <span>包含數字</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {passwordError && (
                <p id="password-error" className="text-sm text-destructive">
                  {passwordError}
                </p>
              )}
            </div>

            {/* 確認密碼輸入框 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認密碼</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={handleConfirmPasswordBlur}
                  onKeyPress={handleKeyPress}
                  placeholder="請再次輸入密碼"
                  disabled={isLoading}
                  className={confirmPasswordError ? 'border-destructive pr-10' : 'pr-10'}
                  aria-describedby={confirmPasswordError ? 'confirm-password-error' : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  aria-label={showConfirmPassword ? '隱藏密碼' : '顯示密碼'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {confirmPasswordError && (
                <p id="confirm-password-error" className="text-sm text-destructive">
                  {confirmPasswordError}
                </p>
              )}
            </div>

            {/* 註冊按鈕 */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !!usernameError || !!emailError || !!passwordError || !!confirmPasswordError}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  註冊中...
                </>
              ) : (
                '註冊'
              )}
            </Button>
          </form>

          {/* 登入連結 */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              已有帳戶？{' '}
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                登入
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
