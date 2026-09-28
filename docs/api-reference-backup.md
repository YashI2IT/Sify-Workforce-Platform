# User Management Service — API Reference

## Base URL

```bash
http://localhost:3001/api
```

## Auth and tenant headers

| Header | Required | Description |
|---|---|---|
| `x-app-id` | Yes | App ID used to resolve app configuration. Example: `FormBuilder` |
| `x-org-id` | Conditional | Required for org-based apps when `usesOrgs=true` |
| `Authorization` | Yes for protected routes | Bearer token from the user login flow |

## Keycloak notes

This service is built to work with Keycloak-backed identity and organization management.

- App provider is resolved by `AUTH_PROVIDER` and defaults to `keycloak`
- `baseUrl` is typically the Keycloak host with a context path such as `/keycloak`
- Realm is resolved from the app config
- Organizations are realm-scoped and are created/synced through the app’s Keycloak provider

Example config:

```json
{
  "provider": "keycloak",
  "config": {
    "baseUrl": "http://1.6.37.35/keycloak",
    "realm": "Form-Builder",
    "adminUsername": "admin",
    "adminPassword": "admin"
  }
}
```

---

## 1. App auth config

These routes are defined in `src/route/appAuthConfigRoute.ts`.

### Create app config

```http
POST /app-auth-config
```

Body example:

```json
{
  "appId": "FormBuilder",
  "appName": "Form Builder",
  "appUrl": "https://formbuilder.example.com",
  "provider": "keycloak",
  "clientId": "form-builder-client",
  "usesOrgs": true,
  "config": {
    "baseUrl": "http://1.6.37.35/keycloak",
    "realm": "Form-Builder",
    "adminUsername": "admin",
    "adminPassword": "admin"
  },
  "isActive": true
}
```

> **Note:** `clientSecret` is not required (and should normally be omitted) when `provider` is
> `"keycloak"`. On create, the service automatically provisions the realm/client in Keycloak
> if they don't already exist (registration enabled, `username`/`email` forced required,
> `firstName`/`lastName` stripped from the default profile), and Keycloak generates the real
> client secret itself — which is then stored encrypted in the database. The secret is never
> returned in any API response; retrieve it from the Keycloak admin console
> (Clients → Credentials) if you need it. `clientSecret` is still required for non-keycloak
> providers (e.g. `cognito`), which have no equivalent auto-provisioning.
>
> **`usesOrgs` is required** — it must be explicitly `true` or `false`. There is currently no
> way to change it after creation (not supported by `PUT /app-auth-config/:id`), so decide
> upfront whether this app needs organisations.

### Get all app configs

```http
GET /app-auth-config
```

### Get app config by appId

```http
GET /app-auth-config/:appId
```

### Update app config

```http
PUT /app-auth-config/:id
```

### Delete app config

```http
DELETE /app-auth-config/:id
```

---

## 2. Organizations

These routes are defined in `src/route/orgRoute.ts`.

### Create organization

```http
POST /organisations
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "orgId": "OrgA",
  "appId": "FormBuilder",
  "name": "Organisation A"
}
```

Behavior:
- Validates app exists and `usesOrgs=true`
- Creates org in DB
- If Keycloak provider is configured, creates or syncs the org in Keycloak
- Conflicts if org already exists in DB or Keycloak

### Get all organizations for an app

```http
GET /organisations/:appId
```

### Activate or deactivate organization

```http
PATCH /organisations/:id
```

### Delete organization

```http
DELETE /organisations/:id
Headers: x-app-id: FormBuilder
```

Delete rules:
- Cannot delete if members exist
- Cannot delete if roles exist
- Cannot delete if features exist
- Cannot delete if user-role assignments exist

### Add member to organization

```http
POST /organisations/:orgId/members
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "userId": "<user-id>"
}
```

Behavior:
- Validates user exists
- Validates org exists for the app
- Adds user in Keycloak org
- Ensures `app_users` and `app_org_users` entries exist

### Remove member from organization

```http
DELETE /organisations/:orgId/members/:userId
Headers: x-app-id: FormBuilder
```

### Get organization members

```http
GET /organisations/:orgId/members
Headers: x-app-id: FormBuilder
```

---

## 3. Users and authentication

These routes are defined in `src/route/userRoute.ts`.

### Create user

```http
POST /user
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "email": "john@example.com",
  "password": "Password123",
  "username": "john",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890",
  "gender": "Male",
  "address": "Main Street",
  "additionalDetails": {}
}
```

> **Note:** only `email`, `password`, and `username` are required. `firstName`, `lastName`,
> `phone`, `gender`, `address`, and `additionalDetails` are all optional — the minimal valid
> body is just `{ "email", "password", "username" }`. Any extra fields sent inside
> `additionalDetails` are stored as-is (JSON column) and forwarded to Keycloak as user
> attributes, with no schema restriction.

### Login

```http
POST /user/login
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

### Refresh token

```http
POST /user/refresh-token
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "refreshToken": "<token>"
}
```

### Logout

```http
POST /user/logout
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "refreshToken": "<token>"
}
```

### Validate token

```http
POST /user/validate-token
Headers: x-app-id: FormBuilder
```

Token can be supplied any of three ways (checked in this order): `Authorization: Bearer <token>`
header, `idtoken` header, or in the body as shown below.

Body:

```json
{
  "token": "<token>"
}
```

### Forgot password

```http
POST /user/forgot-password
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "email": "john@example.com"
}
```

### Confirm forgot password

```http
POST /user/confirm-forgot-password
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "email": "john@example.com",
  "confirmationCode": "<code>",
  "newPassword": "NewPass123"
}
```

### Update profile

```http
PUT /user
Headers: x-app-id: FormBuilder, Authorization: Bearer <token>
```

Body example:

```json
{
  "username": "johnny",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9876543210",
  "gender": "Male",
  "address": "Updated Address"
}
```

### Get all users

```http
GET /user
Headers: Authorization: Bearer <token>
```

### Get user by ID

```http
GET /user/details/:id
Headers: x-app-id: FormBuilder, Authorization: Bearer <token>
```

### Get user by email

```http
GET /user/:email
Headers: x-app-id: FormBuilder, Authorization: Bearer <token>
```

### Social login URL

```http
GET /user/social-login-url?provider=google&redirectUri=https://example.com/callback
Headers: x-app-id: FormBuilder
```

### Social login callback exchange

```http
POST /user/social-login
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "code": "<oauth-code>",
  "redirectUri": "https://example.com/callback"
}
```

---

## 4. Features

Defined in `src/route/featureRoutes.ts`.

### Create feature

```http
POST /feature
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

Body:

```json
{
  "appId": "FormBuilder",
  "feature": "form-create",
  "actions": [
    { "key": "read", "value": "true" },
    { "key": "write", "value": "true" },
    { "key": "delete", "value": "true" }
  ]
}
```

### Get all features for app

```http
GET /feature/app/:appId
Headers: x-app-id: FormBuilder, x-org-id: OrgA
```

### Update feature

```http
PUT /feature/:featureId
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

### Insert action into feature

```http
POST /feature/:feature/actions
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

Body:

```json
{
  "appId": "FormBuilder",
  "key": "export",
  "value": "true"
}
```

### Remove action from feature

```http
DELETE /feature/:feature/actions
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

Body:

```json
{
  "appId": "FormBuilder",
  "key": "export",
  "value": "true"
}
```

### Delete feature

```http
DELETE /feature/:feature
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

Body:

```json
{
  "appId": "FormBuilder"
}
```

Business rule:
- Feature cannot be deleted if it is assigned to active roles
- Action keys must be unique per feature

---

## 5. Roles

Defined in `src/route/roleRoutes.ts`.

### Create role

```http
POST /role
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

Body:

```json
{
  "roleName": "Admin",
  "appId": "FormBuilder",
  "orgId": "OrgA",
  "description": "Full access admin",
  "permission": {
    "appId": "FormBuilder",
    "privilege": [
      { "feature": "form-create", "actions": ["read", "write", "delete"] }
    ]
  },
  "template": ""
}
```

### Get roles for app

```http
GET /role/:appId
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

### Update role

```http
PUT /role/:id
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

### Activate or deactivate role

```http
PATCH /role/:id
Headers: x-app-id: FormBuilder, Authorization: Bearer <token>
```

Business rule:
- A role cannot be deactivated if users are assigned to it
- Permission `appId` must match role appId

---

## 6. User app roles

Defined in `src/route/userAppRoles.ts`.

### Assign role to user

```http
POST /user-app-roles
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

Body:

```json
{
  "userId": "<user-id>",
  "appId": "FormBuilder",
  "roleId": "<role-id>"
}
```

### Update role for user in app

```http
PUT /user-app-roles/:userId/:appId
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

Body:

```json
{
  "roleId": "<new-role-id>"
}
```

### Get all role assignments for app

```http
GET /user-app-roles/users/:appId
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

### Get role assignment for specific user in app

```http
GET /user-app-roles/:userId/:appId
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

### Remove role from user

```http
DELETE /user-app-roles/:userId/:appId
Headers: x-app-id: FormBuilder, x-org-id: OrgA, Authorization: Bearer <token>
```

Business rule:
- One role per user per app
- Cannot move role to a different app if the user is already assigned

---

## 7. Groups

Defined in `src/route/groupRoutes.ts`. All routes require `Authorization: Bearer <token>`.

### Create group

```http
POST /groups
Headers: x-app-id: FormBuilder
```

Body:

```json
{
  "groupName": "Developers",
  "description": "Engineering team",
  "appId": "FormBuilder"
}
```

### Update group

```http
PUT /groups/:id
```

### Get groups for app

```http
GET /groups?appId=FormBuilder&page=1&limit=10
```

> `appId` is a **query parameter**, not a path parameter. `page`/`limit` are optional.

### Get group by ID

```http
GET /groups/:id
```

### Delete group

```http
DELETE /groups/:id
```

### Add member to group

```http
POST /groups/:id/members
```

Body:

```json
{
  "userId": "<user-id>"
}
```

### Remove member from group

```http
DELETE /groups/:id/members/:userId
```

### Get group members

```http
GET /groups/:id/members
```

### Get a user's groups

```http
GET /groups/user/:userId
```

---

## 8. Applications

Defined in `src/route/applicationRoute.ts`.

### Create application

```http
POST /applications
Headers: Authorization: Bearer <token>
```

### Get all applications

```http
GET /applications
Headers: Authorization: Bearer <token>
```

### Get application by slug

```http
GET /applications/:slug
Headers: Authorization: Bearer <token>
```

### Update application

```http
PUT /applications/:slug
Headers: Authorization: Bearer <token>
```

### Delete application

```http
DELETE /applications/:slug
Headers: Authorization: Bearer <token>
```

---

## 9. Template Mapping

Defined in `src/route/templateMappingRoute.ts`, mounted at `/template/mapping`. All routes
require `Authorization: Bearer <token>`. **No Joi validation schema exists for this route
group** — the controller passes `req.body` straight to the service without validation.

### Create template mapping

```http
POST /template/mapping
Headers: x-app-id: FormBuilder, Authorization: Bearer <token>
```

### Get all template mappings

```http
GET /template/mapping
Headers: x-app-id: FormBuilder, Authorization: Bearer <token>
```

### Get ABAC template fields

```http
GET /template/mapping/fields?collection=users,roles
Headers: x-app-id: FormBuilder, Authorization: Bearer <token>
```

`collection` is an optional, comma-separated query parameter.

### Update template mapping

```http
PUT /template/mapping/:id
Headers: Authorization: Bearer <token>
```

### Delete template mapping

```http
DELETE /template/mapping/:id
Headers: Authorization: Bearer <token>
```

---

## 10. ABAC Policies

Defined in `src/route/abacPolicyRoute.ts`, mounted at `/abac-policies`. All routes require
`Authorization: Bearer <token>`.

### Create ABAC policy

```http
POST /abac-policies
Headers: Authorization: Bearer <token>
```

Body:

```json
{
  "appId": "FormBuilder",
  "collectionName": "users",
  "fields": [
    {
      "attribute": "department",
      "type": "static",
      "possibleValues": ["Sales", "Engineering"],
      "isActive": true
    }
  ]
}
```

`possibleValues` is required only when `type` is `"static"`. `fields` must have at least 1 item.

### Get all ABAC policies

```http
GET /abac-policies
Headers: Authorization: Bearer <token>
```

### Get ABAC policy by ID

```http
GET /abac-policies/:id
Headers: Authorization: Bearer <token>
```

### Get ABAC policies by appId

```http
GET /abac-policies/app/:appId
Headers: Authorization: Bearer <token>
```

### Update ABAC policy

```http
PUT /abac-policies/:id
Headers: Authorization: Bearer <token>
```

All fields optional, but at least 1 must be supplied.

### Delete ABAC policy

```http
DELETE /abac-policies/:id
Headers: Authorization: Bearer <token>
```

### Add field to policy

```http
POST /abac-policies/:id/fields
Headers: Authorization: Bearer <token>
```

Body: same shape as one entry in the `fields` array above (`attribute`, `type`,
`possibleValues`, `isActive`).

### Remove field from policy

```http
DELETE /abac-policies/:id/fields/:attribute
Headers: Authorization: Bearer <token>
```

### Toggle field active status

```http
PATCH /abac-policies/:id/fields/:attribute/status
Headers: Authorization: Bearer <token>
```

---

## 11. ABAC Permissions

Defined in `src/route/abacPermissionRoute.ts`, mounted at `/abac-permissions`. All routes
require `Authorization: Bearer <token>`.

### Permission templates

```http
POST   /abac-permissions/templates
GET    /abac-permissions/templates
GET    /abac-permissions/templates/:id
GET    /abac-permissions/templates/app/:appId
PUT    /abac-permissions/templates/:id
DELETE /abac-permissions/templates/:id
```

Create body:

```json
{
  "appId": "FormBuilder",
  "templateName": "Standard Access",
  "description": "Default permission template",
  "isActive": true
}
```

`templateName` must be 2–100 characters. `description` optional, max 500 characters.
Update body: same fields, all optional, at least 1 required.

### Collection templates (nested under a permission template)

```http
POST   /abac-permissions/templates/:templateId/collections
GET    /abac-permissions/templates/:templateId/collections
GET    /abac-permissions/templates/:templateId/collections/:collectionId
PUT    /abac-permissions/templates/:templateId/collections/:collectionId
DELETE /abac-permissions/templates/:templateId/collections/:collectionId
```

Create body:

```json
{
  "collectionName": "users",
  "isActive": true,
  "restrictions": {
    "email": {
      "read": true,
      "create": true,
      "update": false,
      "delete": false,
      "q_default": [],
      "q_allow": [],
      "q_default_operator": ["equal"]
    }
  }
}
```

`restrictions` is a map keyed by field name; each entry requires `read`/`delete` (boolean),
`create`/`update` (boolean or string array), `q_default`/`q_allow` (string arrays), and
`q_default_operator` (array of `"equal"` or `"not_equal"`). At least 1 restriction entry required.

### User template assignments

```http
POST   /abac-permissions/assignments
POST   /abac-permissions/assignments/bulk
GET    /abac-permissions/assignments/user/:userId
GET    /abac-permissions/assignments/user/:userId/app/:appId
PUT    /abac-permissions/assignments/:id
DELETE /abac-permissions/assignments/:id
```

Assign body:

```json
{
  "userId": "<user-id>",
  "appId": "FormBuilder",
  "templateId": "<template-id>",
  "isActive": true
}
```

Bulk-assign body: `{ "userIds": ["<id1>", "<id2>"], "appId": "FormBuilder", "templateId": "<template-id>" }`
(`userIds` requires at least 1 item).

### Policy evaluation

```http
POST /abac-permissions/evaluate
POST /abac-permissions/evaluate/batch
```

Evaluate body:

```json
{
  "userId": "<user-id>",
  "appId": "FormBuilder",
  "collectionName": "users",
  "operation": "read",
  "payload": {},
  "keyMap": {}
}
```

`operation` must be one of `read`, `create`, `update`, `delete`, `query`, `access_check`.
`keyMap` is optional. Batch body: `{ "requests": [ ...1 to 50 evaluate bodies... ] }`.

---

## 12. Bootstrap and dashboard

### Bootstrap

```http
POST /bootstrap
Headers: x-app-id: FormBuilder
```

One-time setup endpoint (no auth required) — creates the first superadmin user. Automatically
disabled after the first superadmin is created. Used to load the initial state of an app:
config, features, roles, and related setup.

### Dashboard

```http
GET /dashboard/:appId
Headers: Authorization: Bearer <token>
```

---

## 13. Validation rules used by the service

The service validates incoming payloads with Joi schemas located in `src/validator/`.

### App auth config validation

File: `src/validator/appAuthValidation.ts`

```ts
configObject = Joi.object({
  baseUrl: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  realm: Joi.string().trim().min(1).max(100).pattern(/^[a-zA-Z0-9_-]+$/).required(), // letters/numbers/hyphen/underscore only
  adminUsername: Joi.string().trim().min(1).required(),
  adminPassword: Joi.string().min(1).required(),
})
```

```ts
createAppAuthConfigValidation = Joi.object({
  appId: Joi.string().trim().min(2).max(100).required(),
  appName: Joi.string().trim().min(2).max(150).required(),
  appUrl: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  provider: Joi.string().valid('keycloak', 'cognito', 'auth0', 'firebase').required(),
  clientId: Joi.string().trim().min(1).required(),
  // Optional when provider is 'keycloak' (Keycloak generates/holds the secret itself).
  // Required for every other provider.
  clientSecret: Joi.string().when('provider', {
    is: 'keycloak',
    then: Joi.string().optional().allow(''),
    otherwise: Joi.string().min(1).required(),
  }),
  config: configObject,
  isActive: Joi.boolean().optional(),
  usesOrgs: Joi.boolean().required(), // must be explicitly set, never silently defaults to false
})
```

### Organization validation

File: `src/validator/orgValidation.ts`

```ts
createOrgSchema = Joi.object({
  orgId: Joi.string().required(),
  appId: Joi.string().required(),
  name: Joi.string().required(),
  isActive: Joi.boolean().optional(),
})
```

### User validation

File: `src/validator/userValidation.ts`

Rules:
- Only `email`, `password`, and `username` are required
- Email must match a custom regex pattern
- Username must be 3 to 25 characters
- First name, last name, and phone are all optional; if provided, first/last name must be
  3 to 25 characters and phone max length is 10
- Gender is limited to `Male`, `Female`, or `Other`
- `additionalDetails` must be an object when present, with no restriction on its contents

Example constraints:

```ts
email: Joi.string().pattern(emailRegex).required()
password: Joi.string().required()
username: Joi.string().min(3).max(25).required()
firstName: Joi.string().min(3).max(25).optional().allow('')
lastName: Joi.string().min(3).max(25).optional().allow('')
phone: Joi.string().allow('').max(10).optional()
```

> **Note:** the rules above are for `userCreationSchema` (`POST /user`). The separate
> `updateProfileSchema` (`PUT /user`) is slightly looser: `firstName` has no min/max length
> restriction at all (any length, including empty), while `lastName` keeps the 3–25 rule.
> `address` (min 3, max 50, optional) applies in both schemas.

### Feature validation

File: `src/validator/featureValidation.ts`

```ts
const actionSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.string().required(),
})
```

```ts
createFeatureSchema = Joi.object({
  actions: Joi.array().items(actionSchema).required(),
  appId: Joi.string().disallow('', null).required(),
  orgId: Joi.string().optional(),
  feature: Joi.string().required(),
})
```

### Role validation

File: `src/validator/roleValidation.ts`

```ts
privilegeSchema = Joi.array().items(Joi.object({
  feature: Joi.string().required(),
  actions: Joi.array().required().items(Joi.string())
})).required()
```

```ts
permissionSchema = Joi.object({
  appId: Joi.string().disallow('', null).required(),
  privilege: privilegeSchema
}).required()
```

```ts
createRoleSchema = Joi.object({
  roleName: Joi.string().required(),
  appId: Joi.string().disallow('', null).required(),
  orgId: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  permission: permissionSchema.required(),
  template: Joi.string().allow('').optional(),
})
```

### Group validation

File: `src/validator/groupValidation.ts`

```ts
createGroupSchema = Joi.object({
  groupName: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  appId: Joi.string().required(),
})
```

---

## 14. Common error responses

| Status | Meaning |
|---|---|
| `400` | Bad request / validation failure / missing required data |
| `401` | Missing or invalid auth token |
| `403` | Forbidden / access denied / invalid app/org mismatch |
| `404` | Resource not found |
| `409` | Duplicate resource or conflict with existing assignment |
| `500` | Internal server error |

## 15. End-to-end onboarding example for org-based app

```text
1. POST /app-auth-config
2. POST /organisations
3. POST /feature
4. POST /role
5. POST /user
6. POST /user/login
7. POST /organisations/:orgId/members
8. POST /user-app-roles
```

This flow matches the current implementation and validation rules in the codebase.
