import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/edit" replace />} />
        <Route path="/edit" element={<EditorPage />} />
        <Route path="/edit/:path" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
