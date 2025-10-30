import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from './store';
import { fetchAvailableProfiles } from './store/slices/profileEditorSlice';
import ProfileBrowser from './pages/ProfileBrowser';
import ProfileEditorPage from './pages/ProfileEditorPage';
import { ToastContainer } from 'react-toastify';
import { connectWebSocket } from './services/websocket';
import 'react-toastify/dist/ReactToastify.css';
import './styles/profileEditor.css';

/**
 * ProfileEditorApp - Main application component for Profile Editor mode
 * Launched when --profile-editor flag is used
 */
function ProfileEditorApp() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Connect to websocket for real-time updates
    connectWebSocket();

    // Load available profiles on mount
    dispatch(fetchAvailableProfiles());
  }, [dispatch]);

  return (
    <Router>
      <div className="profile-editor-app min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">CoSpec AI Profile Editor</h1>
              <p className="text-sm text-gray-600 mt-1">
                Create and manage document profiles
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Profile Editor Mode
            </div>
          </div>
        </header>

        <main className="container mx-auto p-6">
          <Routes>
            <Route path="/" element={<ProfileBrowser />} />
            <Route path="/edit/:profileName" element={<ProfileEditorPage />} />
            <Route path="/new" element={<ProfileEditorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default ProfileEditorApp;
