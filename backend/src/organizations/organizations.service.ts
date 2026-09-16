import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class OrganizationsService {
  async createOnboardingOrganization(umsUser: { id: string; email: string; name?: string; username?: string }, orgName: string, orgCode: string) {
    let existingEmployee = null;
    try {
      existingEmployee = await db.orm.public.Employee.where({ email: umsUser.email }).first();
    } catch (err) {}

    if (existingEmployee) {
      throw new ConflictException('User already has an active Workforce Employee record');
    }

    let existingOrgCode = null;
    try {
      existingOrgCode = await db.orm.public.Organization.where({ code: orgCode }).first();
    } catch (err) {}

    if (existingOrgCode) {
      throw new ConflictException('Organization with this code already exists');
    }

    try {
      return await db.transaction(async (tx) => {
        const organization = await tx.orm.public.Organization.create({
          name: orgName,
          code: orgCode,
        });

        const name = umsUser.name || umsUser.username || umsUser.email.split('@')[0];
        const employeeCode = `EMP-${Math.floor(Math.random() * 1000000)}`;

        const employee = await tx.orm.public.Employee.create({
          organizationId: organization.id,
          employeeCode: employeeCode,
          name: name,
          email: umsUser.email,
          isActive: true,
          role: 'ADMIN',
        });

        return {
          data: {
            organization: {
              id: organization.id,
              name: organization.name,
              code: organization.code,
            },
            employee: {
              id: employee.id,
              employeeCode: employee.employeeCode,
              name: employee.name,
              email: employee.email,
            },
            role: 'ADMIN',
          }
        };
      });
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      if (err.code === 'P2002' || err.code === '23505' || (err.message && err.message.toLowerCase().includes('unique constraint'))) {
        throw new ConflictException('User already has an active Workforce Employee record');
      }
      throw new InternalServerErrorException(`Transaction failed: ${err.message || err.toString()}`);
    }
  }

  async getCurrentOrganization(id: string) {
    const org = await db.orm.public.Organization.where({ id }).first();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async updateCurrentOrganization(id: string, updateData: { name?: string; code?: string }) {
    const org = await db.orm.public.Organization.where({ id }).first();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (updateData.code && updateData.code !== org.code) {
      const existingCode = await db.orm.public.Organization.where({ code: updateData.code }).first();
      if (existingCode) {
        throw new ConflictException('Organization with this code already exists');
      }
    }

    const data: any = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.code !== undefined) data.code = updateData.code;

    const updated = await db.orm.public.Organization.where({ id }).update(data);
    return updated;
  }
}
