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

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    if (!token) return false;

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
      });

      if (!response.ok) {
        return false; // Token invalid or expired
      }

      const body = await response.json();
      if (!body?.data?.valid) {
        return false;
      }

      umsUser = body.data.user;
      if (!umsUser?.email) {
        return false;
      }
    } catch (err) {
      console.error('[UmsAuthGuard] Token validation failed:', (err as Error).message);
      return false;
    }

    // Map UMS user → Workforce Employee by email
    let employee: { id: string; organizationId: string; isActive: boolean; role: string } | null = null;
    try {
      employee = await db.orm.public.Employee.where({
        email: umsUser.email,
        isActive: true,
      }).first();
    } catch (err) {
      // If .first() throws when no record is found, catch it and treat as null
      employee = null;
    }

    if (!employee) {
      // Valid UMS user but no matching active Workforce employee
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'User is authenticated but has no active Workforce Employee record',
        code: 'WORKFORCE_ONBOARDING_REQUIRED',
      });
    }

    // Map Local Workforce role
    const roles = UmsAuthGuard.mapRoles(employee.role);
    if (roles.length === 0) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Invalid or missing Workforce role',
        code: 'WORKFORCE_ROLE_INVALID',
      });
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
