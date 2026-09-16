# UMS / Keycloak Integration — Complete Gap Analysis

**Date:** 2026-09-16  
**Prepared by:** Antigravity  
**For:** Team Lead Review

---

## 1. Executive Summary

The Sify Workforce Platform currently operates entirely in **Dev Mode** using a custom `DevBypassGuard` that accepts `x-dev-*` headers. This is intentional, documented, and is clearly a temporary arrangement pending UMS/Keycloak integration.

**The production authentication integration is NOT started yet on the backend.** No `JwtAuthGuard` exists. No Keycloak configuration exists anywhere in the codebase. The frontend login form, `authService`, and `apiClient` are wired correctly but have never been exercised because the UMS service (`localhost:3001`) is not running.

**There are two separate problems:**

1. **ENVIRONMENT PROBLEM:** UMS is not running locally. Nothing can be tested until it is.
2. **CODE GAP:** The backend has no JWT validation guard, and multiple critical configuration values (realm, issuer, JWKS URL, claims structure) are unknown.

This report identifies exactly what code is done, what is missing, and what must be asked of the Team Lead before implementation can continue.

---

## 2. Current Architecture

```
FRONTEND (React + Vite — localhost:5173)
    │
    ├── Login.tsx
    │   └── authService.ts → POST http://localhost:3001/api/user/login
    │
    └── apiClient.ts
        ├── Dev Mode:   sends x-dev-employee-id, x-dev-org-id, x-dev-roles
        └── Production: sends Authorization: Bearer <token>, x-org-id, x-app-id

BACKEND (NestJS — localhost:3000)
    │
    ├── DevBypassGuard (ACTIVE — Dev only, NODE_ENV=development)
    │   └── Reads x-dev-* headers, validates Employee in DB, creates AuthenticatedContext
    │
    └── JwtAuthGuard (MISSING — PENDING: "Replace with JwtAuthGuard when Keycloak contract is finalized")

DATABASE (PostgreSQL — localhost:5432)
    └── Sify Workforce data: Organization, Team, Employee, Project, Task, Activity, TimeEntry, Timesheet, etc.

UMS SERVICE (Not running — expected at localhost:3001)
    └── Keycloak-backed identity: Users, Organizations, Roles, Tokens
```

---

## 3. Current Authentication Flow

### Dev Mode (ACTIVE — what is currently running)
```
Browser
→ DevUserSelector (VITE_DEV_AUTH_BYPASS=true) picks employee from DB
→ Stores dev_employee_id, dev_org_id, dev_roles in sessionStorage
→ apiClient sends x-dev-* headers to backend
→ DevBypassGuard validates employee exists and is active in DB
→ Constructs request.user = { userId: 'dev:...', employeeId, organizationId, roles }
→ GetAuthContext() reads request.user → AuthenticatedContext
→ All protected routes function normally
```

### Production Mode (PLANNED — not implemented)
```
Browser
→ Login.tsx (email + password)
→ authService.login() → POST localhost:3001/api/user/login (x-app-id: project-management)
→ [BLOCKED: UMS not running]
→ Token received (accessToken, refreshToken)
→ [BLOCKED: response shape unknown]
→ Stored in localStorage (access_token, refresh_token, org_id)
→ apiClient sends Authorization: Bearer <token>, x-app-id, x-org-id
→ [BLOCKED: backend has no JwtAuthGuard]
→ [BLOCKED: no token validation, no claims extraction, no employee mapping]
→ AuthenticatedContext created
→ [BLOCKED: no implementation]
→ Protected routes
```

---

## 4. Current Implementation Inventory

| # | Area | Implementation | File | Complete? | Missing |
|---|------|---------------|------|-----------|---------|
| 1 | Login UI | Form with email + password, calls `authService.login()` | `frontend/src/features/auth/Login.tsx` | YES | No registration, no forgot password UI |
| 2 | UMS API client | `apiClient(endpoint, options, useAuthService=true)` with `x-app-id` header | `frontend/src/lib/apiClient.ts` | YES | — |
| 3 | Login request | `POST /user/login` with `{email, password}` and `x-app-id` header | `frontend/src/services/authService.ts` | YES | — |
| 4 | Login response handling | Extracts `accessToken`/`token` from `response` or `response.data` | `frontend/src/services/authService.ts` | PARTIAL | Response shape unknown; orgId always set to `null` |
| 5 | Access token handling | Stored in `localStorage['access_token']` | `frontend/src/lib/authUtils.ts` | YES | — |
| 6 | Refresh token handling | `POST /user/refresh-token` wired; refresh flow not triggered automatically | `frontend/src/services/authService.ts` | PARTIAL | No automatic refresh-on-expire; no interceptor |
| 7 | Logout | `POST /user/logout` with refreshToken, then Redux `logout()` | `frontend/src/components/layout/AppLayout.tsx` | YES | — |
| 8 | Token persistence/session | `localStorage` for access/refresh/orgId | `frontend/src/lib/authUtils.ts` | YES | — |
| 9 | Authorization header | `Authorization: Bearer <token>` added in production mode | `frontend/src/lib/apiClient.ts` | YES | — |
| 10 | `x-org-id` header | Sent from `localStorage['org_id']` | `frontend/src/lib/apiClient.ts` | YES | org_id is always `null` after login (not set) |
| 11 | Backend auth guard | `DevBypassGuard` only (dev mode) | `backend/src/auth/dev-bypass.guard.ts` | DEV ONLY | No `JwtAuthGuard` for production |
| 12 | JWT validation | **MISSING** | N/A | NO | Entire guard not implemented |
| 13 | Keycloak configuration | **MISSING** | N/A | NO | No realm, issuer, JWKS, clientId in codebase or env |
| 14 | UMS validation integration | **MISSING** | N/A | NO | UMS `/user/validate-token` not called by backend |
| 15 | AuthenticatedContext creation | Interface defined; only created by `DevBypassGuard` | `backend/src/auth/authenticated-context.ts` | DEV ONLY | Production creation missing |
| 16 | User ID mapping | `dev:${employee.id}` in dev mode | `backend/src/auth/dev-bypass.guard.ts` | DEV ONLY | UMS `userId` → `userId` field unknown |
| 17 | Employee mapping | **MISSING** | N/A | NO | How UMS User ID / email / sub maps to `Employee.id` is UNKNOWN |
| 18 | Organization mapping | **MISSING** | N/A | NO | How UMS orgId maps to Workforce `Organization.id` is UNKNOWN |
| 19 | Role mapping | **MISSING** | N/A | NO | How UMS `user-app-roles` map to ADMIN/MANAGER/EMPLOYEE is UNKNOWN |
| 20 | Current-user endpoint | `GET /organizations/current` (uses `auth.organizationId`) | `backend/src/organizations/organizations.controller.ts` | YES | Only works in dev mode today |
| 21 | Organization resolution | `OrganizationsService.getCurrentOrganization(organizationId)` | `backend/src/organizations/organizations.service.ts` | YES | Only works once AuthenticatedContext is set |
| 22 | Organization creation | Backend admin CRUD exists; no UMS-linked creation flow | N/A | PARTIAL | No onboarding wizard, no UMS sync |
| 23 | Organization selection/join | **MISSING** | N/A | NO | No UI or backend for "select existing org" after login |
| 24 | Dashboard protection | `ProtectedRoute` checks `isAuthenticated` from Redux | `frontend/src/routes/ProtectedRoute.tsx` | YES | Works in both dev and production paths |
| 25 | Dev bypass separation | VITE_DEV_AUTH_BYPASS flag, clearly isolated | All auth files | YES | Secure — clearly separated |
| 26 | Production security | Dev guard default-deny in production | `backend/src/auth/dev-bypass.guard.ts` | YES | x-dev-* headers are correctly ignored in production (`NODE_ENV !== development`) |

---

## 5. Exact Failure Point

**Connection attempt result (executed against running environment):**

```
curl.exe -v http://127.0.0.1:3001/api/user/login
→ connect to 127.0.0.1 port 3001: Connection refused
→ curl: (7) Failed to connect to localhost:3001 after 2037 ms
```

**FIRST FAILURE: UMS SERVICE UNAVAILABLE**

This is an **environment dependency**, not a code defect. The UMS service is not running locally on port 3001. No authentication can be tested until this is resolved.

The second failure (code gap) is that even if UMS becomes available, the backend has no production authentication guard and cannot validate any token.

---

## 6. Confirmed Configuration

The following configuration values are **documented and confirmed in the codebase**:

| Item | Confirmed Value | Source |
|------|----------------|--------|
| UMS base URL (code default) | `http://localhost:3001/api` | `frontend/src/config/env.ts` |
| Application ID | `project-management` | `frontend/src/config/env.ts`, `frontend/.env.local` |
| UMS header name | `x-app-id` | `docs/user-management-service-api-reference.md` |
| Org header name | `x-org-id` | `docs/user-management-service-api-reference.md` |
| Auth header format | `Authorization: Bearer <token>` | `docs/user-management-service-api-reference.md` |
| Login endpoint | `POST /user/login` with `{email, password}` | `docs/user-management-service-api-reference.md` |
| Token refresh endpoint | `POST /user/refresh-token` with `{refreshToken}` | `docs/user-management-service-api-reference.md` |
| Validate-token endpoint | `POST /user/validate-token` | `docs/user-management-service-api-reference.md` |
| UMS provider | `keycloak` | `docs/user-management-service-api-reference.md` |
| UMS supports orgs | Configurable via `usesOrgs` on app config | `docs/user-management-service-api-reference.md` |
| Workforce roles | ADMIN, MANAGER, EMPLOYEE | `docs/AI-PROJECT-CONTEXT.md`, `docs/implementation-decisions.md` |
| Backend auth context | `{ userId, employeeId, organizationId, roles[] }` | `backend/src/auth/authenticated-context.ts` |
| Token storage on frontend | `localStorage`: `access_token`, `refresh_token`, `org_id` | `frontend/src/lib/authUtils.ts` |
| Backend port | 3000 | `backend/.env` |
| Backend NODE_ENV | `development` | `backend/.env` |

---

## 7. Unknown Configuration

The following values are **required for implementation but not documented anywhere in the repository**:

| Item | Status | Where needed |
|------|--------|-------------|
| UMS actual environment URL (non-localhost) | UNKNOWN | Frontend `VITE_USER_MANAGEMENT_URL` env var |
| `project-management` app registered in UMS? | UNKNOWN | UMS `GET /app-auth-config/project-management` |
| `usesOrgs` setting for project-management | UNKNOWN | Determines org onboarding flow |
| Keycloak host / baseUrl | UNKNOWN | UMS app-auth-config |
| Keycloak Realm name | UNKNOWN | UMS app-auth-config; JWT `iss` claim prefix |
| Keycloak Client ID | UNKNOWN | UMS app-auth-config |
| JWT Issuer URL | UNKNOWN | Backend `JwtAuthGuard` validation |
| JWT Audience | UNKNOWN | Backend `JwtAuthGuard` validation |
| JWKS URL | UNKNOWN | Backend token signature verification |
| Token algorithm (RS256/HS256) | UNKNOWN | Backend token validation |
| JWT claim for `userId` | UNKNOWN | AuthenticatedContext construction |
| JWT claim for `organizationId` | UNKNOWN | AuthenticatedContext construction |
| JWT claim for roles | UNKNOWN | AuthenticatedContext construction |
| UMS login response shape | UNKNOWN | `authService.normalizeAuthResponse()` |
| UMS User → Workforce Employee mapping | UNKNOWN | Backend AuthenticatedContext |
| UMS Organization → Workforce Organization mapping | UNKNOWN | Backend AuthenticatedContext |
| UMS role name → ADMIN/MANAGER/EMPLOYEE mapping | UNKNOWN | Backend AuthenticatedContext |
| Who creates org in UMS vs Workforce | UNKNOWN | Onboarding flow |

---

## 8. User → Employee Mapping Status

**Status: UNKNOWN / NOT IMPLEMENTED**

The Workforce backend needs to map a UMS/Keycloak identity to a specific `Employee` row in the Workforce database. There are several possible mappings, none of which are documented:

| Candidate mapping | Status |
|------------------|--------|
| UMS `userId` → `Employee.id` (direct foreign key) | UNKNOWN — not documented |
| UMS `email` → `Employee.email` | UNKNOWN — not documented |
| UMS `username` → `Employee.employeeCode` | UNKNOWN — not documented |
| UMS user attribute `employeeId` → `Employee.id` | UNKNOWN — not documented |
| Separate lookup table (UMS userId ↔ Employee.id) | UNKNOWN — not implemented |

The `authUtils.ts` file explicitly blocks this:
```ts
export function getCurrentEmployeeId(): string {
  // We cannot resolve the employee ID from the JWT or company response yet.
  throw new Error('employee identity mapping unavailable');
}
```

**The Team Lead must specify the exact mapping before any backend auth implementation can proceed.**

---

## 9. Organization Mapping Status

**Status: UNKNOWN / NOT IMPLEMENTED**

Two separate organization records exist:
- **UMS Organization**: managed by UMS/Keycloak (`POST /organisations`, `orgId` is a string key)
- **Workforce Organization**: managed by Workforce DB (`Organization` table with UUID `id`)

It is not documented how these relate. Possibilities:

| Approach | Status |
|----------|--------|
| A. UMS orgId = Workforce Organization.id (same UUID) | UNKNOWN |
| B. Workforce stores a `umsOrgId` reference column | UNKNOWN — column does not exist |
| C. UMS orgId = Workforce Organization.code | UNKNOWN |
| D. They are fully separate with no direct link | UNKNOWN |

**No `umsOrgId` or equivalent foreign key exists on the Workforce `Organization` table.**

---

## 10. Role Mapping Status

**Status: UNKNOWN / NOT IMPLEMENTED**

Workforce uses three simple roles: `ADMIN`, `MANAGER`, `EMPLOYEE`.

UMS supports role management via `POST /role` and `POST /user-app-roles`. The role names in UMS are application-defined and could be anything. There is no documented mapping from UMS role names to Workforce role strings.

| Workforce Role | UMS/Keycloak equivalent | Status |
|---------------|------------------------|--------|
| ADMIN | UNKNOWN | UNKNOWN |
| MANAGER | UNKNOWN | UNKNOWN |
| EMPLOYEE | UNKNOWN | UNKNOWN |

**Note:** UMS `user-app-roles` stores one role per user per app. Workforce has exactly three roles. These are compatible in principle, but the exact role name strings used in UMS must be confirmed.

---

## 11. Database Responsibility

| Data | Authoritative Database | Notes |
|------|----------------------|-------|
| Username / Password | UMS / Keycloak | Never stored in Workforce DB |
| Access token / Refresh token | UMS / Keycloak | Frontend stores temporarily in localStorage |
| User registration | UMS | `POST /user` with email, password, username |
| UMS Organization | UMS | `POST /organisations` |
| UMS Roles | UMS | `POST /role`, `POST /user-app-roles` |
| Workforce Organization | Workforce DB | `Organization` table — business data |
| Employee record | Workforce DB | `Employee` table — links to Organization |
| Team | Workforce DB | `Team` table |
| Project / Task / Activity | Workforce DB | Business data |
| TimeEntry / Timesheet | Workforce DB | Business data |
| User→Employee link | **UNKNOWN** | Mapping responsibility not documented |
| Org→Org link | **UNKNOWN** | Mapping responsibility not documented |

**Key architectural question:** Should Workforce store a `umsUserId` on the `Employee` record, or should it look up employees by email at authentication time? This determines how `POST /user/validate-token` or JWT claims are mapped to an Employee row.

---

## 12. Security Review

### Current Dev Mode Security (PASS)
- `DevBypassGuard` is explicitly gated to `NODE_ENV === 'development' || NODE_ENV === 'test'`
- Returns `false` (deny) in production and for any unknown `NODE_ENV` value
- `x-dev-*` headers are **not read** when NODE_ENV is production
- Dev identity is validated against the actual database (not trusted blindly)
- `VITE_DEV_AUTH_BYPASS` is build-time, not runtime — cannot be injected by a client

### Production Security Status (PENDING)
- ✅ `DevBypassGuard` will deny all requests in production
- ✅ `x-dev-roles`, `x-dev-employee-id`, `x-dev-org-id` are safely ignored in production
- ❌ No `JwtAuthGuard` to replace `DevBypassGuard` — production will deny ALL requests
- ❌ No `x-org-id` ever set in production (it is set to `null` after login)
- ❌ Token is never validated by the backend
- ❌ No secrets are stored in source code (this is correct — keys just don't exist yet)

---

## 13. Team Lead Questions

### CRITICAL — Cannot proceed without these answers

**Q1. Is the UMS service running, and what is its URL?**
- Why: `localhost:3001` connection refused. Cannot test login.
- Used in: `frontend/src/config/env.ts` (`VITE_USER_MANAGEMENT_URL`)
- Need before coding: YES

**Q2. Has the `project-management` app been registered in UMS (`POST /app-auth-config`)?**
- Why: Login to UMS requires the app config to exist. Without it, `/user/login` returns an error.
- Used in: all UMS requests via `x-app-id: project-management`
- Need before coding: YES

**Q3. What is the `usesOrgs` setting for `project-management`?**
- Why: Determines whether `x-org-id` is required, and whether org-scoped flows apply.
- Used in: All authenticated UMS requests; onboarding flow design
- Need before coding: YES

**Q4. What is the Keycloak realm for `project-management`?**
- Why: The JWT `iss` (issuer) claim contains the realm URL. Backend cannot validate tokens without it.
- Used in: Backend `JwtAuthGuard` configuration
- Need before coding: YES

**Q5. What is the exact login response shape from UMS `/user/login`?**
- Why: `authService.normalizeAuthResponse()` searches multiple locations (`response.accessToken`, `response.token`, `response.data.accessToken`). The exact shape must be confirmed.
- Used in: `frontend/src/services/authService.ts`
- Need before coding: YES

**Q6. How does a UMS User map to a Workforce `Employee` record?**
- Why: The `AuthenticatedContext` requires `employeeId` (UUID). The JWT/UMS identity contains a `userId` (UMS user ID). The mapping is completely undocumented.
- Options to confirm:
  - Is `Employee.id` = UMS `userId`?
  - Is `Employee.email` = UMS `email`?
  - Is there a join table?
  - Should `Employee` gain a `umsUserId` column?
- Used in: Backend `JwtAuthGuard` identity resolution
- Need before coding: YES — **this is the most critical unknown**

**Q7. How does a UMS Organization map to a Workforce `Organization` record?**
- Why: `AuthenticatedContext.organizationId` must be a valid Workforce `Organization.id` (UUID). The UMS orgId is a string key, not necessarily a UUID.
- Used in: All organization-scoped backend operations
- Need before coding: YES

**Q8. What are the UMS role names for ADMIN, MANAGER, EMPLOYEE?**
- Why: Backend needs to translate UMS role names to Workforce role strings.
- Used in: `AuthenticatedContext.roles`
- Need before coding: YES

---

### IMPORTANT — Needed during implementation

**Q9. What JWT claim contains the `userId`?**
- Standard options: `sub`, `userId`, `id`, `email`
- Used in: `AuthenticatedContext.userId`

**Q10. What JWT claim contains the organization?**
- Standard options: `org`, `organizationId`, `groups`, or requires a UMS API lookup
- Used in: `AuthenticatedContext.organizationId`

**Q11. What JWT claim contains roles?**
- Standard options: `roles`, `realm_access.roles`, `resource_access.<clientId>.roles`
- Used in: `AuthenticatedContext.roles`

**Q12. Does the backend validate tokens by calling `POST /user/validate-token`, or by verifying the JWT signature directly using JWKS?**
- Why: Two different implementation patterns with different dependencies
- Option A (UMS validate): Simple, no JWKS setup needed, but adds latency and UMS dependency per request
- Option B (JWKS local verify): Faster, standard, but requires Keycloak JWKS URL and configuration

**Q13. Should there be an organization onboarding flow after first login?**
- Why: If a user logs in but has no Workforce organization, what should happen?
- The UMS reference shows end-to-end flow: `POST /app-auth-config` → `POST /organisations` → etc.

---

### OPTIONAL — Can be confirmed later

**Q14. Should the frontend show a registration page, or is user creation admin-only (`POST /user`)?**

**Q15. Should there be a "forgot password" flow in the frontend?**
- UMS supports `POST /user/forgot-password`

**Q16. Should token refresh be automatic (via interceptor) or manual (on next request)?**

---

## 14. Critical Blockers

| # | Blocker | Type | Unblocked By |
|---|---------|------|-------------|
| 1 | UMS service not running on localhost:3001 | ENVIRONMENT | Team Lead starts/provides UMS URL |
| 2 | `project-management` app may not be registered in UMS | ENVIRONMENT | Team Lead confirms/creates app config |
| 3 | No backend `JwtAuthGuard` implemented | CODE GAP | Requires answers to Q4, Q5, Q12 first |
| 4 | User→Employee mapping unknown | DESIGN GAP | Requires answer to Q6 — may require DB schema change |
| 5 | Organization mapping unknown | DESIGN GAP | Requires answer to Q7 |
| 6 | Role mapping unknown | DESIGN GAP | Requires answer to Q8 |
| 7 | `org_id` never set after login | CODE BUG | Requires knowing the org in the login response (Q5, Q7) |

---

## 15. Implementation Plan

**This sequence cannot start until the Critical Blockers above are resolved.**

```
STEP 1 (ENVIRONMENT — Team Lead action)
  Start / provide UMS service URL
  Confirm project-management app-auth-config exists in UMS
  Confirm Keycloak realm and client configuration

STEP 2 (ENVIRONMENT — Team Lead action)
  Create a test user in UMS via POST /user
  Assign user to org and role via POST /user-app-roles
  Perform manual login via POST /user/login and share (safe) response structure

STEP 3 (FRONTEND — CODE)
  Update authService.normalizeAuthResponse() based on confirmed login response shape
  Set orgId in authSlice after login using confirmed response field
  File: frontend/src/services/authService.ts

STEP 4 (BACKEND — DESIGN)
  Decide: Does backend call POST /user/validate-token (UMS proxy) or verify JWT locally (JWKS)?
  Based on Team Lead's answer to Q12

STEP 5 (BACKEND — CODE)
  Implement UmsJwtAuthGuard (or UmsValidateGuard) in backend
  Configure with: issuer, audience, JWKS (or UMS validate-token endpoint)
  Replace DevBypassGuard registration in app.module.ts (keep DevBypassGuard for dev)
  File: backend/src/auth/ums-jwt.guard.ts

STEP 6 (BACKEND — CODE, may require DB migration)
  Implement user→employee identity resolution
  Based on confirmed mapping (email lookup, umsUserId column, or other)
  File: backend/src/auth/ums-jwt.guard.ts (identity resolution section)

STEP 7 (BACKEND — CODE)
  Implement organization mapping
  Based on confirmed UMS orgId → Workforce Organization.id strategy
  File: backend/src/auth/ums-jwt.guard.ts (org resolution section)

STEP 8 (BACKEND — CODE)
  Implement role mapping
  Translate UMS role names → ['ADMIN'|'MANAGER'|'EMPLOYEE']
  File: backend/src/auth/ums-jwt.guard.ts (role resolution section)

STEP 9 (INTEGRATION TEST)
  Full flow: Login form → UMS → token → backend → AuthenticatedContext → /organizations/current
  Verify /dashboard loads correctly
  Verify x-dev-* headers are rejected in production mode

STEP 10 (OPTIONAL — ONBOARDING)
  If usesOrgs=true and org onboarding flow is needed:
  UI for org create/select/join after login
  Linked to UMS POST /organisations and Workforce Organization creation
```

---

## 16. Team Lead Demo Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIFY WORKFORCE PLATFORM                      │
│                 Authentication Architecture                     │
└─────────────────────────────────────────────────────────────────┘

    USER
     │  email + password
     ▼
┌──────────────────┐
│   KEYCLOAK       │  Company SSO / Identity Provider
│                  │  Stores: usernames, passwords, token signing keys
│  (managed by     │  Issues: Signed JWT tokens (RS256)
│   company IT)    │  Realm: [UNKNOWN — need from Team Lead]
└────────┬─────────┘
         │  JWT access token
         ▼
┌──────────────────┐
│   UMS SERVICE    │  User Management Service (http://localhost:3001/api)
│                  │  Manages: Users, Organizations, Roles, App configs
│  (project-       │  Validates: Keycloak tokens on behalf of apps
│   management)   │  Provides: /user/login → access_token + refresh_token
└────────┬─────────┘
         │  access_token (Bearer)
         │  x-app-id: project-management
         │  x-org-id: <org>
         ▼
┌──────────────────┐
│ SIFY WORKFORCE   │  NestJS Backend (http://localhost:3000/api/v1)
│    BACKEND       │
│                  │  Validates token (via JWKS or /user/validate-token)
│  [PENDING:       │  Resolves: UMS userId → Employee
│   JwtAuthGuard]  │  Resolves: UMS orgId → Organization
│                  │  Resolves: UMS role → ADMIN/MANAGER/EMPLOYEE
│                  │  Creates: AuthenticatedContext { userId, employeeId, organizationId, roles }
└────────┬─────────┘
         │  AuthenticatedContext
         ▼
┌──────────────────┐
│  WORKFORCE DB    │  PostgreSQL
│  (PostgreSQL)    │  Employee, Organization, Team, Project, Task, Activity
│                  │  TimeEntry, Timesheet
│                  │  Does NOT store passwords or tokens
└────────┬─────────┘
         │  organization + employee data
         ▼
┌──────────────────┐
│  ORGANIZATION    │  React Dashboard (http://localhost:5173)
│   DASHBOARD      │  Shows org/employee data scoped to authenticated user
└──────────────────┘
```

**What each layer does:**
1. **Keycloak**: Issues cryptographically signed tokens. Owns the user's password. The backend trusts its tokens by verifying the signature — it never needs to call Keycloak directly.
2. **UMS**: Company-level middleware managing which users belong to which app and org. The frontend logs in through UMS, not Keycloak directly. UMS wraps the Keycloak token flow.
3. **Sify Workforce Backend**: Receives the UMS token, validates it, and resolves the business identity (Employee, Organization, Role). It enforces all authorization rules.
4. **Workforce DB**: Stores all business data — employees, projects, timesheets. It does NOT duplicate UMS user/auth data.
5. **Organization Dashboard**: The React frontend, rendered with data scoped to the logged-in employee's organization.

---

*Report generated: 2026-09-16. Backend tests: 238/238 passing. Frontend build: passing. Dev Mode: fully operational.*
