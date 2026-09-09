# Sify Workforce Platform

## Database Design

**Status:** Confirmed & Implementation Ready

### Purpose

This document contains the finalized conceptual database structure for the Sify Workforce Platform, supporting the confirmed workflow and implementation decisions.

---

### Main Entities

#### Organization
Stores the top-level organization details.
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
teamId
employeeCode
name
email
role
isActive
createdAt
updatedAt
```

#### Project
Stores projects under an organization.
```text
id
organizationId
name
code
status
isActive
createdAt
updatedAt
```

#### Project Assignment
Maps the many-to-many relationship between Employees and Projects.
```text
id
employeeId
projectId
assignedAt
isActive
```

#### Task
Stores tasks under a project.
```text
id
projectId
name
description
status
isActive
createdAt
updatedAt
```

#### Activity
Stores activities configured specifically for a project.
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
Stores the weekly timesheet for an employee.
```text
id
employeeId
periodStart
periodEnd
status
rejectionComment
submittedAt
approvedAt
createdAt
updatedAt
```

#### Timesheet Audit
Stores important timesheet actions for history.
```text
id
timesheetId
actorId
action
comments
timestamp
```

---

### Conceptual Relationships

**Organization Hierarchy**
```text
Organization
    ↓ (1:N)
Team
    ↓ (1:N)
Employee
```

**Project Structure**
```text
Organization
    ↓ (1:N)
Project
    ↓ (1:N)
Task

Project
    ↓ (1:N)
Activity
```

**Assignment & Time Tracking**
```text
Employee ↔ Project Assignment ↔ Project

Employee
    ↓ (1:N)
Timesheet
    ↓ (1:N)
Time Entry
```

**Important Cardinality & Integrity Rules:**
- One Employee belongs to exactly one Team.
- `Employee ↔ Project` is a direct many-to-many assignment. (Team-level project assignment is excluded).
- Tasks and Activities belong directly to Projects. Tasks are NOT assigned to individual employees.
- Time Entries have mandatory foreign keys to `Employee`, `Project`, `Task`, and `Activity`.
- Hard deletions are avoided. Deactivation flags (`isActive`) must be used for Employees, Projects, Tasks, and Activities to preserve the integrity of historical Timesheets and Time Entries.

---

### Dynamic Activities

Activities are stored as records linked to a specific project. 

Example:
```text
Project A
- Development
- Testing

Project B
- Client Meeting
- Documentation
```
Adding a new activity requires inserting a row into the `Activity` table with the respective `projectId`, eliminating the need for database schema changes.

---

### Timesheet State Machine

Timesheets follow a strict weekly period (Monday to Sunday) and a defined state machine:

**Approval Flow:**
```text
Draft
  ↓ (Submit)
Submitted
  ↓ (System/Review)
Pending Review
  ↓ (Manager Decision)
Approved
```

**Rejection Flow:**
```text
Pending Review
  ↓ (Manager Decision + Comment)
Rejected
  ↓ (Employee Correction)
Draft/Correction
  ↓ (Resubmit)
Submitted
```

---

### Current Implementation Status

While this document describes the complete conceptual data model required for the platform, the backend is being implemented incrementally.

**Currently Implemented in Database:**
- Core Prisma ORM Setup (Prisma 8)
- Employee Model (partial/incremental implementation schema)

*(Note: The actual Prisma `contract.prisma` may currently reflect only the incrementally completed subset of this conceptual design. The conceptual design remains the target for the final implementation.)*