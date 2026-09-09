# Sify Workforce Platform

## Implementation Decisions

**Status:** Finalized for V1
**Author:** SDE Intern
**Date:** 2026-09-09

This document outlines the practical, first-release implementation decisions for the Sify Workforce Platform. These decisions resolve previously identified "TBC" (To Be Confirmed) items in a way that minimizes complexity, preserves the existing architecture, and satisfies the core business requirements.

---

### 1. Organization Structure

**Initial decision:** Flatten the structure to `Organization → Team → Employee`. Do not implement Department or Group layers.
**Reason:** Keeps the database schema and UI simple for the first release. Teams are sufficient for grouping employees under a manager.
**Impact:** No `Department` or `Group` tables/APIs. The `Team` model links directly to the `Organization`.

### 2. Employee-Team Relationship

**Initial decision:** 1:N relationship. One Employee belongs to one Team.
**Reason:** Simplest approach. A team has one manager, making timesheet approval routing straightforward and unambiguous.
**Impact:** Add `teamId` to the `Employee` model. No separate junction table is needed.

### 3. Employee-Project Relationship

**Initial decision:** Employees are assigned directly to Projects (`ProjectAssignment`).
**Reason:** Provides granular control over who can log time to what project, avoiding complex team-based access rules where only some team members work on a project.
**Impact:** Requires a `ProjectAssignment` many-to-many relationship table linking `Employee` and `Project`.

### 4. Team-Project Relationship

**Initial decision:** Do not assign Teams to Projects.
**Reason:** Assigning at the employee level handles all cases simply. Team assignment adds unnecessary complexity to time entry validation.
**Impact:** No `TeamProject` relationship table will be created.

### 5. Task Assignment

**Initial decision:** Tasks are NOT assigned to individual employees.
**Reason:** Simplifies project setup. Anyone assigned to a Project can log time against any active Task within that project. Strict task assignment is often too rigid for simple time-tracking workflows.
**Impact:** No `TaskAssignment` table or `employeeId` field on `Task`.

### 6. Activity Ownership

**Initial decision:** Activities are owned by the Project.
**Reason:** The requirements specify that activities are configurable per project (e.g., Project A has "Development", Project B has "Client Meeting").
**Impact:** The `Activity` table requires a `projectId` foreign key.

### 7. Time Entry Requirements

**Initial decision:** Both `Task` and `Activity` are mandatory for all time entries.
**Reason:** Ensures high-quality reporting data. The UI can handle this smoothly with cascading dropdowns (select Project → select Task → select Activity).
**Impact:** `taskId` and `activityId` will be enforced as `required` fields on the `TimeEntry` schema and database model.

### 8. Timesheet Period

**Initial decision:** Fixed weekly period (Monday to Sunday).
**Reason:** Easiest to implement, standard business practice, and maps perfectly to the requested weekly UI grid.
**Impact:** Timesheet records will have standard `periodStart` (Monday date) and `periodEnd` (Sunday date) fields.

### 9. Timesheet Generation

**Initial decision:** Automatic creation upon first time entry (lazy generation).
**Reason:** Avoids complex background cron jobs that auto-generate empty timesheets for every employee.
**Impact:** The `POST /api/v1/time-entries` API will automatically create a "Draft" Timesheet if one doesn't exist for that week for that employee.

### 10. Approval Flow

**Initial decision:** Single-level manager approval.
**Reason:** Simplest approval hierarchy. The timesheet goes to the manager of the employee's current Team.
**Impact:** Routing logic just looks up `employee.team.managerId`. No complex approval matrix configuration required.

### 11. Rejection Flow

**Initial decision:** Rejection applies to the entire Timesheet, not individual time entries.
**Reason:** Keeps the state machine simple (`Draft` → `Submitted` → `Pending Review` → `Approved` or `Rejected`).
**Impact:** A rejection comment is stored on the Timesheet record, and the timesheet status reverts to `Rejected` (equivalent to Draft for editing).

### 12. Approved Timesheet Editing

**Initial decision:** Approved timesheets cannot be edited by anyone.
**Reason:** Ensures data integrity for reports and downstream billing. Any adjustments must be handled via manual overrides outside the system for V1.
**Impact:** Strict backend validation to block any `PATCH /api/v1/time-entries/:id` if the parent timesheet `status === 'APPROVED'`.

### 13. Soft Delete vs Hard Delete

**Initial decision:** Soft delete (deactivation) for Employees, Projects, Tasks, and Activities.
**Reason:** Hard deletes would orphan historical Time Entries and Timesheets, breaking past reports and audit trails.
**Impact:** Use an `isActive` boolean flag instead of SQL `DELETE` statements. Applicable GET APIs should filter by `isActive: true` by default.

### 14. Role Responsibilities

**Initial decision:** Static RBAC with 3 roles: `ADMIN`, `MANAGER`, `EMPLOYEE`.
**Reason:** Simple enough to map directly to Keycloak or internal tokens without a complex permission schema.
**Impact:** Roles will be managed via JWT claims or a simple `role` enum on the `Employee` model.

### 15. API Design Principles

**Initial decision:** Standardize on RESTful conventions mirroring the already implemented Employee module.
**Reason:** Maintains consistency, readability, and predictability.
**Impact:** All modules will use Plural nouns, `GET`/`POST`/`PATCH`/`DELETE` methods, Zod for validation, and standard HTTP status codes (e.g., 409 for conflicts, 404 for not found).

### 16. Customer Entity

**Initial decision:** Customer is not a separate entity in V1. Project belongs directly to Organization.
**Reason:** Technical Lead confirmed that Customer should be removed from V1 architecture.
**Impact:** No Customer table or API. Project requires an `organizationId`.

---

## Implementation Principles

These practical rules must be followed while implementing the rest of the system:

1. **Validate on the backend:** Do not trust the client. Enforce all business rules (e.g., project assignment, timesheet status) in the service layer using Zod schemas and Prisma queries.
2. **Keep database constraints for critical uniqueness/integrity:** Rely on PostgreSQL `UNIQUE` constraints and foreign keys as the ultimate safety net.
3. **Do not create separate APIs for validation checks:** Duplicate checks (e.g., duplicate project code) must happen inside the `POST` or `PATCH` operation itself, returning a `409 Conflict`.
4. **Use existing relationships instead of duplicating data:** Navigate relationships (e.g., `Employee → Team → Manager`) rather than storing redundant manager IDs on the timesheet.
5. **Keep configurable activities as data:** Never add new columns to the database for new activities. Activities are rows in the `Activity` table linked to a project.
6. **Preserve historical records:** Never hard-delete projects, tasks, or activities that have time logged against them.
7. **Use soft deactivation:** Use `isActive: false` to hide obsolete data from new dropdowns while keeping it available for past timesheets and reports.
8. **Keep API behavior consistent across modules:** All modules should follow the exact same architectural pattern established in the `EmployeesService` and `EmployeesController` (no complex response envelopes, direct Prisma `db.orm` queries).
