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
import { TimesheetDetail } from './features/timesheets/TimesheetDetail';
import { ManagerApprovals } from './features/approvals/ManagerApprovals';
import { EmployeesList } from './features/employees/EmployeesList';
import { TeamsList } from './features/teams/TeamsList';
import { AllProjectsList } from './features/admin-projects/AllProjectsList';
import { OrganizationOverview } from './features/organization/OrganizationOverview';
import { OrganizationSettings } from './features/organization/OrganizationSettings';

import { EmployeeSummary } from './features/reports/EmployeeSummary';
import { ManagerDashboard } from './features/reports/ManagerDashboard';
import { TeamUtilization } from './features/reports/TeamUtilization';
import { ProjectHours } from './features/reports/ProjectHours';
import { ProjectAnalysis } from './features/reports/ProjectAnalysis';
import { AdvancedAnalytics } from './features/reports/advanced-analytics/AdvancedAnalytics';
import { ResourceAllocation } from './features/reports/resource-allocation/ResourceAllocation';

import { AuditLogsList } from './features/system/AuditLogsList';

import { ManagerWorkingTimesView } from './features/working-times/ManagerWorkingTimesView';
import { WorkingTimesConfig } from './features/working-times/WorkingTimesConfig';
import { PublicHolidaysConfig } from './features/working-times/PublicHolidaysConfig';
import { UserPreferences } from './features/working-times/UserPreferences';

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
            <Route path="/approvals" element={<ManagerApprovals />} />
            <Route path="/employees" element={<EmployeesList />} />
            <Route path="/teams" element={<TeamsList />} />
            <Route path="/organization" element={<OrganizationOverview />} />
            <Route path="/organization/overview" element={<Navigate to="/organization" replace />} />
            <Route path="/organization/profile" element={<Navigate to="/organization" replace />} />
            <Route path="/organization/settings" element={<OrganizationSettings />} />
            <Route path="/admin/projects" element={<AllProjectsList />} />
            <Route path="/admin/working-times" element={<WorkingTimesConfig />} />
            <Route path="/settings/timesheets" element={<ManagerWorkingTimesView />} />
            <Route path="/admin/public-holidays" element={<PublicHolidaysConfig />} />
            
            {/* Reports Routing */}
            <Route path="/reports" element={<Navigate to="/reports/employee-summary" replace />} />
            <Route path="/reports/employee-summary" element={<EmployeeSummary />} />
            <Route path="/reports/manager-dashboard" element={<ManagerDashboard />} />
            <Route path="/reports/team-utilization" element={<TeamUtilization />} />
            <Route path="/reports/project-hours" element={<ProjectHours />} />
            <Route path="/reports/project-analysis" element={<ProjectAnalysis />} />
            <Route path="/reports/advanced-analytics" element={<AdvancedAnalytics />} />
            <Route path="/reports/resource-allocation" element={<ResourceAllocation />} />

            {/* System */}
            <Route path="/admin/audit-logs" element={<AuditLogsList />} />
            <Route path="/preferences" element={<UserPreferences />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthInitializer>
  </Router>
)
}

export default App
