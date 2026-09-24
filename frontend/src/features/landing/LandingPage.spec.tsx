import { render, screen } from '../../test-utils';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import { LandingPage } from './LandingPage';

describe('LandingPage Component', () => {
  const renderLandingPage = (isAuthenticated = false) => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          isAuthenticated,
          accessToken: isAuthenticated ? 'fake-token' : null,
          refreshToken: null,
          orgId: isAuthenticated ? 'org-123' : null,
          employee: null,
          isInitialSetup: false,
        },
      },
    });

    return render(
      <Provider store={store}>
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      </Provider>
    );
  };

  it('renders enterprise header with branding and unauthenticated action buttons', () => {
    renderLandingPage(false);

    expect(screen.getAllByText('Sify Workforce').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /log in/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('renders hero section with exact required headline, badge, and copy', () => {
    renderLandingPage(false);

    expect(screen.getByText('Workforce Operations Platform')).toBeInTheDocument();
    expect(screen.getByText('Manage People. Organize Work. Track Time.')).toBeInTheDocument();
    expect(
      screen.getByText('Sify Workforce brings employees, teams, projects, tasks, activities and timesheets together in one structured workspace.')
    ).toBeInTheDocument();
    expect(screen.getByText('From daily time entries to weekly manager approval.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /get started/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders product introduction and all 6 actual product areas', () => {
    renderLandingPage(false);

    expect(screen.getByText('Everything your team needs to manage work')).toBeInTheDocument();
    expect(
      screen.getByText('Organize your workforce, manage project work, record time and move weekly timesheets through a structured approval workflow.')
    ).toBeInTheDocument();

    expect(screen.getByText('Workforce')).toBeInTheDocument();
    expect(screen.getByText('Manage employees, teams, roles and manager relationships.')).toBeInTheDocument();

    expect(screen.getAllByText('Projects').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Organize projects, requirements, tasks, activities and project assignments.')).toBeInTheDocument();

    expect(screen.getByText('Time Tracking')).toBeInTheDocument();
    expect(screen.getByText('Record hours against the project, task and activity where work is performed.')).toBeInTheDocument();

    expect(screen.getAllByText('Timesheets').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Review weekly hours, submit timesheets and track their approval status.')).toBeInTheDocument();

    expect(screen.getAllByText('Approvals').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Managers can review submissions, approve completed work or reject them with a correction comment.')).toBeInTheDocument();

    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('View employee, team and project-level time information and utilization.')).toBeInTheDocument();
  });

  it('renders the 8-step connected workflow progression', () => {
    renderLandingPage(false);

    expect(screen.getByText('A connected workflow from work to approval')).toBeInTheDocument();
    expect(
      screen.getByText('Sify Workforce connects the way work is organized with the way time is recorded and reviewed.')
    ).toBeInTheDocument();

    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Employee & Team')).toBeInTheDocument();
    expect(screen.getAllByText('Project').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Task & Activity')).toBeInTheDocument();
    expect(screen.getByText('Time Entry')).toBeInTheDocument();
    expect(screen.getByText('Weekly Timesheet')).toBeInTheDocument();
    expect(screen.getByText('Manager Approval')).toBeInTheDocument();
    expect(screen.getByText('Reporting')).toBeInTheDocument();
  });

  it('renders role-based content for Employee, Manager, and Admin', () => {
    renderLandingPage(false);

    expect(screen.getByText('Designed around the responsibilities of each role')).toBeInTheDocument();
    expect(screen.getByText('Track daily work, manage time entries and submit weekly timesheets.')).toBeInTheDocument();
    expect(screen.getByText('Review team timesheets, approve submissions and request corrections when required.')).toBeInTheDocument();
    expect(screen.getByText('Manage the organization, employees, teams, projects and organization-level reporting.')).toBeInTheDocument();
  });

  it('renders time-tracking and timesheet sections with real product flows', () => {
    renderLandingPage(false);

    expect(screen.getByText('Track time against the work that matters')).toBeInTheDocument();
    expect(
      screen.getByText('Record time using the project, task and activity associated with the work performed, keeping time entries connected to actual project work.')
    ).toBeInTheDocument();

    expect(screen.getByText('From daily entries to weekly approval')).toBeInTheDocument();
    expect(
      screen.getByText('Daily time entries are organized into Monday–Sunday timesheets that employees can submit for manager review. Submitted timesheets can be approved or returned for correction before final approval.')
    ).toBeInTheDocument();

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getAllByText('Submitted').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Resubmit')).toBeInTheDocument();
  });

  it('renders all 5 real reports and governance access', () => {
    renderLandingPage(false);

    expect(screen.getByText('Visibility across employees, teams and projects')).toBeInTheDocument();
    expect(screen.getByText('Employee Time Summary')).toBeInTheDocument();
    expect(screen.getByText('Manager Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    expect(screen.getByText('Project Hours')).toBeInTheDocument();
    expect(screen.getByText('Project Analysis')).toBeInTheDocument();

    expect(screen.getByText('Access aligned with responsibility')).toBeInTheDocument();
    expect(screen.getByText('Organization-wide management')).toBeInTheDocument();
    expect(screen.getByText('Managed-team workflows')).toBeInTheDocument();
    expect(screen.getByText('Personal work and timesheets')).toBeInTheDocument();
  });

  it('renders final CTA and footer', () => {
    renderLandingPage(false);

    expect(screen.getByText('Bring people, projects and time together.')).toBeInTheDocument();
    expect(
      screen.getByText('Manage workforce operations through one structured workflow for work, time tracking and timesheet approval.')
    ).toBeInTheDocument();
    expect(screen.getByText(/2026 Sify Workforce\. All rights reserved\./i)).toBeInTheDocument();
  });

  it('displays "Go to Dashboard" in header when user is already authenticated', () => {
    renderLandingPage(true);

    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
  });
});
