# Sify Workforce Platform — Team Lead Auth Demo

**Date:** 2026-09-16  
**Prepared by:** Engineering  
**Status:** UMS Integration Implemented — E2E Verified ✅

---

## Demo Sequence

1. **Open Sify Workforce** → `http://localhost:5173`
2. **Login** with email and password on the login screen
3. **Keycloak/UMS authenticates** via `POST /user/login` (x-app-id: Project-Management)
4. **Access token obtained** — stored in localStorage, sent as `Authorization: Bearer <token>`
5. **Workforce backend receives authenticated request** → `UmsAuthGuard` activates
6. **Token validated** by calling `POST /user/validate-token` on UMS
7. **Employee resolved** — UMS `user.email` → `Employee.email` lookup in Workforce DB
8. **Role resolved** — UMS `user.role.roleName` → ADMIN / MANAGER / EMPLOYEE
9. **Organization resolved** — `Employee.organizationId` from Workforce DB
10. **Organization Dashboard opens** at `/dashboard`

---

## CURRENT BLOCKER

**NONE.** 

The integration works end-to-end. The temporary test account (`sifyworkforcedev@gmail.com`) was successfully provisioned in the Workforce database and linked to the UMS identity.

*Note for production:* For new users logging in via UMS, an `Employee` record must be pre-provisioned in the Workforce database with a matching email address via the Admin panel.

---

## WHAT I NEED FROM TEAM LEAD

1. **Role creation in UMS:** The test account (and all future accounts) **must** be explicitly assigned the `EMPLOYEE`, `MANAGER`, or `ADMIN` role in UMS. The previous fallback that silently granted Employee access to accounts with no roles has been removed for production security. Please confirm whether our app should use `usesOrgs=true` for role assignment.
2. **Organization mapping:** Verify if the current architecture (UMS `user.email` → Workforce `Employee` → `organizationId`) is the official pattern moving forward, or if UMS Organizations will eventually push `x-org-id` headers for downstream mapping.

---

## WHAT IS ALREADY WORKING

| Item | Status | Notes |
|------|--------|-------|
| UMS service reachable | ✅ CONFIRMED | `https://apidev.sifymodernization.digital/user-mgt/api` |
| `Project-Management` app registered | ✅ CONFIRMED | `usesOrgs` not used by Workforce auth |
| User creation (`POST /user`) | ✅ CONFIRMED | Status 201, user created |
| Login (`POST /user/login`) | ✅ CONFIRMED | Status 200, returns `data.accessToken` |
| Token validation (`POST /user/validate-token`) | ✅ CONFIRMED | Status 200, returns `data.valid: true` |
| Keycloak issuer | ✅ CONFIRMED | `http://1.6.37.35/keycloak/realms/Project-Management` |
| JWT claims structure | ✅ CONFIRMED | `sub`, `email`, `preferred_username`, `iss`, `aud` |
| Frontend `authService` | ✅ IMPLEMENTED | Uses confirmed `data.accessToken` response shape |
| Frontend `apiClient` | ✅ IMPLEMENTED | Attaches `Authorization: Bearer <token>` + `x-app-id: Project-Management` |
| Backend `UmsAuthGuard` | ✅ IMPLEMENTED | Validates via UMS, maps Employee by email |
| Role mapping | ✅ IMPLEMENTED | `ADMIN` / `MANAGER` / `EMPLOYEE` from UMS `roleName` |
| Refresh Token Flow | ✅ VERIFIED | Verified `POST /user/refresh-token` succeeds |
| Logout Flow | ✅ VERIFIED | Verified `POST /user/logout` hits UMS |
| E2E Authentication | ✅ VERIFIED | Successfully resolved Employee and reached Organization Dashboard via API |
| Dev Mode (`DevBypassGuard`) | ✅ PRESERVED | Still active for `NODE_ENV=development` |
| Production security | ✅ CONFIRMED | `x-dev-*` headers rejected in `NODE_ENV=production` |
| Backend tests | ✅ 249/249 passing | +11 new `UmsAuthGuard` tests |
| Frontend build | ✅ passing | No TypeScript errors |

---

## CONFIRMED UMS/KEYCLOAK CONFIGURATION

| Parameter | Value |
|-----------|-------|
| UMS Base URL | `https://apidev.sifymodernization.digital/user-mgt/api` |
| Application ID | `Project-Management` |
| Keycloak Host | `http://1.6.37.35/keycloak` |
| Keycloak Realm | `Project-Management` |
| Keycloak Issuer | `http://1.6.37.35/keycloak/realms/Project-Management` |
| JWT Audience | `Project-Management` |
| JWT Algorithm | `RS256` |
| JWKS URL | `http://1.6.37.35/keycloak/realms/Project-Management/protocol/openid-connect/certs` |
| User Identity Claim | `sub` (UUID = UMS user.id) |
| Email Claim | `email` |
| Token validation method | `POST /user/validate-token` (UMS proxy — no JWKS needed) |

---

## LIVE TEST ACCOUNT

| Field | Value |
|-------|-------|
| Email | `sifyworkforcedev@gmail.com` |
| Username | `sifyworkforcedev` |
| UMS User ID | `92d31679-633b-4763-ab7e-90d1e9329fa9` |
| Current UMS Role | None assigned (defaults to EMPLOYEE) |

> **Note:** Password not documented here per security policy.

---

## CONFIRMED USER → EMPLOYEE MAPPING

```
UMS Login
  └─ data.user.email  ──────────────────────────────────┐
                                                         ▼
                                               Employee.email (Workforce DB)
                                                         │
                                               Employee.organizationId ──► AuthenticatedContext.organizationId
                                               Employee.id             ──► AuthenticatedContext.employeeId
UMS validate-token
  └─ data.user.id (= Keycloak sub)            ──────────► AuthenticatedContext.userId
UMS user.role.roleName                        ──────────► AuthenticatedContext.roles[]
```

---

## ARCHITECTURE DIAGRAM

```
USER
 ↓ /register
┌─────────────────────────────────────────┐
│  UMS Registration (POST /user/)         │
└────────────────────┬────────────────────┘
                     │ Registration Success
                     ▼
USER
 ↓ /login (email + password)
┌─────────────────────────────────────────┐
│  KEYCLOAK / UMS                         │
│  Realm: Project-Management              │
└────────────────────┬────────────────────┘
                     │ JWT (accessToken, refreshToken, idToken)
                     ▼
┌─────────────────────────────────────────┐
│  WORKFORCE BACKEND (localhost:3000)      │
│  UmsAuthGuard:                          │
│  - Validate token signature             │
│  - Lookup Employee by email             │
│  - Extract Organization ID              │
│  - Require valid Role ('EMPLOYEE', etc) │
└────────────────────┬────────────────────┘
                     │ Authenticated Context
                     ▼
             DASHBOARD ACCESS
```

## Real End-to-End Flow Status

AUTHENTICATION: PASS
EMPLOYEE MAPPING: PASS
ROLE MAPPING: FAIL
ORGANIZATION: FAIL (UMS organization creation/query blocked)
DASHBOARD: FAIL

### Exact Blocker

A newly registered UMS user cannot be assigned a `Project-Management` role (e.g., ADMIN, MANAGER, EMPLOYEE) because the UMS role API strictly enforces an Organization context (`x-org-id`). There are no Organizations configured in UMS, and attempting to create one fails.

**Organization Check:**
- **Exact endpoint:** `GET /organisations/Project-Management`
- **HTTP status:** `200 OK`
- **Response:** `{"data": []}` (No organizations exist)

**Organization Creation Attempt:**
- **Exact endpoint failing:** `POST /organisations`
- **HTTP status:** `404 Not Found`
- **Safe error message:** `{"message":"Request failed with status code 404"}`
- **Cause:** UMS is returning a 404, likely because its internal request to sync the organization with Keycloak (`http://1.6.37.35/keycloak`) is failing.

**Current UMS Configuration:**
```json
{
  "appId": "Project-Management",
  "provider": "keycloak",
  "usesOrgs": true,
  "config": {
    "realm": "Project-Management",
    "baseUrl": "http://1.6.37.35/keycloak"
  }
}
```

**What is missing:**
The Keycloak realm `Project-Management` is either missing the Organizations feature, or the UMS Keycloak integration for organizations is misconfigured/broken. Because `usesOrgs=true` is enabled, the UMS role API is fully locked until organizations can be created.

### External Action Required

**Team Lead / UMS Administrator must clarify/fix:**
1. **UMS / Keycloak Organization Sync:** Fix the `404` error occurring when UMS attempts to create an organization in Keycloak.
2. **Organization Data Flow:** Once organizations can be created in UMS, how are they intended to be provisioned? Does the Workforce backend sync them to UMS, or does a Keycloak Admin create them manually?
3. **Role Assignment Strategy:** Does the UMS automatically assign a default role and organization upon registration, or must this be orchestrated by a Keycloak admin manually before the user logs in?
