# Sify Workforce Platform

## UI / Product Requirements

**Status:** In Progress
**Purpose:** Figma design reference
---

## 1. Purpose

The Sify Workforce Platform is an internal system to manage:

- Employees and teams within an organization
- Customers and their projects
- Project tasks and configurable activities
- Employee time entries against assigned work
- Weekly timesheets with manager approval
- Time-based reporting

This is a workforce time-tracking application. Employees log hours against projects, tasks and activities. Managers review and approve timesheets. Approved data feeds into reports.

---

## 2. User Roles

### Admin

- Manage organization details
- Manage employees (add, edit, activate/deactivate)
- Manage teams and team structure
- Assign roles to users
- Configure organizational structure

### Manager / Team Lead

- Manage assigned projects
- Create and manage tasks under projects
- Configure project activities
- Assign employees or teams to projects (TBC — assignment model not finalized)
- Review submitted timesheets
- Approve or reject timesheets
- View project and team reports

### Employee

- View assigned projects, tasks and activities
- Add time entries (project, task, activity, date, hours, remarks)
- Review weekly timesheet
- Submit timesheet for approval
- Correct rejected entries and resubmit

---

## 3. Application Navigation

Main sidebar or top-level navigation areas:

| Area | Accessible By | Notes |
|---|---|---|
| Dashboard | All roles | Role-specific content |
| Employees | Admin | List, add, edit, activate/deactivate |
| Teams | Admin | Create, edit, assign members |
| Customers | Admin, Manager | List, add, edit |
| Projects | Manager, Admin | List, create, manage |
| Tasks | Manager | Within project context |
| Activities | Manager | Within project context |
| Time Entry | Employee | Log daily work |
| Timesheets | Employee, Manager | Employee: own timesheet. Manager: team review |
| Reports | Manager, Admin | Time and project reports |

---

## 4. Dashboard

### Admin Dashboard

- Total employees (active / inactive)
- Total teams
- Organization overview
- Quick links to employee and team management

### Manager / Team Lead Dashboard

- Projects currently managed
- Timesheets pending review (count and list)
- Team member summary
- Quick access to timesheet review

### Employee Dashboard

- Current week timesheet status (Draft / Submitted / Approved / Rejected)
- Hours logged this week
- Assigned projects and tasks
- Quick link to time entry and timesheet

Exact widget layouts, card designs and chart types are not defined yet — the Figma design can propose the visual layout based on these data points.

---

## 5. Employee Management

### Employee List

Columns:

- Employee code
- Name
- Email
- Organization
- Team (where applicable — TBC)
- Status (Active / Inactive)

Actions: Add Employee, View, Edit, Activate/Deactivate

### Add Employee

Form fields:

- Organization (select — currently only one org exists)
- Employee code
- Name
- Email
- Active status (default: active)

**Important:** Duplicate employee code and duplicate email validation happens inside the create operation on the backend. There is no separate duplicate-check API or screen. The form should show the error returned by the server if a duplicate is detected (409 Conflict).

### Employee Details

Shows the employee record:

- Employee code
- Name
- Email
- Organization
- Team (TBC)
- Active status
- Created date

### Edit Employee

Same fields as Add Employee. Employee code may or may not be editable — TBC.

---

## 6. Organization and Team Management

### Organization

Currently one organization is expected. The org record stores:

- Name
- Code

No separate "create organization" screen is needed for the initial version. The org was seeded during setup.

### Team List

Columns:

- Team name
- Manager / Team Lead
- Member count

Actions: Create Team, View, Edit

### Create / Edit Team

Fields:

- Team name
- Manager / Team Lead (select from employees)

### Team Members

Within a team, show the list of assigned employees with the ability to add or remove members.

### Department / Group

The workflow mentions a Department / Group layer between Organization and Team. This structure is **TBC**. The Figma design should be aware that a department/group level may be added later, but should not design it as a confirmed feature right now.

---

## 7. Customer Management

### Customer List

Columns:

- Customer name
- Customer code
- Number of projects

Actions: Add Customer, View, Edit

### Add / Edit Customer

Fields:

- Customer name
- Customer code

### Customer Details

Shows:

- Customer information
- List of associated projects

---

## 8. Project Management

### Project List

Columns:

- Project name
- Project code
- Customer name
- Status

Actions: Create Project, View, Edit

### Create / Edit Project

Fields:

- Project name
- Project code
- Customer (select)
- Status

### Project Details

Shows project information and provides access to:

- Tasks (list, create, edit)
- Activities (list, create, edit, activate/deactivate)
- Assigned employees or teams (TBC — assignment model not finalized)

---

## 9. Task Management

Tasks exist within a project.

### Task List (within Project Details)

Columns:

- Task name
- Description
- Status
- Assigned employee (TBC)

Actions: Create Task, Edit Task

### Create / Edit Task

Fields:

- Task name
- Description
- Status
- Assigned employee (TBC — whether tasks are assigned to individual employees is not finalized)

---

## 10. Activity Management

Activities are configurable data records under a project. They are not hard-coded.

### Activity List (within Project Details)

Columns:

- Activity name
- Description
- Status (Active / Inactive)

Actions: Add Activity, Edit Activity, Activate/Deactivate

### Add / Edit Activity

Fields:

- Activity name
- Description
- Active status

A new activity is added as a data record. No new database column or new screen type is needed.

Activity ownership scope (project-level vs. organization-level) is **TBC**.

---

## 11. Time Entry

The main employee work screen.

### Time Entry Form

Fields:

- Date
- Project (select — only projects the employee has access to)
- Task (select — only tasks under the selected project)
- Activity (select — only active activities under the selected project)
- Hours
- Remarks

Actions: Save, Edit, Delete (if timesheet is still in Draft)

The dropdowns should be filtered:

- Project: only assigned projects
- Task: only tasks under the selected project
- Activity: only active activities under the selected project

Whether Task and Activity are always mandatory is **TBC**.

---

## 12. Weekly Timesheet

### Timesheet View

The current assumption is a weekly timesheet (Mon–Sun or as configured).

Show:

- Week / date range
- Rows: one per project + task + activity combination
- Columns: Mon through Sun + Total
- Daily hours per row
- Total hours per row
- Total hours per day (footer)
- Grand total
- Remarks (per entry, accessible via icon or expand)
- Timesheet status

Actions:

- Add / edit time entries
- Save (keeps timesheet in Draft)
- Submit (moves to Submitted → Pending Review)

### Timesheet Status Flow

```
Draft → Submitted → Pending Review → Approved
```

If rejected:

```
Pending Review → Rejected → Correction → Resubmitted
```

No other statuses are defined.

---

## 13. Manager Timesheet Review

### Review List

Columns:

- Employee name
- Timesheet period (week)
- Total hours
- Status (Pending Review)

Actions: View, Approve, Reject

### Review Detail

Shows the full timesheet grid for the selected employee:

- Same layout as the employee's weekly timesheet but read-only
- All time entries visible

Actions:

- Approve
- Reject (with mandatory rejection comment)

Approval hierarchy (single manager vs. multi-level) is **TBC**.

---

## 14. Reports

Currently identified report areas:

| Report | Description |
|---|---|
| Employee Time Summary | Hours logged per employee for a period |
| Project Hours | Total hours logged per project |
| Team Utilization | Hours per team member vs. available hours |
| Customer / Project Analysis | Time distribution across customers and projects |

Filters, date ranges, chart types and export options are **TBC**. The Figma design can propose a reasonable report layout, but detailed report specifications are not finalized.

---

## 15. Common UI Behaviour

- **Search:** Employee list, project list, customer list
- **Filters:** Status filters on lists (e.g., active/inactive employees, project status)
- **Validation messages:** Show inline field errors on forms. Show server-returned errors (e.g., duplicate code) clearly
- **Success / error feedback:** Toast or banner after create, update, delete
- **Loading states:** Skeleton or spinner while data loads
- **Empty states:** Helpful message when a list has no records
- **Confirmation:** Confirm before deactivating an employee, deleting a time entry, submitting a timesheet
- **Status indicators:** Colour-coded badges for timesheet status (Draft, Submitted, Pending Review, Approved, Rejected)
- **Tables:** Consistent table layout with sorting where useful
- **Forms:** Consistent form layout, clear labels, required-field indicators

---

## 16. Screen and API Dependency

| Screen | Required API | Status |
|---|---|---|
| Employee List | `GET /api/v1/employees` | **Implemented** |
| Add Employee | `POST /api/v1/employees` | **Implemented** |
| Employee Details | `GET /api/v1/employees/:id` | Planned |
| Edit Employee | `PATCH /api/v1/employees/:id` | Planned |
| Activate/Deactivate Employee | `PATCH /api/v1/employees/:id` | Planned (same endpoint) |
| Team List | `GET /api/v1/teams` | Planned |
| Create Team | `POST /api/v1/teams` | Planned |
| Edit Team | `PATCH /api/v1/teams/:id` | Planned |
| Customer List | `GET /api/v1/customers` | Planned |
| Add Customer | `POST /api/v1/customers` | Planned |
| Customer Details | `GET /api/v1/customers/:id` | Planned |
| Edit Customer | `PATCH /api/v1/customers/:id` | Planned |
| Project List | `GET /api/v1/projects` | Planned |
| Create Project | `POST /api/v1/projects` | Planned |
| Project Details | `GET /api/v1/projects/:id` | Planned |
| Edit Project | `PATCH /api/v1/projects/:id` | Planned |
| Task List | `GET /api/v1/projects/:id/tasks` | Planned |
| Create Task | `POST /api/v1/projects/:id/tasks` | Planned |
| Edit Task | `PATCH /api/v1/tasks/:id` | Planned |
| Activity List | `GET /api/v1/projects/:id/activities` | Planned |
| Add Activity | `POST /api/v1/projects/:id/activities` | Planned |
| Edit Activity | `PATCH /api/v1/activities/:id` | Planned |
| Time Entry | `POST /api/v1/time-entries` | Planned |
| Time Entry List | `GET /api/v1/time-entries` | Planned |
| Edit Time Entry | `PATCH /api/v1/time-entries/:id` | Planned |
| Delete Time Entry | `DELETE /api/v1/time-entries/:id` | Planned |
| Weekly Timesheet | `GET /api/v1/timesheets` | Planned |
| Submit Timesheet | `POST /api/v1/timesheets/:id/submit` | Planned |
| Manager Review List | `GET /api/v1/timesheets?status=pending` | Planned |
| Approve Timesheet | `POST /api/v1/timesheets/:id/approve` | Planned |
| Reject Timesheet | `POST /api/v1/timesheets/:id/reject` | Planned |
| Reports | `GET /api/v1/reports/*` | TBC |
| Dashboard | Multiple endpoints | TBC |
| Login | Keycloak integration | TBC |

**Notes:**

- Duplicate employee code/email check is part of `POST /api/v1/employees`. No separate API.
- Organization data is currently seeded. No create-organization API is planned for the initial version.
- Task and Activity APIs are nested under projects because they belong to a specific project.
- Report endpoints are TBC pending final report requirements.

---

## 17. Design Dependencies / TBC Items

These unresolved decisions could change the Figma design:

| # | Decision | Impact on UI |
|---|---|---|
| 1 | Department / Group / Team structure | May add a navigation level or grouping in team management |
| 2 | Employee–Team relationship (1:1 or 1:N) | Affects employee form (single team select vs. multi-select) |
| 3 | Employee–Project assignment model | Affects project detail screen and employee detail screen |
| 4 | Team–Project assignment | May add a team assignment section to project details |
| 5 | Task assignment to employees | Affects task form (assignee field) |
| 6 | Activity ownership (project-level or org-level) | Affects where activity management lives in the UI |
| 7 | Task requirement for time entry | Affects whether task dropdown is required or optional |
| 8 | Activity requirement for time entry | Affects whether activity dropdown is required or optional |
| 9 | Timesheet period configuration | Affects timesheet date range display |
| 10 | Timesheet generation (auto vs. manual) | Affects whether employee creates a timesheet or it exists automatically |
| 11 | Approval hierarchy (single vs. multi-level) | Affects review screen flow |
| 12 | Editing approved timesheets | Affects whether approved timesheets have an edit option |
| 13 | Final reporting requirements | Affects report screen layout, filters and charts |

---

## 18. Figma Screens

Screens to design, in priority order:

| # | Screen | Status |
|---|---|---|
| 1 | Login | TBC (Keycloak) |
| 2 | Dashboard (Admin) | Confirmed — layout TBC |
| 3 | Dashboard (Manager) | Confirmed — layout TBC |
| 4 | Dashboard (Employee) | Confirmed — layout TBC |
| 5 | Employee List | Confirmed |
| 6 | Add Employee | Confirmed |
| 7 | Employee Details | Confirmed |
| 8 | Edit Employee | Confirmed |
| 9 | Team List | Confirmed |
| 10 | Create / Edit Team | Confirmed |
| 11 | Team Members | Confirmed |
| 12 | Customer List | Confirmed |
| 13 | Add / Edit Customer | Confirmed |
| 14 | Customer Details | Confirmed |
| 15 | Project List | Confirmed |
| 16 | Create / Edit Project | Confirmed |
| 17 | Project Details (with tabs for tasks, activities) | Confirmed |
| 18 | Create / Edit Task | Confirmed |
| 19 | Activity Configuration (within project) | Confirmed |
| 20 | Time Entry | Confirmed |
| 21 | Weekly Timesheet | Confirmed |
| 22 | Manager Timesheet Review List | Confirmed |
| 23 | Manager Timesheet Review Detail | Confirmed |
| 24 | Reports | TBC — layout depends on final report specs |

Screens or sections that depend on TBC decisions:

- Department / Group management (depends on #1 above)
- Employee–Team assignment UI (depends on #2)
- Project assignment section (depends on #3, #4)
- Task assignee field (depends on #5)

---

## 19. Current Status

### Confirmed

- Organization → Team → Employee structure (Department/Group layer TBC)
- Customer → Project → Task → Activity work structure
- Employee time entry: project, task, activity, date, hours, remarks
- Weekly timesheet with Draft → Submitted → Pending Review → Approved flow
- Rejection with comment → Correction → Resubmit
- Dynamic project activities (data records, not schema changes)
- Zod-based validation on the backend
- Role-based access: Admin, Manager/Team Lead, Employee

### Implemented

- `GET /api/v1/employees` — returns all employees
- `POST /api/v1/employees` — creates employee with validation (required fields, org check, duplicate code/email check)
- PostgreSQL database with `organization` and `employee` tables
- Prisma 8 contract with Organization and Employee models
- NestJS backend with global `/api/v1` prefix
- One test organization seeded (ORG01)

### Planned

- `GET /api/v1/employees/:id`
- `PATCH /api/v1/employees/:id`
- Full CRUD for teams, customers, projects, tasks, activities
- Time entry and timesheet APIs
- Approval workflow APIs
- Report endpoints
- Frontend React application
- Keycloak authentication integration

### TBC

- Department / Group / Team hierarchy
- Employee–Team relationship (one team or multiple)
- Employee–Project assignment model
- Team–Project assignment
- Task assignment to employees
- Activity ownership scope
- Task and Activity mandatory requirement for time entry
- Timesheet period and generation
- Approval hierarchy
- Editing after approval
- Detailed report requirements
