import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './features/auth/Login';
import { Dashboard } from './features/dashboard/Dashboard';
import { MyProjects } from './features/projects/MyProjects';
import { ProjectDetail } from './features/projects/ProjectDetail';
import { MyTimeEntries } from './features/time-entries/MyTimeEntries';
import { MyTimesheets } from './features/timesheets/MyTimesheets';
import { TimesheetDetail } from './features/timesheets/TimesheetDetail';
import { ManagerApprovals } from './features/approvals/ManagerApprovals';
import { EmployeesList } from './features/employees/EmployeesList';
import { TeamsList } from './features/teams/TeamsList';
import { AllProjectsList } from './features/admin-projects/AllProjectsList';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<MyProjects />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/time-entries" element={<MyTimeEntries />} />
            <Route path="/timesheets" element={<MyTimesheets />} />
            <Route path="/timesheets/:id" element={<TimesheetDetail />} />
            <Route path="/approvals" element={<ManagerApprovals />} />
            <Route path="/employees" element={<EmployeesList />} />
            <Route path="/teams" element={<TeamsList />} />
            <Route path="/admin/projects" element={<AllProjectsList />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
