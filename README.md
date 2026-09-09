# Sify Workforce Platform

Enterprise workforce management platform.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Redux Toolkit
- Zod

### Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL

### Authentication (Planned)

- Keycloak (SSO, RBAC)

## Project Structure

```
frontend/   — React + Vite application
backend/    — NestJS API server
```

## Getting Started

### Prerequisites

- Node.js >= 22
- npm >= 10
- PostgreSQL >= 15

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Environment Variables

Copy `.env.example` to `.env` in both `frontend/` and `backend/` directories and update the values for your local environment.
