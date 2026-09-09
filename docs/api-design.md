# Sify Workforce Platform

## API Design

**Status:** In Progress

### API Base Path

`/api/v1`

### Main APIs

- `/organizations`
- `/teams`
- `/employees`
- `/customers`
- `/projects`
- `/tasks`
- `/activities`
- `/time-entries`
- `/timesheets`
- `/reports`

### Employee API

Implemented:

- `GET /api/v1/employees`
- `POST /api/v1/employees`

Validation includes required fields, organization check, and duplicate employee code/email check.

The APIs have been tested successfully with the PostgreSQL database.

### Next

- `GET /api/v1/employees/:id`
- `PATCH /api/v1/employees/:id`

Other APIs will be implemented after confirming the remaining requirements.