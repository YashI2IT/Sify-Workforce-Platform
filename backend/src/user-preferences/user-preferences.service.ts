import { Injectable, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

export interface PreferenceBody {
  timezone?: string;
  language?: string;
  theme?: string;
  defaultView?: string;
  dateFormat?: string;
  emailNotifications?: boolean;
}

const ALLOWED_THEMES = ['light', 'dark', 'system'];
const ALLOWED_VIEWS = ['timesheet', 'calendar', 'dashboard'];
const ALLOWED_LANGUAGES = ['en', 'hi', 'ta', 'te', 'kn', 'ml'];
const ALLOWED_DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

@Injectable()
export class UserPreferencesService {
  // ---------------------------------------------------------------------------
  // GET own preferences (auto-create defaults if missing)
  // ---------------------------------------------------------------------------
  async getMyPreferences(auth: AuthenticatedContext) {
    const existing = await db.orm.public.UserPreference
      .where({ employeeId: auth.employeeId })
      .first();

    if (existing) return existing;

    // Auto-seed defaults on first access
    return db.orm.public.UserPreference.create({
      employeeId: auth.employeeId,
      timezone: 'UTC',
      language: 'en',
      theme: 'system',
      defaultView: 'timesheet',
      dateFormat: 'DD/MM/YYYY',
      emailNotifications: true,
    });
  }

  // ---------------------------------------------------------------------------
  // UPDATE own preferences
  // ---------------------------------------------------------------------------
  async updateMyPreferences(auth: AuthenticatedContext, body: PreferenceBody) {
    // Validate allowed values
    if (body.theme && !ALLOWED_THEMES.includes(body.theme)) {
      throw new ForbiddenException(`theme must be one of: ${ALLOWED_THEMES.join(', ')}`);
    }
    if (body.defaultView && !ALLOWED_VIEWS.includes(body.defaultView)) {
      throw new ForbiddenException(`defaultView must be one of: ${ALLOWED_VIEWS.join(', ')}`);
    }
    if (body.language && !ALLOWED_LANGUAGES.includes(body.language)) {
      throw new ForbiddenException(`language must be one of: ${ALLOWED_LANGUAGES.join(', ')}`);
    }
    if (body.dateFormat && !ALLOWED_DATE_FORMATS.includes(body.dateFormat)) {
      throw new ForbiddenException(`dateFormat must be one of: ${ALLOWED_DATE_FORMATS.join(', ')}`);
    }

    const existing = await db.orm.public.UserPreference
      .where({ employeeId: auth.employeeId })
      .first();

    const patch: Record<string, any> = { updatedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()) };
    if (body.timezone !== undefined) patch.timezone = body.timezone;
    if (body.language !== undefined) patch.language = body.language;
    if (body.theme !== undefined) patch.theme = body.theme;
    if (body.defaultView !== undefined) patch.defaultView = body.defaultView;
    if (body.dateFormat !== undefined) patch.dateFormat = body.dateFormat;
    if (body.emailNotifications !== undefined) patch.emailNotifications = body.emailNotifications;

    if (existing) {
      return db.orm.public.UserPreference.where({ id: existing.id }).update(patch);
    }

    return db.orm.public.UserPreference.create({
      employeeId: auth.employeeId,
      timezone: body.timezone ?? 'UTC',
      language: body.language ?? 'en',
      theme: body.theme ?? 'system',
      defaultView: body.defaultView ?? 'timesheet',
      dateFormat: body.dateFormat ?? 'DD/MM/YYYY',
      emailNotifications: body.emailNotifications ?? true,
    });
  }
}
