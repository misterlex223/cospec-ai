import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { EditorPage } from './pages/EditorPage';
import { AgentWorkbenchPage } from './pages/AgentWorkbenchPage';
import { AgentResultPage } from './pages/AgentResultPage';
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
              <Route path="/edit/*" element={<EditorPage />} />
              <Route path="/agent/workbench" element={<AgentWorkbenchPage />} />
              <Route path="/agent/result/:id" element={<AgentResultPage />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </ErrorBoundary>
    </Provider>
  );
}

export default App;
