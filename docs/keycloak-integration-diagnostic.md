# UMS / Keycloak Integration Diagnostic

## 1. Target Authentication Flow
User Opens Sify Workforce → UMS / Keycloak Authentication → Login / Register → Authenticated Identity → Organization Availability Check → Create OR Select / Join Organization → Organization Context Loaded → Organization Dashboard.

## 2. Current Implementation
- **Frontend**: `Login.tsx` captures credentials and calls `authService.ts`. `authService.ts` makes a POST to `http://localhost:3001/api/user/login` (UMS). `apiClient.ts` handles attaching the `Bearer` token to protected requests.
- **Backend**: Currently relies entirely on `DevBypassGuard` (using `x-dev-*` headers) when in development. There is no production `JwtAuthGuard` or token validation logic implemented.

## 3. Configuration Used
- **UMS Base**: `http://localhost:3001/api`
- **Application ID**: `project-management`
- **Issuer**: UNKNOWN
- **Audience**: UNKNOWN
- **JWKS URL**: UNKNOWN
- **Token Structure / Claims**: UNKNOWN (No explicit schema for employee mapping documented).

## 4. Stage-by-Stage Trace
| Stage | Code Location | Expected | Actual | Status |
|------|---------------|----------|--------|--------|
| Frontend Login | `frontend/src/features/auth/Login.tsx` | Send `{email, password}` | Sends credentials correctly | PASS |
| apiClient / UMS Call | `frontend/src/services/authService.ts` | Reach UMS `/user/login` | Fails with `ERR_CONNECTION_REFUSED` | **FAIL** |
| token/session storage | `frontend/src/lib/authUtils.ts` | Store `accessToken` | Blocked by UMS failure | UNKNOWN |
| backend protected req | `frontend/src/lib/apiClient.ts` | Attach `Bearer <token>` | Attaches token correctly | PASS |
| authentication guard | `backend/src/app.module.ts` | Global `JwtAuthGuard` | Missing (`// PENDING: Replace with JwtAuthGuard`) | **FAIL** |
| token validation | Backend Guard (Missing) | Verify token signature/claims | No validation code exists | **FAIL** |
| AuthenticatedContext | `backend/src/auth/authenticated-context.ts` | Build context from claims | Blocked / Missing mapping | **FAIL** |
| employee resolution | Backend Guard (Missing) | Find employee by claim | Blocked / Missing mapping | **FAIL** |
| organization resolution | Backend Guard (Missing) | Find org by claim | Blocked / Missing mapping | **FAIL** |

## 5. First Failing Stage
UMS login returns a connection error because the UMS Service is unreachable.

## 6. Exact Error
`curl: (7) Failed to connect to localhost:3001 after 2246 ms: Connection refused`

## 7. Root Cause
The external User Management Service (UMS) is not running or not exposed on `localhost:3001`. Additionally, the backend lacks the `JwtAuthGuard` and identity resolution logic because the Keycloak token claims contract has not been finalized.

## 8. Required External Information / Dependency
To implement backend token validation, the following missing information is required:
1. UMS Service availability.
2. The Keycloak Realm, Issuer URL, and JWKS URL.
3. The exact claim mapping for `userId`, `employeeId`, `organizationId`, and `roles`. (The documentation shows user profiles, but does not explicitly document the structure of the JWT claims returned to the application).

## 9. Files Involved
- `frontend/src/features/auth/Login.tsx`
- `frontend/src/services/authService.ts`
- `frontend/src/lib/apiClient.ts`
- `backend/src/app.module.ts`
- `backend/src/auth/dev-bypass.guard.ts`

## 10. Recommended Next Fix
1. Ensure the UMS Service is running locally on port 3001 for development.
2. Provide the backend with the exact Keycloak JWT configuration (Issuer, Audience, JWKS) and token claims structure.
3. Implement `JwtAuthGuard` in the backend to validate tokens and construct the `AuthenticatedContext`.

## 11. What Already Works
- The frontend UI successfully collects credentials and prepares the request.
- `apiClient` correctly intercepts requests and attaches the `Bearer` token and `x-app-id` header in production mode.
- Dev Mode (`DevBypassGuard`) remains fully functional and isolated for testing without UMS.

## 12. What Does Not Work
- UMS integration (Service is down).
- Backend JWT validation (Not yet implemented).
- Employee and Organization resolution from JWT (Mapping unknown).

================================================
TEAM LEAD SUMMARY
================================================

TEAM LEAD CHECKPOINT

Current flow:

User
→ Login
→ UMS
→ Token
→ Backend
→ Employee
→ Organization
→ Dashboard

Status:

1. UMS reachable: FAIL
2. Login contract: PASS
3. Token received: FAIL
4. Token attached to backend: PASS
5. Token validation: FAIL
6. Employee mapping: FAIL
7. Organization mapping: FAIL
8. Role mapping: FAIL
9. Organization Dashboard: FAIL

FIRST FAILURE:
UMS REACHABILITY

ERROR:
UMS SERVICE UNAVAILABLE

ROOT CAUSE:
The User Management Service (UMS) is not running locally (Connection refused on localhost:3001). Furthermore, backend token validation is completely absent due to missing Keycloak JWT configuration (Issuer, JWKS, and Claims structure).

BLOCKER:
Please ensure UMS is running on port 3001. Additionally, provide the exact Keycloak configuration (Issuer URL, JWKS) and document the exact JWT claims structure so the backend `JwtAuthGuard` can map identities correctly.
