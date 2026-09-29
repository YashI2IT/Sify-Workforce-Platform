import { Controller, Get, Patch, Post, Body, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Controller('auth')
export class AuthController {
  @Get('me')
  async getMe(@Req() req: any) {
    if (req.user) {
      // Dev mode or already fully mapped via DevBypassGuard
      const employee = await db.orm.public.Employee.where({ id: req.user.employeeId }).first();
      let org = null;
      let isInitialSetup = false;
      if (employee) {
        org = await db.orm.public.Organization.where({ id: employee.organizationId }).first();
        if (org && employee.role === 'ADMIN') {
          isInitialSetup = !org.isSetupComplete;
        }
      }
      return {
        data: {
          authenticated: true,
          onboardingRequired: !employee,
          employee: employee || null,
          organization: org || null,
          roles: employee ? [employee.role] : [],
          isInitialSetup,
          umsUserEmail: req.umsUser?.email || req.user?.email,
        }
      };
    }

    // Production mode (UmsAuthGuard handled this)
    if (!req.umsUser) {
      return {
        data: {
          authenticated: false,
          onboardingRequired: false,
          roles: [],
        }
      };
    }

    const { onboardingRequired, employee } = req;
    let org = null;
    let isInitialSetup = false;

    if (employee) {
      org = await db.orm.public.Organization.where({ id: employee.organizationId }).first();
      
      if (org && employee.role === 'ADMIN') {
        isInitialSetup = !org.isSetupComplete;
      }
    }

    return {
      data: {
        authenticated: true,
        onboardingRequired: onboardingRequired || false,
        employee: employee || null,
        organization: org || null,
        roles: req.roles || (employee ? [employee.role] : []),
        isInitialSetup,
        umsUserEmail: req.umsUser?.email || null,
      }
    };
  }

  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    const employeeId = req.user?.employeeId || req.employee?.id;
    if (!employeeId) throw new UnauthorizedException('Not authenticated');

    const employee = await db.orm.public.Employee.where({ id: employeeId }).first();
    if (!employee) throw new UnauthorizedException('Employee not found');

    const { name, email } = body;
    const updates: any = {};
    if (name) updates.name = name;
    
    // We update UMS first if email is provided
    if (email && email !== employee.email) {
      const umsEmail = req.umsUser?.email || req.user?.email || employee.email;
      const umsBase = process.env.UMS_URL || 'http://localhost:3001';
      const appId = process.env.UMS_APP_ID || 'Project-Management';
      
      try {
        const response = await fetch(`${umsBase}/user/${encodeURIComponent(umsEmail)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-app-id': appId,
            'Authorization': req.headers['authorization'] || ''
          },
          body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
          throw new Error('UMS update failed');
        }
      } catch (err) {
         if (process.env.NODE_ENV === 'production') {
           throw new BadRequestException('Failed to update email in identity provider');
         }
      }
      updates.email = email;
    }

    if (Object.keys(updates).length > 0) {
      await db.orm.public.Employee.where({ id: employeeId }).update(updates);
      Object.assign(employee, updates);
    }
    
    return { data: employee };
  }

  @Post('change-password')
  async changePassword(@Req() req: any, @Body() body: any) {
    const { currentPassword, newPassword } = body;
    const employeeId = req.user?.employeeId || req.employee?.id;
    if (!employeeId) throw new UnauthorizedException('Not authenticated');

    const umsEmail = req.umsUser?.email || req.user?.email || req.employee?.email;
    if (!umsEmail) throw new BadRequestException('UMS email not found');

    const umsBase = process.env.UMS_URL || 'http://localhost:3001';
    const appId = process.env.UMS_APP_ID || 'Project-Management';

    try {
      const response = await fetch(`${umsBase}/user/${encodeURIComponent(umsEmail)}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-id': appId,
          'Authorization': req.headers['authorization'] || ''
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Password update failed');
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException(err.message || 'Failed to update password in identity provider');
      }
    }

    return { message: 'Password changed successfully' };
  }
}
