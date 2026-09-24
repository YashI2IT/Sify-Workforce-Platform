import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

@Injectable()
export class PublicHolidaysService {
  // ---------------------------------------------------------------------------
  // LIST – all active holidays for the org
  // ---------------------------------------------------------------------------
  async findAll(auth: AuthenticatedContext) {
    return db.orm.public.PublicHoliday
      .where({ organizationId: auth.organizationId })
      .orderBy((h: any) => h.date.asc())
      .all();
  }

  // ---------------------------------------------------------------------------
  // CREATE (ADMIN only)
  // ---------------------------------------------------------------------------
  async create(auth: AuthenticatedContext, body: { name: string; date: string; isActive?: boolean }) {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can create public holidays');
    }

    if (!body.name || !body.date) {
      throw new BadRequestException('name and date are required');
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    return db.orm.public.PublicHoliday.create({
      organizationId: auth.organizationId,
      name: body.name.trim(),
      date: body.date,
      isActive: body.isActive ?? true,
    });
  }

  // ---------------------------------------------------------------------------
  // UPDATE (ADMIN only)
  // ---------------------------------------------------------------------------
  async update(
    id: string,
    auth: AuthenticatedContext,
    body: { name?: string; date?: string; isActive?: boolean },
  ) {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can update public holidays');
    }

    const holiday = await db.orm.public.PublicHoliday.where({ id }).first();
    if (!holiday) throw new NotFoundException('Holiday not found');
    if (holiday.organizationId !== auth.organizationId) {
      throw new ForbiddenException('Holiday does not belong to your organization');
    }

    if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    const patch: Record<string, any> = { updatedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()) };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.date !== undefined) patch.date = body.date;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    return db.orm.public.PublicHoliday.where({ id }).update(patch);
  }

  // ---------------------------------------------------------------------------
  // DELETE / DEACTIVATE (ADMIN only)
  // ---------------------------------------------------------------------------
  async remove(id: string, auth: AuthenticatedContext) {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can delete public holidays');
    }

    const holiday = await db.orm.public.PublicHoliday.where({ id }).first();
    if (!holiday) throw new NotFoundException('Holiday not found');
    if (holiday.organizationId !== auth.organizationId) {
      throw new ForbiddenException('Holiday does not belong to your organization');
    }

    // Soft-deactivate rather than hard-delete (preserves audit integrity)
    return db.orm.public.PublicHoliday.where({ id }).update({ isActive: false, updatedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()) });
  }
}
