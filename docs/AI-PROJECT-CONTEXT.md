SIFY WORKFORCE PLATFORM — MASTER PROJECT CONTEXT
READ THIS FIRST AND FOLLOW IT FOR ALL FUTURE TASKS.

Project: Sify Workforce Platform
Path: D:\Sify Workforce Platform

Purpose:
Enterprise internal workforce/project/timesheet platform for ~7,000 employees.
The goal is maintainable, secure, professional, MNC-grade software — not a demo/student project.

CURRENT ARCHITECTURE — DO NOT CHANGE WITHOUT EXPLICIT REQUEST

Organization
├── Team
│   └── Employee
│
└── Project
    ├── Task
    └── Activity

Employee ↔ Project

Time workflow:
Project → Task → Activity → TimeEntry → Timesheet → Manager Approval

V1 BUSINESS RULES
- No Customer
- No Department
- No Group
- No TeamProject entity
- No TaskEmployee entity
- No Project Owner role
- Tasks and Activities belong to Projects
- Employees are assigned to Projects through EmployeeProject
- TimeEntry requires Project + Task + Activity
- Employee can log time only against assigned active projects
- Weekly Timesheet = Monday–Sunday
- First valid TimeEntry automatically creates the week Timesheet if missing
- States: DRAFT → SUBMITTED → APPROVED
- SUBMITTED → REJECTED
- REJECTED → SUBMITTED
- APPROVED is terminal/read-only
- Rejection requires a comment
- One-level manager approval
- Manager = Team.managerId
- Manager can access managed-team data only
- Historical records should remain traceable; deactivate instead of destructive deletion where applicable

ROLES
- EMPLOYEE
- MANAGER
- ADMIN

API
- Base: /api/v1
- REST
- Do not invent duplicate or unnecessary endpoints
- Backend authorization is authoritative
- Frontend role hiding is UX only, never security

TECH STACK
Backend:
- NestJS 12
- TypeScript
- Zod
- PostgreSQL 18.6
- Prisma 8 RC
- @prisma/orm-postgres
- @prisma/cli-engine

Frontend:
- React + TypeScript + Vite
- Tailwind
- Redux Toolkit
- React Router
- Zod
- native fetch through existing apiClient
- Do not introduce React Query unless explicitly requested

PRISMA RULES
- Do NOT use new PrismaClient()
- Use existing db.orm.public.Model...
- Keep prisma.config.ts unchanged unless necessary
- contract file is src/prisma/contract.prisma
- contract workflow:
  npm run contract:emit
  npx prisma db update
  npx prisma db verify
  npx prisma db schema
- Do NOT run destructive/reset migrations
- Do NOT use npm audit fix --force

AUTH
Production authentication will eventually use company UMS/Keycloak.
Current development uses DevUserSelector / dev bypass.
Production must NEVER trust client-supplied role spoofing.
x-dev-* headers are development-only and must not be honored in production.

CURRENT STATUS
- Employee experience QA: PASSED
- Manager functional QA: PASSED
- Manager 768px responsive issue fixed
- Reports implemented
- Approval lifecycle tested:
  SUBMITTED → REJECTED → RESUBMITTED → APPROVED
- Manager dashboard/team reporting functional
- Backend tests currently 238/238 passing
- Frontend build passing

KNOWN QA DATA
- EMP004 / Postman Test Employee is managed by Manager
- Manager dashboard currently has 1 managed team member
- Approved team hours include 11.5h after QA workflow
- Some stale future QA timesheets may exist; do not treat them as application defects without verification

IMPORTANT DESIGN DIRECTION
Current application works functionally but visually feels too basic/student-like.
Next phase is to make it feel like a mature enterprise workforce/time-tracking product inspired by products such as:
- Zoho
- Jira/Tempo
- Microsoft Project/timesheets
- Kimai
- Clockify
- modern enterprise SaaS dashboards

Use these products only as UX inspiration.
Do NOT copy branding, proprietary UI, or unrelated features.

NEXT PRODUCT PHASE
Improve all 3 role experiences:
1. Employee
2. Manager
3. Admin

Priority:
- Reduce user effort
- Faster time logging
- Better weekly timesheet experience
- Better approvals
- Better visibility
- Better dashboards
- Better filtering/search
- Better responsive UX
- Better empty/loading/error states
- Better navigation and information hierarchy

Planned future areas:
- richer dashboards
- weekly timesheet/grid
- calendar/time views
- quick/duplicate/repeat time entry
- timers where useful
- missing-timesheet indicators
- approval queues
- team visibility
- reports
- settings
- documentation
- public product website

DO NOT prematurely add:
- billing/invoices
- customer management
- expenses
- HR/payroll
- complicated workflow engines
- unnecessary entities
- architecture rewrites

IMPLEMENTATION PRINCIPLES
- First inspect existing code and API contracts
- Reuse existing components and patterns
- Make the smallest correct change
- Do not modify backend logic for a UI-only problem
- Do not modify database schema unless the requirement genuinely needs it
- Preserve existing working workflows
- Maintain role/security boundaries
- Do not silently change business rules
- Do not claim PASS unless actually verified
- Distinguish:
  EXECUTED — PASS
  EXECUTED — FAIL
  STATIC REVIEW — FINDING
  NOT EXECUTED
  NOT APPLICABLE
- Run relevant tests/build after changes
- Keep changes focused and reviewable
- Never create unnecessary temporary/debug files
- Never expose secrets

CURRENT DEVELOPMENT MODE
Frontend: localhost:5173
Backend: localhost:3000

WORKING STYLE FROM NOW ON
Use SMALL TASKS.
For each request:
1. Inspect only relevant files
2. Explain the finding briefly
3. Make the smallest necessary change
4. Run targeted validation
5. Report exactly what changed and whether validation passed
6. STOP

Do not perform unrelated cleanup or redesign unless explicitly requested.

When I give you a task, assume all architecture and business rules above already apply.
Do not ask me to repeat them unless the requested change conflicts with them.