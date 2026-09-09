# Sify Workforce Platform

## API Design

**Status:** Confirmed & Implementation Ready

### API Conventions

The Sify Workforce Platform backend uses a strict, consistent REST-oriented API architecture.

1. **Base Path:** All APIs are versioned under `/api/v1`.
2. **Resource Naming:** Standard plural nouns for resources (e.g., `/employees`, `/projects`).
3. **HTTP Methods:**
   - `GET`: Retrieve single or lists of resources.
   - `POST`: Create new resources.
   - `PATCH`: Update existing resources (partial updates).
   - `DELETE`: Rarely used. Soft-deletes (updating `isActive: false` via `PATCH`) are preferred to preserve historical data integrity.
4. **Validation:** All incoming request bodies are validated using Zod schemas at the controller layer.
5. **Conflict Handling:** Duplicate data constraints (e.g., duplicate employee code or email) are validated natively inside the `POST` or `PATCH` operation, returning a standard `409 Conflict`. **No separate duplicate-check endpoints are created.**
6. **Error Responses:** Standard HTTP status codes (400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict).

---

### Main API Resource Groups (Planned System)

The following resource boundaries reflect the complete platform workflow. 

*(Note: The system does not require, and will not implement, endpoints for Departments, Groups, Team-Project assignments, or Task-Employee assignments.)*

- `/organizations`
- `/teams`
- `/employees`
- `/customers`
- `/projects`
- `/projects/:id/assignments` (For mapping Employees to Projects)
- `/tasks`
- `/activities`
- `/time-entries`
- `/timesheets`
- `/reports`

---

### Current Implementation Status

The project is being implemented incrementally.

#### CURRENTLY IMPLEMENTED

**Employee API**
- `GET    /api/v1/employees` - List employees
- `POST   /api/v1/employees` - Create an employee
- `GET    /api/v1/employees/:id` - Get employee by ID
- `PATCH  /api/v1/employees/:id` - Update an employee

*Implementation Details:*
- Validates required fields using Zod.
- Checks organization existence.
- Native duplicate employee code/email check returns `409 Conflict`.
- Updates ignore attempts to change the `organizationId`.
- OpenAPI/Swagger documented at `/api/docs`.

#### PLANNED / REQUIRED FOR FUTURE MODULE IMPLEMENTATION

All other API resource groups (`/teams`, `/projects`, `/timesheets`, etc.) are planned for future incremental development using the exact same REST, validation, and error-handling conventions established by the Employee module.