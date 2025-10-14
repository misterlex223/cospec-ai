import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { EditorPage } from './pages/EditorPage';
import NotificationProvider from './components/NotificationProvider/NotificationProvider';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Navigate to="/edit" replace />} />
              <Route path="/edit" element={<EditorPage />} />
              {/* Add a catch-all route for unescaped paths */}
              <Route path="/edit/*" element={<EditorPage />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </ErrorBoundary>
    </Provider>
  );
}

export default App;
