import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/edit" replace />} />
        <Route path="/edit" element={<EditorPage />} />
        {/* Add a catch-all route for unescaped paths */}
        <Route path="/edit/*" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
