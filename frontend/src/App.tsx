import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './features/auth/Login';
import { MyProjects } from './features/projects/MyProjects';
import { ProjectDetail } from './features/projects/ProjectDetail';
import { MyTimeEntries } from './features/time-entries/MyTimeEntries';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<div className="p-6"><h1 className="text-2xl font-bold">Dashboard</h1><p>Welcome to Sify Workforce.</p></div>} />
            <Route path="/projects" element={<MyProjects />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/time-entries" element={<MyTimeEntries />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
