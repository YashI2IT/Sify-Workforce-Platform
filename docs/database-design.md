# Sify Workforce Platform

## Database Design

**Status:** In Progress

### Purpose

This document contains the initial database structure for the Sify Workforce Platform. The structure may change after discussion with the Team Lead.

### Main Entities

#### Organization

Stores the organization details.

```text
id
name
code
createdAt
updatedAt
```

#### Team

Stores teams under an organization.

```text
id
organizationId
name
managerId
createdAt
updatedAt
```

#### Employee

Stores employee details.

```text
id
organizationId
employeeCode
name
email
isActive
createdAt
updatedAt
```

#### Customer

Stores customer details.

```text
id
name
code
createdAt
updatedAt
```

#### Project

Stores projects for customers.

```text
id
customerId
name
code
status
createdAt
updatedAt
```

#### Task

Stores tasks under a project.

```text
id
projectId
name
description
status
createdAt
updatedAt
```

#### Activity

Stores activities that can be selected for a project.

```text
id
projectId
name
description
isActive
createdAt
updatedAt
```

#### Time Entry

Stores the time logged by an employee.

```text
id
timesheetId
employeeId
projectId
taskId
activityId
date
hours
remarks
createdAt
updatedAt
```

#### Timesheet

Stores the timesheet for an employee.

```text
id
employeeId
periodStart
periodEnd
status
submittedAt
approvedAt
createdAt
updatedAt
```

#### Timesheet Audit

Stores important timesheet actions.

```text
id
timesheetId
actorId
action
comments
timestamp
```

### Main Relationships

```text
Organization
    ↓
Team
    ↓
Employee

Customer
    ↓
Project
    ↓
Task
    ↓
Activity

Employee
    ↓
Timesheet
    ↓
Time Entry
```

Current relationships:

- One organization can have multiple teams.
- One organization can have multiple employees.
- One customer can have multiple projects.
- One project can have multiple tasks.
- One project can have multiple activities.
- One employee can have multiple timesheets.
- One timesheet can have multiple time entries.

### Dynamic Activities

Activities are stored as records so that a project can have different activities.

Example:

```text
Project A
- Development
- Testing
- Deployment

Project B
- Client Meeting
- Documentation
- Requirement Analysis
```

Adding a new activity should not require a new database column.

### Time Entry

A time entry will contain the employee, project, task, activity, date, hours and remarks.

The backend should check that the selected project, task and activity are valid.

Whether task and activity should always be required is still to be confirmed.

### Timesheet

Current workflow:

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
Submitted
```

The exact timesheet period and approval process are still to be confirmed.

### Pending Decisions

The following points need Team Lead confirmation:

- Employee and Team relationship
- Employee and Project assignment
- Team and Project assignment
- Task assignment
- Department and Group structure
- Activity ownership
- Task/Activity requirement for time entry
- Timesheet period
- Timesheet generation
- Approval process

### Current Status

The main entities and basic relationships have been identified.

The database design will be updated based on the final requirements and Team Lead discussion.

**Next:** Finalize the pending relationships and then update the Prisma contract.