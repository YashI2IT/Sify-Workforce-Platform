# Sify Workforce Platform

## Requirements

**Status:** In Progress

## 1. Purpose

The Sify Workforce Platform is an internal system for managing employees, teams, customers, projects, tasks, activities, time entries and timesheets.

The system should provide one place to manage project work and employee time tracking.

A key requirement is that project activities should be configurable without changing the database structure whenever a new activity is added.

---

## 2. Main Flow

### Organization

```text
Organization
    ↓
Team
    ↓
Employee
```

### Project Work

```text
Customer
    ↓
Project
    ↓
Task
    ↓
Activity
```

### Time Tracking

```text
Employee
    ↓
Time Entry
    ↓
Timesheet
    ↓
Manager Review
    ↓
Approve / Reject
```

---

## 3. Main Users

### Admin

- Manage organization details
- Manage employees and teams
- Manage user roles
- Configure organizational structure

### Manager / Team Lead

- Manage assigned projects
- Create tasks
- Configure project activities
- Assign employees or teams
- Review timesheets
- Approve or reject timesheets
- View reports

### Employee

- View assigned work
- View tasks and activities
- Add time entries
- Review timesheet
- Submit timesheet
- Correct rejected entries
- Resubmit timesheet

---

## 4. Functional Requirements

### Employee Management

The system should allow authorized users to:

- Add employees
- View employees
- Update employee details
- Activate or deactivate employees
- Assign employees to teams

### Team Management

The system should allow authorized users to:

- Create teams
- Update teams
- Assign employees
- Assign a manager or Team Lead

The exact Department, Group and Team structure is still to be confirmed.

### Customer Management

The system should allow authorized users to:

- Create customers
- View customers
- Update customer details
- Link customers with projects

### Project Management

The system should allow authorized users to:

- Create projects
- Update project details
- Link projects to customers
- Create tasks
- Configure activities
- Assign employees or teams

### Task Management

The system should allow users to:

- Create tasks under projects
- Update tasks
- Assign employees to tasks
- Track task status

### Activity Management

Activities should be configurable for each project.

Example:

```text
Project A
- Development
- Testing
- Deployment

Project B
- Client Meeting
- Documentation
- Review
```

Adding a new activity should not require a database schema change or new hard-coded field.

### Time Entry

Employees should be able to enter:

```text
Project
Task
Activity
Date
Hours
Remarks
```

The system should validate that the employee is allowed to use the selected project, task and activity.

### Timesheet

The current workflow is:

```text
Draft
  ↓
Submitted
  ↓
Pending Review
  ↓
Approved
```

If rejected:

```text
Pending Review
  ↓
Rejected
  ↓
Correction
  ↓
Resubmit
```

The current assumption is a weekly timesheet.

### Reporting

The system should provide reports such as:

- Employee time summary
- Project hours
- Team utilization
- Customer/project time summary

Detailed report requirements are still to be confirmed.

---

## 5. Business Rules

- Employees can record time only against work they are assigned or allowed to access.
- Project activities are configurable.
- New activities should not require database changes.
- Timesheets must be submitted before manager review.
- Managers can approve or reject submitted timesheets.
- Rejection should include a comment.
- Rejected timesheets can be corrected and resubmitted.
- Approved time should be available for reporting.
- Access to protected operations must be controlled by the backend.

---

## 6. Authentication

Keycloak will be used for user authentication and identity.

The application should use role-based access for:

```text
Admin
Manager / Team Lead
Employee
```

The final role and permission mapping is still to be confirmed.

---

## 7. Validation

The backend should validate:

- Required fields
- Employee and organization relationships
- Project and customer relationships
- Task and project relationships
- Activity and project relationships
- Employee access to project work
- Valid time entry data
- Valid timesheet status changes

---

## 8. Open Questions

The following points still need confirmation:

- Employee and Team relationship
- Employee and Project assignment
- Team and Project assignment
- Task assignment
- Department / Group / Team structure
- Activity ownership
- Whether Task is mandatory for time entry
- Whether Activity is mandatory for time entry
- Timesheet period
- Timesheet generation
- Approval hierarchy
- Editing after approval
- Final reporting requirements

---

## 9. Current Status

The main requirements and workflow have been identified.

Some business rules and relationships are still open and will be updated after discussion with the Team Lead.

**Next:** Confirm the open requirements and finalize the database and API design.