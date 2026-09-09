# Sify Workforce Platform

## Requirements

**Status:** Confirmed & Implementation Ready

## 1. Purpose and Scope

The Sify Workforce Platform is an internal system for managing employees, teams, customers, projects, tasks, activities, time entries, and timesheets.

The system provides one place to manage project work and employee time tracking. A key requirement is that project activities are configurable dynamically without changing the database structure whenever a new activity is added.

*Initial Scope Exclusions:* Notifications, payroll integration, billing, advanced analytics, complex approval chains, mobile applications, and SSO integrations (other than basic Keycloak mapping) are excluded from the initial version.

---

## 2. Functional Requirements

### Employee Management
The system must allow authorized users to:
- Add, view, and update employees.
- Deactivate (soft delete) employees.
- Validate duplicate employee code and email addresses during creation/update operations.
- Assign an employee to exactly one Team.

### Team Management
The system must allow authorized users to:
- Create, view, and update teams.
- Assign employees to a team.
- Assign a single manager / Team Lead per team.

*(Note: Department and Group entities are not part of the initial requirements.)*

### Customer Management
The system must allow authorized users to:
- Create, view, and update customers.
- Link customers to projects.

### Project Management
The system must allow authorized users to:
- Create, view, and update projects.
- Link projects to customers.
- Deactivate (soft delete) projects.
- Assign employees to projects directly (Employee ↔ Project many-to-many relationship).

### Task Management
The system must allow authorized users to:
- Create and update tasks under a specific project.
- Deactivate (soft delete) tasks.
- Track task status.

*(Note: There is no direct assignment of tasks to specific employees. Any employee assigned to the project can log time to active tasks.)*

### Activity Management
Activities must be configurable for each project and owned by the project.
Adding a new activity must not require a database schema change.
- The system must allow creating activities specific to a project.
- The system must allow deactivating (soft deleting) activities.

### Time Entry
Employees must be able to enter time with the following fields:
- Project (mandatory)
- Task (mandatory)
- Activity (mandatory)
- Date (mandatory)
- Hours (mandatory)
- Remarks (optional)

### Timesheet Requirements
- **Period:** Timesheets are based on a fixed weekly period (Monday to Sunday).
- **Generation:** Lazy generation. A "Draft" timesheet is automatically created upon an employee's first time entry for that week if it doesn't already exist.
- **Statuses:** `Draft` → `Submitted` → `Pending Review` → `Approved` or `Rejected`.

### Approval and Rejection Requirements
- **Submission:** Timesheets must be submitted by the employee before manager review.
- **Hierarchy:** Single-level manager approval based on the employee's assigned Team's manager.
- **Approval:** Approved timesheets become strictly read-only and cannot be edited.
- **Rejection:** Rejection occurs at the entire Timesheet level and requires a mandatory rejection comment. The timesheet reverts to a rejected state (draft equivalent) for correction and resubmission.

### Reporting Requirements
Approved time must be available for reporting. Core report areas:
- Manager Dashboard
- Employee Time Summary
- Project Hours
- Team Utilization
- Customer/Project time summary

### Audit and History Requirements
- Important timesheet workflow changes (submission, approval, rejection) must be logged.
- Historical records must be preserved. Projects, tasks, activities, and employees must use soft-deactivation to protect past timesheet data integrity.

---

## 3. Business Rules and Validations

- **Access Control:** Employees can record time only against active projects to which they are assigned.
- **Time Entry Strictness:** Both `Task` and `Activity` are strictly mandatory for all time entries.
- **Backend Validation:** Validation for duplicates (e.g. employee code) is handled natively within the entity's CREATE/UPDATE operation. No separate duplicate-check APIs are created.
- **Integrity:** Hard deletion of business entities that carry historical associations is prohibited.

---

## 4. Users and Roles

The application uses static role-based access control (RBAC):

1. **ADMIN**
   - Manage organization details, teams, employees, and roles.
2. **MANAGER**
   - Manage assigned projects, tasks, activities, and project assignments.
   - Review, approve, or reject team timesheets.
3. **EMPLOYEE**
   - View assigned projects, tasks, and activities.
   - Record time entries.
   - Submit and correct weekly timesheets.

---

## 5. Current Status

**Status:** Confirmed & Implementation Ready
All functional boundaries, rules, and relationships are aligned with the technical implementation decisions and ready for development.