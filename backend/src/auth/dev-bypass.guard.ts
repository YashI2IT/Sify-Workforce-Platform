import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { db } from '../prisma/db.js';

/**
 * DevBypassGuard
 *
 * DEVELOPMENT ONLY — injects a stub AuthenticatedContext into the request
 * using the employee ID and organization ID passed via special dev headers.
 *
 * Default-deny security rules enforced:
 *   1. Opt-in environment check: Enabled ONLY when NODE_ENV === 'development' || NODE_ENV === 'test'.
 *      Disabled in production, missing/undefined NODE_ENV, or any unknown environment.
 *   2. DB Identity Validation: Verifies that supplied employeeId exists in the database,
 *      is active (isActive === true), and belongs to the supplied organizationId.
 *   3. Manager authorization relies on Team.managerId DB relationships rather than hardcoded role claims.
 *
 * PENDING: Replace with real JwtAuthGuard when Keycloak contract is finalized.
 */
@Injectable()
export class DevBypassGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isDevEnvironment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (!isDevEnvironment) {
      return false; // Default-deny: disable when NODE_ENV is production, missing/undefined, or unknown
    }

    const request = ctx.switchToHttp().getRequest();
    if (request.path.includes('/dev/employees')) {
      return true; // Allow bootstrap request without auth headers
    }

    const employeeId = request.headers['x-dev-employee-id'];
    const organizationId = request.headers['x-dev-org-id'];

    if (!employeeId || !organizationId || typeof employeeId !== 'string' || typeof organizationId !== 'string') {
      return false;
    }

    try {
      // Validate employee existence, active status, and organization match in database
      const employee = await db.orm.public.Employee.where({
        id: employeeId,
        organizationId: organizationId,
        isActive: true,
      }).first();

      if (!employee) {
        return false; // Reject request: employee not found, inactive, or org mismatch
      }

      request.user = {
        userId: `dev:${employee.id}`,
        employeeId: employee.id,
        organizationId: employee.organizationId,
        roles: [],
      };

      return true;
    } catch {
      return false;
    }
  }
}
