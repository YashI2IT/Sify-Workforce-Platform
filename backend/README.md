# Sify Workforce Platform - Backend

This is the backend API for the Sify Workforce Platform.

## Tech Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod

## Getting Started

### Prerequisites

- Node.js >= 22
- npm >= 10
- PostgreSQL >= 15

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure your database connection:
   ```bash
   cp .env.example .env
   ```

3. Initialize the Prisma contract:
   ```bash
   npx prisma contract emit
   ```

### Running the application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

### Scripts

- `npm run build`: Build the project
- `npm run format`: Format code with Prettier
- `npm run lint`: Lint code with Oxlint
- `npm run test`: Run unit tests with Vitest
- `npm run test:e2e`: Run end-to-end tests
- `npm run contract:emit`: Emit Prisma contract
