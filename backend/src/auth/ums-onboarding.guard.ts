import { Injectable, type CanActivate, type ExecutionContext, UnauthorizedException, ConflictException } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class UmsOnboardingGuard implements CanActivate {
  private readonly umsBase = process.env.UMS_BASE_URL || 'https://apidev.sifymodernization.digital/user-mgt/api';
  private readonly appId = process.env.UMS_APP_ID || 'Project-Management';

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    if (!token) throw new UnauthorizedException('Missing token');

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
      console.error('[UmsOnboardingGuard] Token validation failed:', (err as Error).message);
      throw new UnauthorizedException('Token validation failed');
    }

    // Check if UMS user is already mapped to an active Workforce Employee
    let employee: { id: string; organizationId: string; isActive: boolean } | null = null;
    try {
      const empByUmsId = await db.orm.public.Employee.where({
        umsUserId: umsUser.id,
        isActive: true,
      }).first().catch(() => null);

      const empByEmail = await db.orm.public.Employee.where({
        email: umsUser.email,
        isActive: true,
      }).first().catch(() => null);

      employee = empByUmsId || empByEmail || null;
    } catch (err) {
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
