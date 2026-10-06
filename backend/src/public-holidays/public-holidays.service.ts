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

    // Hard delete as requested to prevent unwanted storage
    return db.orm.public.PublicHoliday.where({ id }).delete();
  }

  // ---------------------------------------------------------------------------
  // BULK IMPORT CSV (ADMIN only)
  // ---------------------------------------------------------------------------
  private normalizeDate(raw: string): string | null {
    if (!raw) return null;
    const s = raw.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : s;
    }
    // DD-MM-YYYY
    let m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) {
      const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
      return isNaN(d.getTime()) ? null : `${m[3]}-${m[2]}-${m[1]}`;
    }
    // MM/DD/YYYY
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const mm = m[1].padStart(2, '0');
      const dd = m[2].padStart(2, '0');
      const d = new Date(`${m[3]}-${mm}-${dd}`);
      return isNaN(d.getTime()) ? null : `${m[3]}-${mm}-${dd}`;
    }
    return null;
  }

  async importCsv(auth: AuthenticatedContext, fileBuffer: Buffer) {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only ADMIN can import public holidays');
    }
    const csvContent = fileBuffer.toString('utf-8');
    
    let records: any[];
    try {
      const { parse } = await import('csv-parse/sync');
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch (e: any) {
      throw new BadRequestException(`Failed to parse CSV: ${e.message}`);
    }

    if (records.length === 0) {
      throw new BadRequestException('CSV file is empty');
    }
    
    const firstRow = records[0];
    const keys = Object.keys(firstRow);
    const required = ['date', 'name', 'active'];
    for (const req of required) {
      if (!keys.includes(req)) {
        throw new BadRequestException(`Missing required column: ${req}. Available columns: ${keys.join(', ')}`);
      }
    }
    if (keys.length > 3) {
      throw new BadRequestException(`Extra columns found: ${keys.filter(k => !required.includes(k)).join(', ')}. Only date, name, active are allowed.`);
    }

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: { row: number; reason: string }[] = [];

    const validRecords: { name: string, date: string, isActive: boolean, row: number }[] = [];
    const seenDates = new Set<string>();
    
    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2; // header is 1, array is 0-indexed
      const row = records[i];
      const rawName = row.name?.trim();
      const rawDate = row.date?.trim();
      const rawActive = row.active?.trim().toLowerCase();

      if (!rawName || !rawDate) {
        errors.push({ row: rowNum, reason: 'Missing name or date' });
        failedCount++;
        continue;
      }
      
      const normDate = this.normalizeDate(rawDate);
      if (!normDate) {
        errors.push({ row: rowNum, reason: `Invalid date format: ${rawDate}` });
        failedCount++;
        continue;
      }
      
      let isActive = true;
      if (rawActive === 'false' || rawActive === '0' || rawActive === 'no') {
        isActive = false;
      } else if (rawActive && rawActive !== 'true' && rawActive !== '1' && rawActive !== 'yes') {
        errors.push({ row: rowNum, reason: `Invalid active value: ${rawActive}` });
        failedCount++;
        continue;
      }

      if (seenDates.has(normDate)) {
        errors.push({ row: rowNum, reason: `Duplicate date in CSV: ${normDate}` });
        failedCount++;
        continue;
      }
      seenDates.add(normDate);

      validRecords.push({ name: rawName, date: normDate, isActive, row: rowNum });
    }
    
    if (errors.length > 0) {
       // Fail entire import if any rows are invalid
       return {
         total: records.length,
         success: 0,
         skipped: 0,
         failed: failedCount,
         errors
       };
    }

    await db.transaction(async (tx) => {
      const existing = await tx.orm.public.PublicHoliday.where({ organizationId: auth.organizationId }).all();
      const existingMap = new Map(existing.map(h => [h.date, h]));
      
      for (const rec of validRecords) {
        const existingHoliday = existingMap.get(rec.date);
        if (existingHoliday) {
          if (existingHoliday.name !== rec.name || existingHoliday.isActive !== rec.isActive) {
             await tx.orm.public.PublicHoliday.where({ id: existingHoliday.id }).update({
               name: rec.name,
               isActive: rec.isActive,
               updatedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString())
             });
             successCount++;
          } else {
             skippedCount++;
          }
        } else {
           await tx.orm.public.PublicHoliday.create({
             organizationId: auth.organizationId,
             name: rec.name,
             date: rec.date,
             isActive: rec.isActive
           });
           successCount++;
        }
      }
    });

    return {
      total: records.length,
      success: successCount,
      skipped: skippedCount,
      failed: failedCount,
      errors
    };
  }
}
