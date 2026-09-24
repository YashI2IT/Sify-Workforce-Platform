import { Injectable, type CanActivate, type ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';

/**
 * UmsAuthGuard
 *
 * PRODUCTION authentication guard for the Sify Workforce Platform.
 *
 * CONFIRMED UMS CONTRACT (2026-09-16 — live API diagnostic):
 *
 *   UMS base: https://apidev.sifymodernization.digital/user-mgt/api
 *   AppId: Project-Management
 *
 *   Keycloak issuer: http://1.6.37.35/keycloak/realms/Project-Management
 *   Audience: Project-Management
 *   Algorithm: RS256
 *
 *   Token validation: POST /user/validate-token
 *   Authorization: Bearer <accessToken>
 *   x-app-id: Project-Management
 *
 *   validate-token response:
 *   {
 *     data: {
 *       valid: boolean,
 *       user: { id: string (UUID), email: string, username: string, role: { roleName?: string, ... } },
 *       token: { issuer, subject, issuedAt, expiresAt },
 *       app: { appId, appName, provider }
 *     }
 *   }
 *
 * USER → EMPLOYEE MAPPING:
 *   UMS user.email → Employee.email (same organization-scoped uniqueness)
 *   Employee.organizationId → AuthenticatedContext.organizationId
 *
 * ROLE MAPPING:
 *   UMS role.roleName (if set) → Workforce role string
 *   Role name mapping: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' (case-insensitive)
 *   Default (no role assigned): Rejects request (Forbidden)
 *
 * SECURITY:
 *   - Never trusts x-dev-* headers
 *   - Token is validated by UMS on every request
 *   - Employee must exist and be active in the Workforce database
 */
@Injectable()
export class UmsAuthGuard implements CanActivate {
  private readonly umsBase = process.env.UMS_BASE_URL || 'https://apidev.sifymodernization.digital/user-mgt/api';
  private readonly appId = process.env.UMS_APP_ID || 'Project-Management';

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();

    if (request.path === '/api/v1/organizations' && request.method === 'POST') {
      return true; // Let UmsOnboardingGuard handle this specific route
    }
    if (request.path === '/api/v1/organizations/available' && request.method === 'GET') {
      return true; // Let UmsOnboardingGuard handle this specific route
    }
    if (request.path.match(/^\/api\/v1\/organizations\/[^/]+\/join$/) && request.method === 'POST') {
      return true; // Let UmsOnboardingGuard handle this specific route
    }
    if (request.path.match(/^\/api\/v1\/employee-invitations\/[^/]+\/details$/) && request.method === 'GET') {
      return true; // Unauthenticated route to get public invitation details
    }
    if (request.path === '/api/v1/employee-invitations/my-invitations' && request.method === 'GET') {
      return true; // Let UmsOnboardingGuard handle this specific route
    }
    if (request.path.match(/^\/api\/v1\/employee-invitations\/[^/]+\/(accept|decline)-invite$/) && request.method === 'POST') {
      return true; // Let UmsOnboardingGuard handle this specific route
    }

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    if (!token) throw new UnauthorizedException('Missing token');

    // Validate token via UMS
    let umsUser: { id: string; email: string; role: Record<string, any> };
    try {
      const response = await fetch(`${this.umsBase}/user/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-app-id': this.appId,
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        throw new UnauthorizedException('Token invalid or expired');
      }

      const body = await response.json();
      if (!body?.data?.valid) {
        throw new UnauthorizedException('Token invalid or expired');
      }

      umsUser = body.data.user;
      if (!umsUser?.email) {
        throw new UnauthorizedException('User email missing from token');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      console.error('[UmsAuthGuard] Token validation failed:', (err as Error).message);
      throw new UnauthorizedException('Token validation failed');
    }

    // Map UMS user → Workforce Employee
    let employee: { id: string; organizationId: string; isActive: boolean; role: string; umsUserId: string | null } | null = null;
    try {
      // 1. Try lookup by stable umsUserId (CASE A, C, D)
      const empByUmsId = await db.orm.public.Employee.where({
        umsUserId: umsUser.id,
      }).first().catch(() => null);

      if (empByUmsId) {
        // We found an employee firmly bound to this UMS identity.
        // Even if the email changed in UMS, the identity binding remains intact.
        // We must check if the UMS email belongs to a different BOUND employee.
        // If UMS email matches another employee who is already bound to a different UMS user, 
        // that's a conflict. We prevent silent email stealing.
        const empByEmail = await db.orm.public.Employee.where({ email: umsUser.email }).first().catch(() => null);
        if (empByEmail && empByEmail.id !== empByUmsId.id) {
          // CASE D
          throw new ForbiddenException({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Identity conflict: UMS user matches one employee, but email matches another.',
            code: 'IDENTITY_CONFLICT'
          });
        }
        employee = empByUmsId;
      } else {
        // 2. Fallback to lookup by email
        const empByEmail = await db.orm.public.Employee.where({
          email: umsUser.email,
        }).first().catch(() => null);

        if (empByEmail) {
          if (empByEmail.umsUserId !== null && empByEmail.umsUserId !== umsUser.id) {
            // CASE C / Email conflict
            throw new ForbiddenException({
              statusCode: 403,
              error: 'Forbidden',
              message: 'Identity conflict: Email is already bound to a different identity.',
              code: 'IDENTITY_CONFLICT'
            });
          }

          // CASE B: Employee.umsUserId is NULL AND Employee.email matches UMS email
          // Safely bind umsUserId to that Employee.
          try {
            // Atomic update where umsUserId must be null
            await db.orm.public.Employee.where({ 
              id: empByEmail.id,
              umsUserId: null
            }).update({ umsUserId: umsUser.id });
            
            // Reload the employee to confirm update and proceed
            employee = await db.orm.public.Employee.where({ id: empByEmail.id }).first();
          } catch (err) {
            // Binding failed (e.g., concurrent update violation on unique constraint)
            throw new ForbiddenException({
              statusCode: 403,
              error: 'Forbidden',
              message: 'Identity binding failed due to a concurrent update or conflict.',
              code: 'IDENTITY_BINDING_FAILED'
            });
          }
        }
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      // Database errors
      employee = null;
    }

    const isAuthMe = request.path.endsWith('/auth/me');
    const isAcceptInvite = (request.path.match(/^\/api\/v1\/employee-invitations\/[^/]+\/accept$/) || request.path.match(/^\/api\/v1\/employee-invitations\/[^/]+\/accept-invite$/)) && request.method === 'POST';
    const isMyInvitations = request.path.endsWith('/employee-invitations/my-invitations') && request.method === 'GET';

    request.umsUser = umsUser; // Ensure controller has access to UMS details

    if (!employee) {
      if (isAuthMe || isAcceptInvite || isMyInvitations) {
        request.onboardingRequired = true;
        return true;
      }
      // Valid UMS user but no matching active Workforce employee (CASE E)
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'User is authenticated but has no active Workforce Employee record',
        code: 'WORKFORCE_ONBOARDING_REQUIRED',
      });
    }

    if (!employee.isActive) {
      if (isAuthMe || isAcceptInvite) {
        request.employee = employee;
        request.onboardingRequired = true; // Inactive can be treated as requiring onboarding or admin intervention
        return true;
      }
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'User is authenticated but Workforce Employee record is inactive',
        code: 'WORKFORCE_ONBOARDING_REQUIRED',
      });
    }

    // Map Local Workforce role
    const roles = UmsAuthGuard.mapRoles(employee.role);
    if (roles.length === 0) {
      if (isAuthMe || isAcceptInvite) {
        request.employee = employee;
        request.onboardingRequired = true; 
        return true;
      }
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Invalid or missing Workforce role',
        code: 'WORKFORCE_ROLE_INVALID',
      });
    }

    if (isAuthMe) {
      request.employee = employee;
      request.onboardingRequired = false;
      request.roles = roles;
      return true;
    }

    // Build AuthenticatedContext
    request.user = {
      userId: umsUser.id,       // UMS user UUID (= Keycloak sub)
      employeeId: employee.id,
      organizationId: employee.organizationId,
      roles,
    };

    return true;
  }

  /**
   * Map local Workforce role string to normalized roles array.
   *
   * Normalized roles must be ADMIN | MANAGER | EMPLOYEE.
   */
  static mapRoles(roleInput: string | null | undefined): string[] {
    if (!roleInput || typeof roleInput !== 'string') return [];

    const roleName: string = roleInput.toUpperCase().trim();

    if (roleName === 'ADMIN') return ['ADMIN'];
    if (roleName === 'MANAGER') return ['MANAGER'];
    if (roleName === 'EMPLOYEE') return ['EMPLOYEE'];

    // Unknown or empty role: reject
    if (roleName) {
      console.warn(`[UmsAuthGuard] Unknown UMS role: "${roleName}" — rejecting access`);
    }
    return [];
  }
}
