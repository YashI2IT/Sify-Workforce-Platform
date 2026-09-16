import { Injectable, type CanActivate, type ExecutionContext, UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class UmsOnboardingGuard implements CanActivate {
  private readonly umsBase = process.env.UMS_BASE_URL || 'https://apidev.sifymodernization.digital/user-mgt/api';
  private readonly appId = process.env.UMS_APP_ID || 'Project-Management';

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    if (!token) return false;

    // Validate token via UMS
    let umsUser: { id: string; email: string; name?: string; username?: string };
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
      console.error('[UmsOnboardingGuard] Token validation failed:', (err as Error).message);
      return false;
    }

    // Map UMS user → Workforce Employee by email
    let employee: { id: string; organizationId: string; isActive: boolean } | null = null;
    try {
      employee = await db.orm.public.Employee.where({
        email: umsUser.email,
        isActive: true,
      }).first();
    } catch (err) {
      // If .first() throws when not found, treat as null
      employee = null;
    }

    if (employee) {
      throw new ConflictException({
        statusCode: 409,
        message: 'User already has an active Workforce Employee record',
        code: 'WORKFORCE_ALREADY_ONBOARDED',
      });
    }

    request.umsUser = umsUser;
    return true;
  }
}
