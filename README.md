# Sify Workforce Platform

Enterprise workforce, project management, and time tracking platform designed to streamline employee allocation, weekly timesheets, managerial approvals, and operational governance.

---

## Overview

The Sify Workforce Platform is a centralized operational solution connecting project planning, task management, time capture, and approval governance across an organization. It provides teams and managers with a single source of truth for tracking project deliverables, logging billable and non-billable hours, enforcing timesheet approval workflows, and generating operational analytics.

### Key Capabilities

- **Unified Time Capture**: Daily time tracking linked directly to authorized projects, tasks, and activities.
- **Structured Timesheet Approvals**: Automated routing of weekly timesheets to designated managers with audit tracking and anti-tampering controls.
- **Project and Task Coordination**: Support for Kanban boards, backlogs, timelines, milestones, and project-specific custom task fields.
- **Operational Analytics**: Consolidated reporting covering team utilization, attendance compliance, and project hours.

---

## User Roles

Access and permissions are strictly enforced according to organizational responsibilities:

- **Administrator**: Configures organization settings, manages employee directories and team structures, oversees project onboarding, defines standard working hours and public holidays, inspects system audit logs, and handles managerial timesheet approvals.
- **Manager**: Coordinates assigned teams and projects, monitors member allocations, tracks task execution, and reviews weekly timesheets submitted by direct team members.
- **Employee**: Accesses assigned projects and tasks, records daily work hours, submits weekly timesheets, and monitors approval statuses.

---

## Operational Workflows

### Project and Task Lifecycle

1. **Project Creation**: Define basic project parameters, code, and operational dates.
2. **Configuration**: Establish billable activities, milestones, and project-specific custom task fields (Short Text, Long Text, Dropdown).
3. **Team Allocation**: Assign employees to the project roster.
4. **Execution**: Manage tasks across Backlog, Board, and Timeline views.

### Timesheet and Approval Lifecycle

1. **Log Time**: Employees log daily hours against an authorized Project, Task, and Activity.
2. **Weekly Container**: Entries are aggregated into a standard Monday-to-Sunday weekly timesheet.
3. **Submission**: The employee reviews and submits the timesheet for evaluation.
4. **Manager Review**:
   - Direct team members' timesheets are reviewed by their assigned Team Manager.
   - Managers' and Administrators' timesheets are routed to designated Organization Administrators.
   - Self-approval is strictly prevented by the system.
5. **Resolution**: Approved timesheets are locked as immutable records. Rejected timesheets return to draft status with mandatory reviewer feedback comments.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Router
- **Backend**: NestJS 12, Node.js (ESM), PostgreSQL, Prisma ORM
- **Security**: Enterprise Single Sign-On (SSO) integration, role-based access control (RBAC), multi-tenant data isolation, and immutable audit logging

---

## Getting Started

### Prerequisites

- **Node.js**: Version 22 or higher (Node 20+ supported)
- **PostgreSQL**: Version 15 or higher (running on port 5432)
- **Mailpit** *(Optional)*: Local mock SMTP server for capturing invitation emails

### Backend Setup

```bash
cd backend
npm install
npm run contract:emit
npx prisma db update
npm run start:dev
```

- API Base URL: `http://localhost:3000/api/v1`
- Swagger Documentation: `http://localhost:3000/api/docs`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

- Web Application: `http://localhost:5173`

### Local Mail Service (Optional)

Run the local mail utility from the workspace root to capture outgoing onboarding emails:

```powershell
# Windows
.\mailpit.exe
```

- Web Interface: `http://localhost:8025`

---

## Production Verification

Run the following commands to verify clean production compilation:

```bash
# Frontend production build
cd frontend && npm run build

# Backend production build
cd backend && npm run build
```
