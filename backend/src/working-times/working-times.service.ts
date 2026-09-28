import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

/** Day-of-week keys matching the WorkingTime model columns */
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
type DayKey = typeof DAY_KEYS[number];

export interface WorkingTimeConfig {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

/** Default fallback when no working-time row exists */
const DEFAULT_CONFIG: WorkingTimeConfig = {
  monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0,
};

@Injectable()
export class WorkingTimesService {
  // ---------------------------------------------------------------------------
  // Internal: resolve effective config for an employee
  // ---------------------------------------------------------------------------
  async resolveConfigForEmployee(employeeId: string, organizationId: string): Promise<WorkingTimeConfig> {
    // 1. Employee-level override
    const override = await db.orm.public.WorkingTime.where({ employeeId, organizationId }).first();
    if (override && override.isActive) return this.rowToConfig(override);

    // 2. Organisation default (employeeId is null)
    const orgDefault = await db.orm.public.WorkingTime
      .where({ organizationId })
      .where((w: any) => w.employeeId.eq(null))
      .first();
    if (orgDefault && orgDefault.isActive) return this.rowToConfig(orgDefault);

    // 3. Hardcoded fallback so callers always get a value
    return { ...DEFAULT_CONFIG };
  }

  // ---------------------------------------------------------------------------
  // Core calculation: expected hours for a date range
  // Returns { total, byDate }
  // ---------------------------------------------------------------------------
  async calculateExpectedHours(
    employeeId: string,
    organizationId: string,
    startDate: string, // YYYY-MM-DD
    endDate: string,   // YYYY-MM-DD
  ): Promise<{ total: number; byDate: Record<string, number> }> {
    const config = await this.resolveConfigForEmployee(employeeId, organizationId);

    // Fetch active holidays in range for this org
    const holidays = await db.orm.public.PublicHoliday
      .where({ organizationId, isActive: true })
      .where((h: any) => h.date.gte(startDate))
      .where((h: any) => h.date.lte(endDate))
      .all();

    const holidaySet = new Set(holidays.map((h: any) => h.date as string));

    const byDate: Record<string, number> = {};
    let total = 0;

    let cursor = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);

    while (cursor <= end) {
      const dateStr = cursor.toISOString().split('T')[0];

      if (holidaySet.has(dateStr)) {
        byDate[dateStr] = 0;
      } else {
        const dow = cursor.getUTCDay(); // 0=Sun
        const key = DAY_KEYS[dow] as DayKey;
        const hours = config[key] ?? 0;
        byDate[dateStr] = hours;
        total += hours;
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return { total, byDate };
  }

  // ---------------------------------------------------------------------------
  // API: Get org default schedule
  // ---------------------------------------------------------------------------
  async getOrgDefault(auth: AuthenticatedContext) {
    const row = await db.orm.public.WorkingTime
      .where({ organizationId: auth.organizationId })
      .where((w: any) => w.employeeId.eq(null))
      .first();

    if (!row) return { ...DEFAULT_CONFIG, isActive: true, isDefault: true };
    return { ...this.rowToConfig(row), isActive: row.isActive, id: row.id, isDefault: true };
  }

  // ---------------------------------------------------------------------------
  // API: Upsert org default schedule (ADMIN only)
  // ---------------------------------------------------------------------------
  async upsertOrgDefault(auth: AuthenticatedContext, body: WorkingTimeConfig) {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can update the organization working time');
    }

    const existing = await db.orm.public.WorkingTime
      .where({ organizationId: auth.organizationId })
      .where((w: any) => w.employeeId.eq(null))
      .first();

    if (existing) {
      return db.orm.public.WorkingTime.where({ id: existing.id }).update({
        ...body, isActive: true, updatedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()),
      });
    }

    return db.orm.public.WorkingTime.create({
      organizationId: auth.organizationId,
      employeeId: null,
      ...body,
      isActive: true,
    });
  }

  // ---------------------------------------------------------------------------
  // API: List employee overrides (ADMIN sees all; MANAGER sees their team)
  // ---------------------------------------------------------------------------
  async listOverrides(auth: AuthenticatedContext) {
    let employeeIds: string[] | null = null;

    if (!auth.roles.includes('ADMIN')) {
      // Manager scope
      const teams = await db.orm.public.Team.where({
        managerId: auth.employeeId,
        organizationId: auth.organizationId,
      }).all();
      const teamIds = teams.map((t: any) => t.id);
      if (teamIds.length === 0) return [];
      const members = await db.orm.public.Employee
        .where((e: any) => e.teamId.in(teamIds))
        .all();
      employeeIds = members.map((e: any) => e.id);
    }

    const rows = employeeIds
      ? await db.orm.public.WorkingTime
          .where({ organizationId: auth.organizationId })
          .where((w: any) => w.employeeId.in(employeeIds!))
          .all()
      : await db.orm.public.WorkingTime
          .where({ organizationId: auth.organizationId })
          .where((w: any) => w.employeeId.neq(null))
          .all();

    return rows;
  }

  // ---------------------------------------------------------------------------
  // API: Get a specific employee override
  // ---------------------------------------------------------------------------
  async getOverride(targetEmployeeId: string, auth: AuthenticatedContext) {
    await this.assertCanViewEmployee(targetEmployeeId, auth);

    const row = await db.orm.public.WorkingTime
      .where({ organizationId: auth.organizationId, employeeId: targetEmployeeId })
      .first();

    if (!row) {
      // Return org default flagged so the UI knows it's inherited
      const orgDefault = await this.getOrgDefault(auth);
      return { ...orgDefault, employeeId: targetEmployeeId, isOverride: false };
    }

    return { ...this.rowToConfig(row), isActive: row.isActive, id: row.id, employeeId: targetEmployeeId, isOverride: true };
  }

  // ---------------------------------------------------------------------------
  // API: Upsert employee override (ADMIN/MANAGER)
  // ---------------------------------------------------------------------------
  async upsertOverride(targetEmployeeId: string, auth: AuthenticatedContext, body: WorkingTimeConfig) {
    await this.assertCanManageEmployeeOverride(targetEmployeeId, auth);

    const emp = await db.orm.public.Employee
      .where({ id: targetEmployeeId, organizationId: auth.organizationId })
      .first();
    if (!emp) throw new NotFoundException('Employee not found in your organization');

    const existing = await db.orm.public.WorkingTime
      .where({ organizationId: auth.organizationId, employeeId: targetEmployeeId })
      .first();

    if (existing) {
      return db.orm.public.WorkingTime.where({ id: existing.id }).update({
        ...body, isActive: true, updatedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()),
      });
    }

    return db.orm.public.WorkingTime.create({
      organizationId: auth.organizationId,
      employeeId: targetEmployeeId,
      ...body,
      isActive: true,
    });
  }

  // ---------------------------------------------------------------------------
  // API: Delete/deactivate employee override (ADMIN/MANAGER)
  // ---------------------------------------------------------------------------
  async deleteOverride(targetEmployeeId: string, auth: AuthenticatedContext) {
    await this.assertCanManageEmployeeOverride(targetEmployeeId, auth);

    const row = await db.orm.public.WorkingTime
      .where({ organizationId: auth.organizationId, employeeId: targetEmployeeId })
      .first();
    if (!row) throw new NotFoundException('No override found for this employee');

    return db.orm.public.WorkingTime.where({ id: row.id }).update({ isActive: false, updatedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()) });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private rowToConfig(row: any): WorkingTimeConfig {
    return {
      monday: Number(row.monday),
      tuesday: Number(row.tuesday),
      wednesday: Number(row.wednesday),
      thursday: Number(row.thursday),
      friday: Number(row.friday),
      saturday: Number(row.saturday),
      sunday: Number(row.sunday),
    };
  }

  private async assertCanViewEmployee(targetEmployeeId: string, auth: AuthenticatedContext) {
    const emp = await db.orm.public.Employee
      .where({ id: targetEmployeeId, organizationId: auth.organizationId })
      .first();
    if (!emp) throw new NotFoundException('Employee not found in your organization');

    if (auth.roles.includes('ADMIN')) return;
    if (targetEmployeeId === auth.employeeId) return;

    if (auth.roles.includes('MANAGER')) {
      if (!emp.teamId) throw new ForbiddenException('Employee is not assigned to a team');
      const team = await db.orm.public.Team.where({
        id: emp.teamId, organizationId: auth.organizationId, managerId: auth.employeeId,
      }).first();
      if (!team) throw new ForbiddenException('You are not the manager of this employee\'s team');
      return;
    }

    throw new ForbiddenException('Access denied');
  }

  private async assertCanManageEmployeeOverride(targetEmployeeId: string, auth: AuthenticatedContext) {
    const emp = await db.orm.public.Employee
      .where({ id: targetEmployeeId, organizationId: auth.organizationId })
      .first();
    if (!emp) throw new NotFoundException('Employee not found in your organization');

    if (auth.roles.includes('ADMIN')) return;

    if (auth.roles.includes('MANAGER')) {
      if (!emp.teamId) throw new ForbiddenException('Employee is not assigned to a team');
      const team = await db.orm.public.Team.where({
        id: emp.teamId, organizationId: auth.organizationId, managerId: auth.employeeId,
      }).first();
      if (!team) throw new ForbiddenException('You are not the manager of this employee\'s team');
      return;
    }

    throw new ForbiddenException('Only ADMIN or the employee\'s MANAGER can manage working time overrides');
  }
}
