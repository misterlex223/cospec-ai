import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import ProjectFiles from './components/ProjectFiles/ProjectFiles';
import FileEditor from './components/FileEditor/FileEditor';
import ApiTest from './components/ApiTest';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import { AuthProvider } from './components/auth/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PersonalSpace from './components/PersonalSpace';

// 添加 Toaster 組件用於通知
import { Toaster } from 'sonner';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Legacy routes */}
          <Route path="/edit" element={<EditorPage />} />
          <Route path="/edit/*" element={<EditorPage />} />
          
          {/* Protected SaaS routes */}
          <Route path="/" element={<Navigate to="/personal-space" replace />} />
          
          {/* 個人空間路由 */}
          <Route path="/personal-space" element={
            <ProtectedRoute>
              <PersonalSpace />
            </ProtectedRoute>
          } />
          
          {/* 組織路由（向後兼容） */}
          <Route path="/organizations" element={
            <ProtectedRoute>
              <Navigate to="/personal-space" replace />
            </ProtectedRoute>
          } />
          <Route path="/organizations/:orgId" element={
            <ProtectedRoute>
              <Navigate to="/personal-space" replace />
            </ProtectedRoute>
          } />
          
          {/* 專案路由 */}
          <Route path="/projects" element={
            <ProtectedRoute>
              <Navigate to="/personal-space" replace />
            </ProtectedRoute>
          } />
          <Route path="/projects/:projectId" element={
            <ProtectedRoute>
              <ProjectFiles />
            </ProtectedRoute>
          } />
          
          {/* 目錄路由 */}
          <Route path="/projects/:projectId/directory/*" element={
            <ProtectedRoute>
              <ProjectFiles />
            </ProtectedRoute>
          } />
          
          {/* 文件編輯路由 */}
          <Route path="/projects/:projectId/files/:fileId" element={
            <ProtectedRoute>
              <FileEditor />
            </ProtectedRoute>
          } />
          <Route path="/api-test" element={<ApiTest />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
