import { Controller, Get, Req } from '@nestjs/common';
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
}
