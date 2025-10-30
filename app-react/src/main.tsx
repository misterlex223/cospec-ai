import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App.tsx'
import ProfileEditorApp from './ProfileEditorApp.tsx'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import './index.css'

// Check if we're in profile editor mode
async function initializeApp() {
  try {
    const response = await fetch('./api/config');
    const config = await response.json();

    const AppComponent = config.profileEditorMode ? ProfileEditorApp : App;

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <Provider store={store}>
          <ErrorBoundary>
            <AppComponent />
          </ErrorBoundary>
        </Provider>
      </React.StrictMode>,
    );
  } catch (error) {
    console.error('Failed to load app config, defaulting to regular mode:', error);
    // Default to regular app if config fails
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
}

initializeApp();
