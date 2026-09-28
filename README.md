# Sify Workforce Platform

Enterprise workforce, project management, and timesheet tracking platform for organization-wide employee allocation, time tracking, managerial approvals, and operational reporting.

---

## 📚 Documentation

The repository maintains a centralized, single source of truth for architecture, domain models, APIs, and development workflows:

- **[Project Master Specification](docs/PROJECT_MASTER.md)**  
  The authoritative master document covering architecture, domain entities, RBAC, authentication & identity binding, onboarding, project breakdown, weekly timesheet lifecycles, managerial approval hierarchies, operational reporting, database schemas, and current verification status.

- **[UMS API Reference](docs/UMS_API_REFERENCE.md)**  
  The complete technical reference for the external User Management Service (UMS) and Keycloak integration, covering authentication, organizations, roles, user app roles, ABAC policies, and token validation.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v20+
- **PostgreSQL**: v16+ (running on port 5432)
- **Mailpit**: Mock SMTP server (running on port 1025, web UI on port 8025)

### 1. Backend Service
```bash
cd backend
npm install
npm run contract:emit
npx prisma db update
npm run start:dev
```
Backend API runs on `http://localhost:3000/api/v1` (Swagger docs at `/api/docs`).

### 2. Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Frontend development server runs on `http://localhost:5173`.

### 3. Local SMTP (Mailpit)
Start `mailpit.exe` in the workspace root to capture invitation emails.  
View captured emails at `http://localhost:8025`.

---

## 🧪 Testing

```bash
# Run backend test suite (309 tests across 27 suites)
cd backend && npm test

# Run frontend test suite
cd frontend && npm test
```

---

## 🔮 Future Improvements (V1.1+)

- **Frontend Code Splitting**: The production `vite build` produces a large chunk. In future releases, React route-level code splitting (`React.lazy()`) should be implemented to reduce initial load times.
- **E2E Browser Automation**: Browser-based E2E tests are pending due to external Playwright CDN issues during the V1 auditing phase. These should be reintroduced when the external dependency is resolved.
