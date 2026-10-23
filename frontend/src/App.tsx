import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { Invite } from './features/auth/Invite';
import { Onboarding } from './features/onboarding/Onboarding';
import { Dashboard } from './features/dashboard/Dashboard';
import { MyProjects } from './features/projects/MyProjects';
import { ProjectDetail } from './features/projects/ProjectDetail';
import { MyTimeEntries } from './features/time-entries/MyTimeEntries';
import { MyTimesheets } from './features/timesheets/MyTimesheets';
import { TeamTimesheets } from './features/timesheets/TeamTimesheets';
import { TimesheetDetail } from './features/timesheets/TimesheetDetail';
import { ManagerApprovals } from './features/approvals/ManagerApprovals';
import { ManagerTimesheetReview } from './features/approvals/ManagerTimesheetReview';
import { SubmissionApprovals } from './features/timesheets/SubmissionApprovals';
import { EmployeesList } from './features/employees/EmployeesList';
import { TeamsList } from './features/teams/TeamsList';
import { AllProjectsList } from './features/admin-projects/AllProjectsList';
import { ProjectOnboarding } from './features/projects/onboarding/ProjectOnboarding';
import { OrganizationOverview } from './features/organization/OrganizationOverview';
import { OrganizationSettings } from './features/organization/OrganizationSettings';
import { OrganizationDetail } from './features/organization/OrganizationDetail';

import { ReportsAndAnalytics } from './features/reports/ReportsAndAnalytics';

import { AuditLogsList } from './features/system/AuditLogsList';

import { ManagerWorkingTimesView } from './features/working-times/ManagerWorkingTimesView';
import { WorkCalendar } from './features/working-times/WorkCalendar';

import { OrganizationSetup } from './features/organization-setup/OrganizationSetup';
import { LandingPage } from './features/landing/LandingPage';
import { AuthInitializer } from './components/auth/AuthInitializer';

function App() {
  return (
    <Router>
      <AuthInitializer>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/invite/:token" element={<Invite />} />
        
        <Route element={<ProtectedRoute />}>
          {/* Setup dashboard does not use AppLayout to hide the sidebar */}
          <Route path="/setup" element={<OrganizationSetup />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<MyProjects />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/time-entries" element={<MyTimeEntries />} />
            <Route path="/timesheets" element={<MyTimesheets />} />
            <Route path="/timesheets/:id" element={<TimesheetDetail />} />
            <Route path="/team-timesheets" element={<TeamTimesheets />} />
            <Route path="/approvals" element={<ManagerApprovals />} />
            <Route path="/approvals/timesheets/:id" element={<ManagerTimesheetReview />} />
            <Route path="/submission-approvals" element={<SubmissionApprovals />} />
            <Route path="/employees" element={<EmployeesList />} />
            <Route path="/teams" element={<TeamsList />} />
            <Route path="/organization" element={<OrganizationOverview />} />
            <Route path="/organization/overview" element={<OrganizationOverview />} />
            <Route path="/organization/profile" element={<OrganizationDetail />} />
            <Route path="/organization/settings" element={<OrganizationSettings />} />
            <Route path="/admin/projects" element={<AllProjectsList />} />
            <Route path="/admin/projects/onboarding" element={<ProjectOnboarding />} />
            <Route path="/projects/onboarding" element={<ProjectOnboarding />} />
            <Route path="/admin/work-calendar" element={<WorkCalendar />} />
            <Route path="/admin/working-times" element={<Navigate to="/admin/work-calendar" replace />} />
            <Route path="/settings/timesheets" element={<ManagerWorkingTimesView />} />
            <Route path="/admin/public-holidays" element={<Navigate to="/admin/work-calendar#public-holidays" replace />} />
            
            {/* Reports Routing - Unified Single Page */}
            <Route path="/reports" element={<ReportsAndAnalytics />} />
            <Route path="/reports/advanced-analytics" element={<Navigate to="/reports" replace />} />
            <Route path="/reports/*" element={<Navigate to="/reports" replace />} />

            {/* System */}
            <Route path="/admin/audit-logs" element={<AuditLogsList />} />
            <Route path="/preferences" element={<Navigate to="/organization/settings" replace />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthInitializer>
  </Router>
)
}

export default App
